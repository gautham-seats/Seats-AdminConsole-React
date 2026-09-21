import { render, screen } from '@testing-library/react'
import { NotActiveScreen, NotAuthorisedScreen, UnsupportedBrowserScreen } from '../ErrorPages'

describe('error pages', () => {
  it('shows the legacy not authorised text as the only h1, with no retry', () => {
    render(<NotAuthorisedScreen />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'You do not have permission to view this page within the SEAtS application.',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing was changed. Please try again.')).not.toBeInTheDocument()
  })

  it('shows the inactive account text and phone line', () => {
    render(<NotActiveScreen />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/account is currently inactive/)
    expect(screen.getByText('Please call (01) 513 6772.')).toBeInTheDocument()
  })

  it('names the unsupported browser', () => {
    render(<UnsupportedBrowserScreen />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This browser is not supported.')
  })
})
