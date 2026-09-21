import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { ROW_WINDOW_THRESHOLD, useRowWindow } from '../use-row-window'

describe('SF-42 row window', () => {
  it('SF-42 renders a screen of rows, not every row, before the scroller is measured', () => {
    const count = ROW_WINDOW_THRESHOLD * 20
    const { result } = renderHook(() => {
      const scroller = useRef<HTMLElement | null>(null)
      return useRowWindow(count, scroller)
    })
    expect(result.current.active).toBe(true)
    expect(result.current.start).toBe(0)
    expect(result.current.end).toBeLessThan(100)
    expect(result.current.padBottom).toBeGreaterThan(0)
  })

  it('SF-42 leaves short lists alone', () => {
    const { result } = renderHook(() => useRowWindow(10, useRef<HTMLElement | null>(null)))
    expect(result.current).toMatchObject({ active: false, start: 0, end: 10 })
  })
})
