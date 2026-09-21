// Structural equality for drafts and filters: key order and undefined members do not count as a change,
// so a mapper that builds the draft in a different order than the loaded object never reports
// "unsaved changes" on open (SL-25). Dates compare by time, arrays by position.
export function sameDraft(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a instanceof Date || b instanceof Date)
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => sameDraft(item, b[index]))
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) if (!sameDraft(left[key], right[key])) return false
  return true
}

export const sameFilters = sameDraft
