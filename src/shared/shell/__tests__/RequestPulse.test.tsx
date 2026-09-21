import { act, render, screen } from '@testing-library/react'
import { inflightCount, trackRequest } from '@/shared/api/inflight'
import { RequestPulse } from '../RequestPulse'

describe('RequestPulse', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('U1-3 shows the working edge only for requests that outlast the delay, then holds it briefly', () => {
    const { container } = render(<RequestPulse />)
    const edge = container.firstElementChild as HTMLElement
    expect(edge).toHaveAttribute('data-active', 'false')

    let done = () => {}
    act(() => {
      done = trackRequest()
    })
    act(() => jest.advanceTimersByTime(100))
    expect(edge).toHaveAttribute('data-active', 'false')
    act(() => done())
    act(() => jest.advanceTimersByTime(1000))
    expect(edge).toHaveAttribute('data-active', 'false')

    act(() => {
      done = trackRequest()
    })
    act(() => jest.advanceTimersByTime(200))
    expect(edge).toHaveAttribute('data-active', 'true')
    act(() => done())
    expect(inflightCount()).toBe(0)
    expect(edge).toHaveAttribute('data-active', 'true')
    act(() => jest.advanceTimersByTime(600))
    expect(edge).toHaveAttribute('data-active', 'false')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('U1-3 releasing a request twice never drives the count negative', () => {
    const done = trackRequest()
    done()
    done()
    expect(inflightCount()).toBe(0)
  })
})
