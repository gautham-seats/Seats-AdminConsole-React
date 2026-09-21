import { ApiError } from '../errors'
import { pageEnvelope, pageTotal } from '../page-total'

describe('pageTotal', () => {
  it('returns server total on an empty page', () => {
    expect(pageTotal(42, 2, 10, 0)).toBe(42)
  })

  it('extends total when rows prove more exist', () => {
    expect(pageTotal(5, 0, 10, 10)).toBe(10)
  })
})

describe('pageEnvelope', () => {
  it('accepts zero rows with a server total', () => {
    expect(pageEnvelope({ items: [], totalRowCount: 0 }, '/x')).toEqual({ items: [], totalRowCount: 0 })
  })

  it('accepts one row', () => {
    expect(pageEnvelope({ items: [{ id: 1 }], totalRowCount: 1 }, '/x')).toEqual({
      items: [{ id: 1 }],
      totalRowCount: 1,
    })
  })

  it('accepts total smaller than the page', () => {
    expect(pageEnvelope({ items: [{ id: 1 }, { id: 2 }], totalRowCount: 2 }, '/x')).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      totalRowCount: 2,
    })
  })

  it('rejects null total', () => {
    expect(() => pageEnvelope({ items: [], totalRowCount: null }, '/x')).toThrow(ApiError)
  })

  it('accepts a page past the end with zero rows', () => {
    expect(pageEnvelope({ items: [], totalRowCount: 15 }, '/x')).toEqual({ items: [], totalRowCount: 15 })
  })

  it('clamps negative totals to zero', () => {
    expect(pageEnvelope({ items: [{ id: 1 }], totalRowCount: -3 }, '/x')).toEqual({
      items: [{ id: 1 }],
      totalRowCount: 0,
    })
  })

  it('keeps the server total when it changes between pages', () => {
    expect(pageEnvelope({ items: [{ id: 1 }], totalRowCount: 50 }, '/page-1')).toEqual({
      items: [{ id: 1 }],
      totalRowCount: 50,
    })
    expect(pageEnvelope({ items: [], totalRowCount: 75 }, '/page-2')).toEqual({
      items: [],
      totalRowCount: 75,
    })
  })
})
