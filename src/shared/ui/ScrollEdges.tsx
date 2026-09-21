'use client'

import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'

export type ScrollEdgeState = { top: boolean; left: boolean; right: boolean; height: number }

const AT_REST: ScrollEdgeState = { top: false, left: false, right: false, height: 0 }

const same = (a: ScrollEdgeState, b: ScrollEdgeState) =>
  a.top === b.top && a.left === b.left && a.right === b.right && a.height === b.height

// Tracks how far a scrolling area has moved, so sticky heads and columns can shade their own edge.
export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdgeState {
  const [edges, setEdges] = useState<ScrollEdgeState>(AT_REST)

  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    // Same values must keep the same object, or every observer tick would re-render the whole table.
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth
      const next: ScrollEdgeState = {
        top: scroller.scrollTop > 0,
        left: scroller.scrollLeft > 2,
        right: max - scroller.scrollLeft > 2,
        height: scroller.clientHeight,
      }
      setEdges(current => (same(current, next) ? current : next))
    }
    update()
    scroller.addEventListener('scroll', update, { passive: true })
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(scroller)
    // The table often mounts after its loading state, so a later table is picked up too.
    let table: HTMLTableElement | null = null
    const watchTable = () => {
      const next = scroller.querySelector('table')
      if (next === table) return
      if (table) observer?.unobserve(table)
      table = next
      if (table) observer?.observe(table)
      update()
    }
    watchTable()
    const children = typeof MutationObserver === 'undefined' ? null : new MutationObserver(watchTable)
    children?.observe(scroller, { childList: true, subtree: true })
    return () => {
      scroller.removeEventListener('scroll', update)
      observer?.disconnect()
      children?.disconnect()
    }
  }, [ref])

  return edges
}

// Place first inside a scrolling table area: soft side shadows show only where columns are hidden.
export function ScrollEdges() {
  // A callback ref finds the scrolling parent without reading a ref while rendering.
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const attach = useCallback((node: HTMLDivElement | null) => setScroller(node?.parentElement ?? null), [])
  const target = useMemo(() => ({ current: scroller }), [scroller])
  const edges = useScrollEdges(target)

  return (
    <div ref={attach} aria-hidden className="pointer-events-none sticky top-0 left-0 z-[35] h-0 w-full">
      <span
        className="scroll-edge"
        data-side="left"
        data-show={edges.left}
        style={{ height: edges.height }}
      />
      <span
        className="scroll-edge"
        data-side="right"
        data-show={edges.right}
        style={{ height: edges.height }}
      />
    </div>
  )
}
