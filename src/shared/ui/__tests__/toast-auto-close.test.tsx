import { renderHook } from '@testing-library/react'
import { AUTO_CLOSE_BANNER_COOKIE, STILL_TIMER_MS } from '../accessibility-prefs'
import { useToastAutoClose } from '../Toast'

describe('SF-29 shared toast auto-close', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    document.cookie = `${AUTO_CLOSE_BANNER_COOKIE}=true`
  })
  afterEach(() => jest.useRealTimers())

  it('SF-29 closes after the duration and drives the timer bar with the same value', () => {
    const onDismiss = jest.fn()
    const { result } = renderHook(() => useToastAutoClose(true, 3000, onDismiss))
    expect(result.current).toBe(3000)
    jest.advanceTimersByTime(2999)
    expect(onDismiss).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('SF-29 keeps the message open when Accessibility Settings turn auto-close off', () => {
    document.cookie = `${AUTO_CLOSE_BANNER_COOKIE}=false`
    const onDismiss = jest.fn()
    const { result } = renderHook(() => useToastAutoClose(true, 3000, onDismiss))
    expect(result.current).toBe(STILL_TIMER_MS)
    jest.advanceTimersByTime(10000)
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
