import { act, renderHook } from '@testing-library/react'
import { refreshNotificationCount, useNotificationCount } from '../use-shell-data'

jest.mock('../profile', () => ({ useProfile: () => ({ can: () => true }) }))

const read = jest.fn()
const keys: string[] = []
jest.mock('@/shared/api', () => ({
  api: { get: jest.fn() },
  useApiRead: (_key: string | null, load: (signal: AbortSignal) => Promise<unknown>) => {
    if (!_key) return { data: undefined }
    keys.push(_key)
    return read(load)
  },
}))

jest.mock('@/shared/api/session-header', () => ({ loadSessionHeader: jest.fn() }))
jest.mock('@/shared/api/signalr-hub', () => ({ connectHub: jest.fn(() => ({ stop: jest.fn() })) }))

describe('useNotificationCount', () => {
  beforeEach(() => {
    read.mockReset()
  })

  it('returns null when the count request did not succeed with a number', () => {
    read.mockReturnValue({ data: undefined })
    const { result } = renderHook(() => useNotificationCount(true))
    expect(result.current).toBeNull()
  })

  it('returns the count when the request succeeds', () => {
    read.mockReturnValue({ data: 4 })
    const { result } = renderHook(() => useNotificationCount(true))
    expect(result.current).toBe(4)
  })

  it('SF-26 reloads under the same key on a push, so the last count stays on screen meanwhile', () => {
    const reload = jest.fn()
    read.mockReturnValue({ data: 4, reload })
    const { result } = renderHook(() => useNotificationCount(true))
    expect(result.current).toBe(4)
    expect(reload).not.toHaveBeenCalled()
    act(() => refreshNotificationCount())
    expect(reload).toHaveBeenCalledTimes(1)
    expect(
      keys.filter(key => key.includes('notification')).every(key => key === 'shell-notification-count'),
    ).toBe(true)
  })
})
