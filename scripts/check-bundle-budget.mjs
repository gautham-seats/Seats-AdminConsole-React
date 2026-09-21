// Sums the client JavaScript each route loads, from the build's client-reference manifests, and fails
// when a route exceeds its budget in bundle-budget.json. Usage: node scripts/check-bundle-budget.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const budget = JSON.parse(readFileSync('bundle-budget.json', 'utf8'))
const root = '.next'
const shared = JSON.parse(readFileSync(join(root, 'build-manifest.json'), 'utf8')).rootMainFiles ?? []

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('_client-reference-manifest.js')) out.push(full)
  }
  return out
}

const sizeOf = chunk => {
  const relative = chunk.replace(/^.*\/_next\//, '')
  try {
    return statSync(join(root, relative)).size
  } catch {
    return 0
  }
}
const sharedKb = shared.reduce((sum, chunk) => sum + sizeOf(chunk), 0) / 1024

const rows = []
for (const file of walk(join(root, 'server', 'app'))) {
  const text = readFileSync(file, 'utf8')
  const match = /__RSC_MANIFEST\["([^"]+)"\] = (\{.*\});?\s*$/s.exec(text)
  if (!match) continue
  const route = match[1].replace(/\/page$/, '') || '/'
  const chunks = new Set()
  for (const entry of Object.values(JSON.parse(match[2]).clientModules ?? {}))
    for (const chunk of entry.chunks ?? []) if (chunk.endsWith('.js')) chunks.add(chunk)
  const routeKb = [...chunks].reduce((sum, chunk) => sum + sizeOf(chunk), 0) / 1024
  rows.push({ route, kb: Math.round(sharedKb + routeKb) })
}
if (rows.length === 0) {
  console.error('No client-reference manifests found under .next/server/app')
  process.exit(1)
}

let failed = 0
for (const row of rows.sort((a, b) => a.route.localeCompare(b.route))) {
  const limit = budget.routes[row.route] ?? budget.default
  const over = row.kb > limit
  if (over) failed += 1
  console.log(
    `${over ? 'OVER' : 'ok  '} ${row.route.padEnd(40)} ${String(row.kb).padStart(5)} kB  (budget ${limit} kB)`,
  )
}
if (failed > 0) {
  console.error(`${failed} route(s) exceed the first-load budget in bundle-budget.json`)
  process.exit(1)
}
