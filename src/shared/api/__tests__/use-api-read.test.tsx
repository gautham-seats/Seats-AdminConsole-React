import { act, renderHook, waitFor } from '@testing-library/react'
import { ApiError } from '../errors'
import { useApiRead } from '../use-api-read'

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void }

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useApiRead', () => {
  it('moves from loading to success', async () => {
    const { result } = renderHook(() => useApiRead('users', () => Promise.resolve(['a'])))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toEqual(['a'])
  })

  it('is idle without a key', () => {
    const load = jest.fn()
    const { result } = renderHook(() => useApiRead(null, load))
    expect(result.current.status).toBe('idle')
    expect(load).not.toHaveBeenCalled()
  })

  it('never lets an old response overwrite a newer key', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const signals: AbortSignal[] = []
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) =>
        useApiRead(id, signal => {
          signals.push(signal)
          return id === '1' ? first.promise : second.promise
        }),
      { initialProps: { id: '1' } },
    )

    rerender({ id: '2' })
    expect(signals[0].aborted).toBe(true)

    await act(async () => {
      second.resolve('second')
      await second.promise
    })
    await act(async () => {
      first.resolve('first')
      await first.promise
    })

    expect(result.current.data).toBe('second')
  })

  it('shows errors distinctly and reloads on retry', async () => {
    const load = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockRejectedValueOnce(new ApiError('http', '/x', 500))
      .mockResolvedValueOnce('ok')
    const { result } = renderHook(() => useApiRead('key', load))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatchObject({ kind: 'http', status: 500 })
    expect(result.current.data).toBeUndefined()

    act(() => result.current.reload())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('SL-05 keeps the last good data while a reload is in flight', async () => {
    let release: (value: string) => void = () => undefined
    const load = jest
      .fn<Promise<string>, [AbortSignal]>()
      .mockResolvedValueOnce('first')
      .mockImplementationOnce(() => new Promise<string>(resolve => (release = resolve)))
    const { result } = renderHook(() => useApiRead('key', load))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.reload())
    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('first')
    expect(result.current.refreshing).toBe(true)

    act(() => release('second'))
    await waitFor(() => expect(result.current.data).toBe('second'))
    expect(result.current.refreshing).toBe(false)
  })

  it('SL-05 starts fresh, without stale data, when the key changes', async () => {
    const load = jest.fn<Promise<string>, [AbortSignal]>().mockResolvedValue('value')
    const { result, rerender } = renderHook(({ key }) => useApiRead(key, load), {
      initialProps: { key: 'a' },
    })
    await waitFor(() => expect(result.current.status).toBe('success'))
    rerender({ key: 'b' })
    expect(result.current.status).toBe('loading')
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('SL-04 keeps a mapper throw as the cause of the parse error', async () => {
    const boom = new TypeError('bad map')
    const load = jest.fn<Promise<string>, [AbortSignal]>().mockRejectedValue(boom)
    const { result } = renderHook(() => useApiRead('key', load))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatchObject({ kind: 'parse', path: 'key', cause: boom })
  })

  it('aborts the pending read on unmount', () => {
    let captured: AbortSignal | undefined
    const { unmount } = renderHook(() =>
      useApiRead('key', signal => {
        captured = signal
        return new Promise<string>(() => undefined)
      }),
    )
    unmount()
    expect(captured?.aborted).toBe(true)
  })
})
