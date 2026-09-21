import { fold } from '@/shared/i18n/fold'
import type { MenuLink, TopEntry } from './admin-menu'

export type SearchItem = {
  key: string
  link: MenuLink
  name: string
  area: string | null
  kind: 'page' | 'action' | 'person'
  // Second line for a person (e-mail or user name); pages and actions have none.
  detail?: string | null
}

export type Match = { item: SearchItem; score: number; indices: number[] }

export function buildSearchItems(
  entries: readonly TopEntry[],
  label: (link: MenuLink) => string,
): SearchItem[] {
  return entries.flatMap((entry): SearchItem[] =>
    entry.children.length > 1
      ? entry.children.map(child => ({
          key: `${entry.id}:${child.id}`,
          link: child,
          name: label(child),
          area: label(entry),
          kind: 'page',
        }))
      : [{ key: entry.id, link: entry, name: label(entry), area: null, kind: 'page' }],
  )
}

// Whole-word hits rank first; letters in order still match so small typos find the page.
export function matchName(name: string, rawTerm: string): { score: number; indices: number[] } | null {
  const term = fold(rawTerm)
  if (!term) return { score: 0, indices: [] }
  const lower = fold(name)
  const at = lower.indexOf(term)
  if (at >= 0) return { score: (at === 0 ? 300 : 200) - at, indices: Array.from(term, (_, i) => at + i) }
  const indices: number[] = []
  for (let i = 0; i < lower.length && indices.length < term.length; i++) {
    if (lower[i] === term[indices.length]) indices.push(i)
  }
  if (indices.length < term.length) return null
  return { score: 100 - (indices[indices.length - 1] - indices[0]), indices }
}

export function rankItems(items: readonly SearchItem[], rawTerm: string, scope: string | null): Match[] {
  const term = fold(rawTerm)
  const matches = items
    .filter(item => !scope || item.area === scope)
    .map((item): Match | null => {
      const hit = matchName(item.name, term)
      if (hit) return { item, ...hit }
      return item.area && fold(item.area).includes(term) ? { item, score: 50, indices: [] } : null
    })
    .filter((match): match is Match => match !== null)
    .sort((a, b) => b.score - a.score)
  const order = [...new Set(matches.map(match => match.item.area ?? ''))]
  return order.flatMap(area => matches.filter(match => (match.item.area ?? '') === area))
}

// "@stu " turns into the Students scope chip; the rest stays in the box.
export function parseScope(value: string, areas: readonly string[]): { scope: string; rest: string } | null {
  const found = /^@(\S+)\s/.exec(value)
  if (!found) return null
  const wanted = fold(found[1])
  const scope = areas.find(area => fold(area).startsWith(wanted))
  return scope ? { scope, rest: value.slice(found[0].length) } : null
}

export function completion(value: string, item: SearchItem | undefined): string {
  if (!value || !item || item.kind !== 'page') return ''
  return fold(item.name).startsWith(fold(value)) ? item.name.slice(value.length) : ''
}

export const pushRecent = (keys: readonly string[], key: string, max = 5) =>
  [key, ...keys.filter(existing => existing !== key)].slice(0, max)
