// Reviews a pull request with two independent model lanes and posts one advisory review with inline comments.
// Lane "defects" reads the diff; lane "tests" also reads every test file the diff touches. A finding both
// lanes make is marked "agreed". The job fails only when no model in a lane answers, or GitHub refuses the post.
const { GITHUB_TOKEN, OPENROUTER_API_KEY, GITHUB_REPOSITORY, PR_NUMBER } = process.env
if (!GITHUB_TOKEN || !OPENROUTER_API_KEY || !GITHUB_REPOSITORY || !PR_NUMBER) {
  console.error('Missing GITHUB_TOKEN, OPENROUTER_API_KEY, GITHUB_REPOSITORY or PR_NUMBER')
  process.exit(1)
}
const list = name =>
  (process.env[name] ?? '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean)
const LANES = [
  {
    name: 'defects',
    models: list('DEFECT_MODELS'),
    withTests: false,
    focus:
      'Report only defects a user or an attacker could hit: wrong logic; wrong null, empty or undefined handling; a missing loading, empty, error or not-authorised state; a dead end (a state with no way back); a stale response applied after navigation; a duplicate submit; a request that bypasses the shared API client in src/shared/api; hard-coded user-visible text where a resource key exists; and accessibility regressions (missing accessible name, keyboard trap, colour-only state).',
  },
  {
    name: 'tests',
    models: list('TEST_MODELS'),
    withTests: true,
    focus:
      'Judge the tests and the security of the change. For every behaviour the diff changes, say whether a test in the touched test files would fail without the change; name tests that assert nothing meaningful. Report XSS or unsafe HTML, open redirects, secrets, unsafe regular expressions, trust of server-provided URLs, and permission checks that can be skipped.',
  },
]

const gh = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      ...(init.headers ?? {}),
    },
  })

const EXCLUDE = /\.(md|lock|css|png|svg|ico)$|package-lock\.json$/
const TEST_FILE = /__tests__\/.*\.test\.tsx?$/
// About 60k characters is roughly 15k tokens: a whole reviewable pull request for a cent or less per lane.
const MAX_CHARS = 60_000
const MAX_COMMENTS = 12

const pr = await (await gh(`/pulls/${PR_NUMBER}`)).json()
const files = await (await gh(`/pulls/${PR_NUMBER}/files?per_page=100`)).json()
const reviewable = files.filter(f => f.patch && !EXCLUDE.test(f.filename))
if (reviewable.length === 0) {
  console.log('Nothing reviewable in this pull request.')
  process.exit(0)
}

let budget = MAX_CHARS
const chunks = []
for (const f of reviewable) {
  const text = `### ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``
  if (text.length > budget) break
  budget -= text.length
  chunks.push(text)
}
const diffText = chunks.join('\n\n')

async function testFiles() {
  const out = []
  let remaining = MAX_CHARS / 2
  for (const f of reviewable.filter(f => TEST_FILE.test(f.filename) && f.status !== 'removed')) {
    const raw = await fetch(f.raw_url, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } })
    if (!raw.ok) continue
    const text = `### ${f.filename} (full file)\n\`\`\`ts\n${await raw.text()}\n\`\`\``
    if (text.length > remaining) break
    remaining -= text.length
    out.push(text)
  }
  return out.join('\n\n')
}

const intro = `You review TypeScript/React (Next.js) pull requests for an administration console that must behave like the legacy ASP.NET MVC application it replaces.
Do not comment on style, formatting, naming or comments. Do not praise. If nothing is wrong, return an empty comments array and say so in one sentence.
Answer with JSON only: {"summary": "<one to three sentences>", "comments": [{"path": "<file>", "line": <new-file line number from the diff>, "body": "<the problem, why it matters, and the fix, max three sentences>"}]}. Max ${MAX_COMMENTS} comments.`

async function ask(model, system, user) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': `https://github.com/${GITHUB_REPOSITORY}`,
      'X-Title': 'SEAtS Admin Console review',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const raw = (await response.json()).choices?.[0]?.message?.content ?? '{}'
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`no JSON: ${raw.slice(0, 200)}`)
  }
}

async function runLane(lane) {
  const system = `${intro}\n\n${lane.focus}`
  const tests = lane.withTests ? await testFiles() : ''
  const user = `Pull request: ${pr.title}\n\n${pr.body ?? ''}\n\n## Diff (${chunks.length} of ${reviewable.length} files)\n\n${diffText}${
    tests ? `\n\n## Touched test files\n\n${tests}` : ''
  }`
  const errors = []
  for (const model of lane.models) {
    try {
      return { ...(await ask(model, system, user)), model }
    } catch (error) {
      errors.push(`${model}: ${error.message}`)
    }
  }
  throw new Error(`lane ${lane.name} got no answer:\n${errors.join('\n')}`)
}

const results = await Promise.allSettled(LANES.map(runLane))
const answered = results.filter(r => r.status === 'fulfilled').map(r => r.value)
for (const r of results) if (r.status === 'rejected') console.error(r.reason?.message ?? r.reason)
if (answered.length === 0) process.exit(1)

// Only lines on the new side of the diff can carry an inline comment.
const validLines = new Map()
for (const f of reviewable) {
  const lines = new Set()
  let current = 0
  for (const line of f.patch.split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line)
    if (hunk) current = Number(hunk[1]) - 1
    else if (!line.startsWith('-')) {
      current += 1
      if (line.startsWith('+')) lines.add(current)
    }
  }
  validLines.set(f.filename, lines)
}

const byKey = new Map()
answered.forEach((result, index) => {
  for (const c of result.comments ?? []) {
    if (!validLines.get(c.path)?.has(Number(c.line))) continue
    const key = `${c.path}:${c.line}`
    const entry = byKey.get(key) ?? { path: c.path, line: Number(c.line), bodies: [], lanes: new Set() }
    entry.bodies.push(c.body)
    entry.lanes.add(LANES[index].name)
    byKey.set(key, entry)
  }
})
const comments = [...byKey.values()]
  .sort((a, b) => b.lanes.size - a.lanes.size)
  .slice(0, MAX_COMMENTS)
  .map(entry => ({
    path: entry.path,
    line: entry.line,
    side: 'RIGHT',
    body: `${entry.lanes.size > 1 ? '**agreed** — ' : ''}${entry.bodies[0]}`,
  }))

const coverage =
  chunks.length < reviewable.length
    ? `\n\n_Only the first ${chunks.length} of ${reviewable.length} files fitted the review budget._`
    : ''
const summaries = answered.map(r => `**${r.model}**: ${r.summary ?? 'No summary.'}`).join('\n\n')
const body = `**Advisory review** — two model lanes; CI and a human decide.\n\n${summaries}${coverage}`
const posted = await gh(`/pulls/${PR_NUMBER}/reviews`, {
  method: 'POST',
  body: JSON.stringify({ event: 'COMMENT', body, comments }),
})
if (!posted.ok) {
  console.error(`GitHub ${posted.status}: ${(await posted.text()).slice(0, 300)}`)
  process.exit(1)
}
console.log(
  `Posted ${comments.length} comment(s) from ${answered.length} lane(s) on ${reviewable.length} file(s).`,
)
