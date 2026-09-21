import { act, renderHook, waitFor } from '@testing-library/react'
import { userStorageKey } from '@/shared/storage'
import { useRememberedFlag } from '../use-remembered-flag'
import { useSessionHeader } from '../use-shell-data'

jest.mock('../use-shell-data', () => ({ useSessionHeader: jest.fn() }))

const session = jest.mocked(useSessionHeader)

beforeEach(() => {
  window.localStorage.clear()
  session.mockReset()
})

describe('useRememberedFlag', () => {
  it('keeps the choice per user and restores it', async () => {
    session.mockReturnValue({ fullName: 'A', email: 'a@example.com', initials: 'A', userId: '7' })
    const first = renderHook(() => useRememberedFlag('workspace-collapsed'))
    expect(first.result.current[0]).toBe(false)
    act(() => first.result.current[1](value => !value))
    expect(first.result.current[0]).toBe(true)
    expect(window.localStorage.getItem(userStorageKey('7', 'workspace-collapsed'))).toBe('true')

    const again = renderHook(() => useRememberedFlag('workspace-collapsed'))
    await waitFor(() => expect(again.result.current[0]).toBe(true))

    session.mockReturnValue({ fullName: 'B', email: 'b@example.com', initials: 'B', userId: '8' })
    const other = renderHook(() => useRememberedFlag('workspace-collapsed'))
    expect(other.result.current[0]).toBe(false)
  })

  it('works without storing anything while the user id is unknown', () => {
    session.mockReturnValue(null)
    const { result } = renderHook(() => useRememberedFlag('workspace-collapsed'))
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    expect(window.localStorage.length).toBe(0)
  })
})

describe('SF-19 preferences before the layout header arrives', () => {
  it('SF-19 writes a choice made before the user id was known once it arrives', () => {
    session.mockReturnValue(null)
    const { result, rerender } = renderHook(() => useRememberedFlag('workspace-collapsed'))
    act(() => result.current[1](true))
    expect(window.localStorage.getItem(userStorageKey('7', 'workspace-collapsed'))).toBeNull()
    session.mockReturnValue({ fullName: 'A', email: 'a@example.com', initials: 'A', userId: '7' })
    rerender()
    expect(result.current[0]).toBe(true)
    expect(window.localStorage.getItem(userStorageKey('7', 'workspace-collapsed'))).toBe('true')
  })

  it('SF-19 restores the last signed-in user’s preference without waiting for the header', () => {
    session.mockReturnValue({ fullName: 'A', email: 'a@example.com', initials: 'A', userId: '7' })
    const first = renderHook(() => useRememberedFlag('workspace-collapsed'))
    act(() => first.result.current[1](true))
    first.unmount()

    session.mockReturnValue(null)
    const { result } = renderHook(() => useRememberedFlag('workspace-collapsed'))
    expect(result.current[0]).toBe(true)
  })
})
