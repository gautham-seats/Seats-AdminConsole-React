import { stepIndex } from '../lookup-keys'

describe('stepIndex', () => {
  it('wraps down from the last item and up from the first', () => {
    expect(stepIndex(0, 1, 3)).toBe(1)
    expect(stepIndex(2, 1, 3)).toBe(0)
    expect(stepIndex(0, -1, 3)).toBe(2)
  })

  it('stays at zero with no items', () => {
    expect(stepIndex(0, 1, 0)).toBe(0)
  })
})
