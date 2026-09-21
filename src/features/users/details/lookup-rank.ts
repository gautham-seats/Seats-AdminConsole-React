import type { SimpleListItemDto } from '@/types/users'

// bootstrap3-typeahead.js:113-154 matches and sorts on each result's JSON text, then keeps `items`.
export function rankLookupItems(
  items: readonly SimpleListItemDto[],
  query: string,
  maxResults: number,
  clientFilter = true,
  serverOrder = false,
): SimpleListItemDto[] {
  // seats-autocomplete (Polymer) shows remote results as returned, without the typeahead sorter.
  if (serverOrder) return query === '' ? [...items] : items.slice(0, maxResults)
  const lower = query.toLowerCase()
  const caseSensitive: SimpleListItemDto[] = []
  const caseInsensitive: SimpleListItemDto[] = []
  const beginsWith: SimpleListItemDto[] = []
  for (const item of items) {
    const json = JSON.stringify(item)
    const folded = json.toLowerCase()
    if (clientFilter && !folded.includes(lower)) continue
    if (folded.startsWith(lower)) beginsWith.push(item)
    else if (json.includes(query)) caseSensitive.push(item)
    else caseInsensitive.push(item)
  }
  const ranked = [...beginsWith, ...caseSensitive, ...caseInsensitive]
  // typeahead.js:125 shows every result when minLength is 0 and the box is empty.
  return query === '' ? ranked : ranked.slice(0, maxResults)
}
