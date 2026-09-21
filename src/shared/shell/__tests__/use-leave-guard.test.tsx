import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { LeaveDialog } from '../LeaveDialog'
import { guardedNavigate, hasUnsavedChanges, leaveNavigation, useLeaveGuard } from '../use-leave-guard'

function GuardedOnly() {
  useLeaveGuard(true, 'You have unsaved changes. Leave this page?')
  return null
}

function Guarded({ onLink }: { onLink: () => void }) {
  const [shown, setShown] = useState(true)
  useLeaveGuard(true, 'You have unsaved changes. Leave this page?')
  return (
    <>
      <LeaveDialog />
      {shown ? (
        <a
          href="/admin-next/users"
          onClick={event => {
            event.preventDefault()
            onLink()
          }}
        >
          Users
        </a>
      ) : null}
      <button type="button" onClick={() => setShown(false)}>
        Close menu
      </button>
    </>
  )
}

const ask = async (onLink = jest.fn()) => {
  render(<Guarded onLink={onLink} />)
  await act(async () => {
    fireEvent.click(screen.getByText('Users'))
  })
  expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
  expect(onLink).not.toHaveBeenCalled()
  return onLink
}

describe('leave guard', () => {
  it('Stay on page keeps the user here', async () => {
    const onLink = await ask()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Stay on page' }))
    })
    expect(onLink).not.toHaveBeenCalled()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('Leave page follows the link that was clicked', async () => {
    const onLink = await ask()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Leave page' }))
    })
    expect(onLink).toHaveBeenCalledTimes(1)
  })

  it('Leave page still navigates when the link has gone, as in a closed nav menu', async () => {
    const go = jest.spyOn(leaveNavigation, 'go').mockImplementation(() => undefined)
    await ask()
    fireEvent.click(screen.getByText('Close menu'))
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Leave page' }))
    })
    expect(go).toHaveBeenCalledWith(expect.stringContaining('/admin-next/users'))
    go.mockRestore()
  })
})

describe('SF leave guard', () => {
  it('SF-03 lets same-page anchors such as the skip link through without asking', async () => {
    const onSkip = jest.fn()
    render(
      <>
        <GuardedOnly />
        <LeaveDialog />
        <a
          href="#main"
          onClick={event => {
            event.preventDefault()
            onSkip()
          }}
        >
          Skip to main content
        </a>
      </>,
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Skip to main content'))
    })
    expect(onSkip).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('SF-02 asks before a programmatic navigation and runs it only on Leave', async () => {
    render(
      <>
        <GuardedOnly />
        <LeaveDialog />
      </>,
    )
    const navigate = jest.fn()
    let result: Promise<boolean> | undefined
    await act(async () => {
      result = guardedNavigate(navigate)
    })
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Leave page' }))
    })
    await expect(result).resolves.toBe(true)
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it('SF-02 navigates at once when nothing is dirty', () => {
    const navigate = jest.fn()
    void guardedNavigate(navigate)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(hasUnsavedChanges()).toBe(false)
  })

  it('SF-04 asks once when two forms are dirty at the same time', async () => {
    const onLink = jest.fn()
    render(
      <>
        <GuardedOnly />
        <GuardedOnly />
        <LeaveDialog />
        <a
          href="/admin-next/users"
          onClick={event => {
            event.preventDefault()
            onLink()
          }}
        >
          Users
        </a>
      </>,
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Users'))
    })
    expect(screen.getAllByText('Unsaved changes')).toHaveLength(1)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Leave page' }))
    })
    expect(onLink).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('SL-13 places a sentinel entry while dirty and asks on Back; Stay steps forward, Leave steps back', async () => {
    const back = jest.spyOn(window.history, 'back').mockImplementation(() => undefined)
    const forward = jest.spyOn(window.history, 'forward').mockImplementation(() => undefined)
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    // Earlier tests folded their sentinel with history.back(); jsdom fires no popstate for it, so let the
    // fold window (500 ms) close first.
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600))
    })
    const view = render(<GuardedOnly />)
    expect(window.history.state).toEqual({ leaveGuard: true })

    // Back: the browser is now on the real entry (plain state) and fires popstate.
    window.history.replaceState(null, '', window.location.href)
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    })
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(forward).toHaveBeenCalledTimes(1)
    expect(back).not.toHaveBeenCalled()

    // The forward step lands on the sentinel again and must not ask.
    window.history.replaceState({ leaveGuard: true }, '', window.location.href)
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { leaveGuard: true } }))
    })
    expect(confirm).toHaveBeenCalledTimes(1)

    window.history.replaceState(null, '', window.location.href)
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }))
    })
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(back).toHaveBeenCalledTimes(1)
    view.unmount()
    confirm.mockRestore()
    back.mockRestore()
    forward.mockRestore()
  })
})
