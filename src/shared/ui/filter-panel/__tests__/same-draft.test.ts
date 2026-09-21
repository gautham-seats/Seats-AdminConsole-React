import { sameDraft, sameFilters } from '../use-filter-draft'

describe('sameDraft (SL-25)', () => {
  it('ignores key order and undefined members', () => {
    expect(sameDraft({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true)
    expect(sameDraft({ a: 1, b: undefined }, { a: 1 })).toBe(true)
  })

  it('sees a real change at any depth', () => {
    expect(sameDraft({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toBe(false)
    expect(sameDraft({ a: null }, { a: '' })).toBe(false)
    expect(sameDraft([1, 2], [1, 2, 3])).toBe(false)
  })

  it('compares dates by time and keeps sameFilters as an alias', () => {
    expect(sameDraft({ d: new Date(2026, 8, 21) }, { d: new Date(2026, 8, 21) })).toBe(true)
    expect(sameFilters({ start: '1' }, { start: '2' })).toBe(false)
  })
})
