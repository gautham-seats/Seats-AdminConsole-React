import { act, renderHook } from '@testing-library/react'
import { useTypewriter } from '../use-typewriter'

describe('SF-43 typewriter', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => {
    jest.useRealTimers()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })

  it('SF-43 stops typing while the tab is hidden and carries on when it shows again', () => {
    const { result } = renderHook(() => useTypewriter(['Users'], false))
    act(() => jest.advanceTimersByTime(115 * 2))
    const typed = result.current.length
    expect(typed).toBeGreaterThan(0)
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => jest.advanceTimersByTime(5000))
    expect(result.current.length).toBe(typed)
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => jest.advanceTimersByTime(115 * 2))
    expect(result.current.length).toBeGreaterThan(typed)
  })
})
