import { act, render, screen } from '@testing-library/react'
import { StatusNotice } from '../StatusNotice'

const notice = { id: 1, tone: 'error' as const, message: 'Failed', duration: 1000 }

function setCookie(value: string) {
  document.cookie = `_accset_acb=${value}; path=/`
}

beforeEach(() => jest.useFakeTimers())

afterEach(() => {
  document.cookie = '_accset_acb=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  jest.useRealTimers()
})

describe('StatusNotice', () => {
  it('auto-closes after the duration when the cookie is missing', () => {
    const onDismiss = jest.fn()
    render(<StatusNotice notice={notice} onDismiss={onDismiss} dismissLabel="Clear" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Failed')
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('stays open when the accessibility auto close banner cookie is false', () => {
    setCookie('false')
    const onDismiss = jest.fn()
    render(<StatusNotice notice={notice} onDismiss={onDismiss} dismissLabel="Clear" />)
    act(() => {
      jest.advanceTimersByTime(60000)
    })
    expect(onDismiss).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Failed')
  })
})
