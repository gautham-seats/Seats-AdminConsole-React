import { act, render } from '@testing-library/react'
import { useRef } from 'react'
import { useScrollEdges } from '../ScrollEdges'

function Probe({ table, onEdges }: { table: boolean; onEdges: (right: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(ref)
  onEdges(edges.right)
  return <div ref={ref}>{table ? <table /> : null}</div>
}

describe('SF-28 scroll edges', () => {
  it('SF-28 measures again when the table mounts after the loading state', async () => {
    const onEdges = jest.fn()
    const { container, rerender } = render(<Probe table={false} onEdges={onEdges} />)
    const scroller = container.firstElementChild as HTMLDivElement
    Object.defineProperty(scroller, 'clientWidth', { value: 100, configurable: true })
    Object.defineProperty(scroller, 'scrollWidth', { value: 100, configurable: true })
    expect(onEdges).toHaveBeenLastCalledWith(false)
    // The table is wider than the box, so a right-hand edge appears without any scroll or resize event.
    Object.defineProperty(scroller, 'scrollWidth', { value: 400, configurable: true })
    rerender(<Probe table onEdges={onEdges} />)
    await act(async () => {})
    expect(onEdges).toHaveBeenLastCalledWith(true)
  })
})
