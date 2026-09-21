// Reviews a pull request diff with an OpenAI-compatible model and posts one advisory review with inline comments.
// It never approves or requests changes. The job fails only when the key, the model or GitHub answer with an error.
const { GITHUB_TOKEN, OPENROUTER_API_KEY, GITHUB_REPOSITORY, PR_NUMBER } = process.env
const MODELS = (process.env.MODELS ?? 'deepseek/deepseek-chat-v3-0324').split(',').map(m => m.trim())
if (!GITHUB_TOKEN || !OPENROUTER_API_KEY || !GITHUB_REPOSITORY || !PR_NUMBER) {
  console.error('Missing GITHUB_TOKEN, OPENROUTER_API_KEY, GITHUB_REPOSITORY or PR_NUMBER')
  process.exit(1)
}

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
// About 60k characters is roughly 15k tokens: enough for a whole reviewable pull request at a cent or less.
const MAX_CHARS = 60_000
const MAX_COMMENTS = 12

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

const system = `You review TypeScript/React (Next.js) pull requests for an administration console that must behave like the legacy ASP.NET MVC application it replaces.
Report only defects a user or an attacker could hit: wrong logic, wrong null or empty handling, a missing loading, empty, error or not-authorised state, a request that bypasses the shared API client in src/shared/api, duplicate submits, stale responses after navigation, XSS or unsafe HTML, open redirects, secrets, and accessibility regressions (missing names, keyboard traps, colour-only state).
Do not comment on style, formatting, naming, comments or tests that merely could be added. Do not praise. If nothing is wrong, return an empty comments array and say so in one sentence.
Answer with JSON only: {"summary": "<one to three sentences>", "comments": [{"path": "<file>", "line": <new-file line number from the diff>, "body": "<the defect, why it matters, and the fix, max three sentences>"}]}. Max ${MAX_COMMENTS} comments.`

const user = `Review this diff (${chunks.length} of ${reviewable.length} files shown):\n\n${chunks.join('\n\n')}`

async function ask(model) {
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
  if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${(await response.text()).slice(0, 300)}`)
  const raw = (await response.json()).choices?.[0]?.message?.content ?? '{}'
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`Model did not return JSON: ${raw.slice(0, 300)}`)
  }
}

let result = null
let used = null
const failures = []
for (const model of MODELS) {
  try {
    result = await ask(model)
    used = model
    break
  } catch (error) {
    failures.push(`${model}: ${error.message}`)
  }
}
if (!result) {
  console.error(failures.join('\n'))
  process.exit(1)
}

// Only lines that exist on the new side of the diff can carry an inline comment.
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
const comments = (result.comments ?? [])
  .filter(c => validLines.get(c.path)?.has(Number(c.line)))
  .slice(0, MAX_COMMENTS)
  .map(c => ({ path: c.path, line: Number(c.line), side: 'RIGHT', body: c.body }))

const coverage =
  chunks.length < reviewable.length
    ? `\n\n_Only the first ${chunks.length} of ${reviewable.length} files fitted the review budget._`
    : ''
const body = `**Advisory review** (${used}) — CI and a human decide.\n\n${result.summary ?? 'No summary.'}${coverage}`
const posted = await gh(`/pulls/${PR_NUMBER}/reviews`, {
  method: 'POST',
  body: JSON.stringify({ event: 'COMMENT', body, comments }),
})
if (!posted.ok) {
  console.error(`GitHub ${posted.status}: ${(await posted.text()).slice(0, 300)}`)
  process.exit(1)
}
console.log(
  `Posted review with ${comments.length} inline comment(s) on ${reviewable.length} file(s) using ${used}.`,
)
