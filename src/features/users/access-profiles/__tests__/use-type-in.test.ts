import { act, renderHook } from '@testing-library/react'
import { CHANGE_PULSE_MS, TYPE_STEP_MS, useJustChanged, useTypeIn } from '../use-type-in'

const motion = (reduce: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: reduce, media: query }),
  })

// One act per step: each letter schedules the next only after React has rendered the last.
const tick = (steps: number) => {
  for (let i = 0; i < steps; i++) act(() => jest.advanceTimersByTime(TYPE_STEP_MS))
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('useTypeIn', () => {
  it('types the phrase in one letter at a time, then reports done', () => {
    motion(false)
    const { result } = renderHook(() => useTypeIn('add'))
    expect(result.current).toEqual({ text: '', done: false })

    tick(1)
    expect(result.current.text).toBe('a')

    tick(2)
    expect(result.current).toEqual({ text: 'add', done: true })
  })

  it('starts again from nothing when the phrase changes', () => {
    motion(false)
    const { result, rerender } = renderHook(({ text }) => useTypeIn(text), { initialProps: { text: 'add' } })
    tick(3)
    expect(result.current.text).toBe('add')

    rerender({ text: 'export' })

    expect(result.current).toEqual({ text: '', done: false })
  })

  it('shows the whole phrase at once for reduced motion', () => {
    motion(true)
    const { result } = renderHook(() => useTypeIn('add'))
    expect(result.current).toEqual({ text: 'add', done: true })
  })
})

describe('useJustChanged', () => {
  it('stays quiet on first render, lights up after a change, then settles', () => {
    const { result, rerender } = renderHook(({ key }) => useJustChanged(key), { initialProps: { key: 'a' } })
    expect(result.current.active).toBe(false)

    rerender({ key: 'b' })
    expect(result.current.active).toBe(true)

    act(() => jest.advanceTimersByTime(CHANGE_PULSE_MS))
    expect(result.current.active).toBe(false)
  })
})
