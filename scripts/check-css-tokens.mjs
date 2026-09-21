// Lists design tokens declared in src/shared/ui/tokens.css that nothing references, so dead tokens do not
// accumulate. A token counts as used when its name (or the Tailwind utility it generates, such as
// bg-brand for --color-brand) appears anywhere under src outside tokens.css itself.
// Usage: node scripts/check-css-tokens.mjs [--strict]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const TOKENS_FILE = join('src', 'shared', 'ui', 'tokens.css')
const strict = process.argv.includes('--strict')

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(tsx?|css|mjs)$/.test(entry) && !full.endsWith(TOKENS_FILE)) out.push(full)
  }
  return out
}

const tokens = [...readFileSync(TOKENS_FILE, 'utf8').matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)].map(m => m[1])
const unique = [...new Set(tokens)]
const corpus = walk('src')
  .map(file => readFileSync(file, 'utf8'))
  .join('\n')

// --color-brand-avatar → "brand-avatar" (utility suffix); --radius-card → "radius-card" and "card".
function needles(token) {
  const bare = token.slice(2)
  const parts = bare.split('-')
  const suffix = parts.slice(1).join('-')
  return [token, `var(${token})`, bare, suffix].filter(Boolean)
}

const unused = unique.filter(token => !needles(token).some(needle => corpus.includes(needle)))
for (const token of unused) console.log(`unused ${token}`)
console.log(`${unique.length} tokens, ${unused.length} unreferenced`)
if (strict && unused.length > 0) process.exit(1)
