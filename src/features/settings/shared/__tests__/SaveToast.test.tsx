import { act, render, screen } from '@testing-library/react'
import { SaveToast } from '../SaveToast'

const clear = () => {
  document.cookie = '_accset_acb=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

describe('SaveToast follows the auto-close preference', () => {
  beforeEach(clear)
  afterEach(() => {
    clear()
    jest.useRealTimers()
  })

  it('keeps a shared save message open when auto close is off', () => {
    jest.useFakeTimers()
    document.cookie = '_accset_acb=false; path=/'
    const onDismiss = jest.fn()
    render(
      <SaveToast
        notice={{ id: 1, tone: 'success', message: 'Saved' }}
        onDismiss={onDismiss}
        dismissLabel="Dismiss"
      />,
    )
    act(() => jest.advanceTimersByTime(10_000))
    expect(onDismiss).not.toHaveBeenCalled()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('still closes it by itself by default', () => {
    jest.useFakeTimers()
    const onDismiss = jest.fn()
    render(
      <SaveToast
        notice={{ id: 1, tone: 'success', message: 'Saved' }}
        onDismiss={onDismiss}
        dismissLabel="Dismiss"
      />,
    )
    act(() => jest.advanceTimersByTime(3000))
    expect(onDismiss).toHaveBeenCalled()
  })
})
