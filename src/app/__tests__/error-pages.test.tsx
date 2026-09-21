import { fireEvent, render, screen } from '@testing-library/react'
import RouteError from '../error'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}))

describe('SF-46 route error boundary', () => {
  it('SF-46 wires Try again to the reset Next passes, and shows the digest only', () => {
    const reset = jest.fn()
    const error = Object.assign(new Error('stack secret'), { digest: 'abc123' })
    render(<RouteError error={error} reset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/abc123/)).toBeInTheDocument()
    expect(screen.queryByText(/stack secret/)).not.toBeInTheDocument()
  })
})
