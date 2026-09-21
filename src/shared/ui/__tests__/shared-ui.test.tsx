import { ApiError } from '@/shared/api'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { ConfirmDialog } from '../ConfirmDialog'
import { DelayedLoading } from '../DelayedLoading'
import { ErrorState } from '../ErrorState'

describe('DelayedLoading', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('appears only after 400 ms', () => {
    render(<DelayedLoading active label="Loading" />)
    act(() => jest.advanceTimersByTime(399))
    expect(screen.queryByRole('status')).toBeNull()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('never appears for a fast response and always clears', () => {
    const { rerender } = render(<DelayedLoading active label="Loading" />)
    act(() => jest.advanceTimersByTime(200))
    rerender(<DelayedLoading active={false} label="Loading" />)
    act(() => jest.advanceTimersByTime(1000))
    expect(screen.queryByRole('status')).toBeNull()

    rerender(<DelayedLoading active label="Loading" />)
    act(() => jest.advanceTimersByTime(400))
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(<DelayedLoading active={false} label="Loading" />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})

describe('ErrorState', () => {
  it('announces the error and retries', () => {
    const onRetry = jest.fn()
    render(<ErrorState message="There was an error" retryLabel="Refresh" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('There was an error')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('renders a page heading when requested', () => {
    render(<ErrorState variant="page" headingLevel={1} message="Unable to load" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Unable to load' })).toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  const props = {
    open: true,
    title: 'Delete',
    message: 'Are you sure you want to delete selected items?',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
  }

  it('confirms and cancels', () => {
    const onConfirm = jest.fn()
    const onOpenChange = jest.fn()
    render(<ConfirmDialog {...props} onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Delete')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('blocks both actions while pending but keeps them focusable (SL-38)', () => {
    const onOpenChange = jest.fn()
    const onConfirm = jest.fn()
    render(<ConfirmDialog {...props} pending onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    const confirm = screen.getByRole('button', { name: 'Delete' })
    expect(confirm).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('aria-disabled', 'true')
    confirm.focus()
    expect(confirm).toHaveFocus()
    fireEvent.click(confirm)
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('returns focus to the trigger after Escape', async () => {
    function Host() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Remove
          </button>
          <ConfirmDialog {...props} open={open} onOpenChange={setOpen} onConfirm={() => setOpen(false)} />
        </>
      )
    }
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'Remove' })
    act(() => {
      trigger.focus()
      fireEvent.click(trigger)
    })
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe('ErrorState failure kinds', () => {
  const show = (error: ApiError | null) =>
    render(<ErrorState message="There was an error" retryLabel="Refresh" onRetry={jest.fn()} error={error} />)

  it.each([
    [new ApiError('network', '/x'), 'Connection lost', 'Check your connection, then try again.'],
    [new ApiError('http', '/x', 500), 'Server error', 'The server could not complete the request.'],
    [new ApiError('http', '/x', 404), 'Not found', 'The requested information could not be found.'],
    [new ApiError('blocked', '/x'), 'Request blocked', 'This action is not allowed here.'],
  ])('names the failure', (error, label, line) => {
    show(error)
    expect(screen.getByRole('alert')).toHaveTextContent(label)
    expect(screen.getByRole('alert')).toHaveTextContent(line)
  })

  it('keeps the general message for anything else', () => {
    show(new ApiError('parse', '/x', 200))
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load')
    expect(screen.getByRole('alert')).toHaveTextContent('There was an error')
  })
})
