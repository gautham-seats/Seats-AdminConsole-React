'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

// Rows above this count are windowed: only the visible slice plus a buffer stays in the DOM.
export const ROW_WINDOW_THRESHOLD = 100
const BUFFER = 12
const FALLBACK_ROW_HEIGHT = 44
// Before the first measurement a long list renders a screen's worth of rows, never all of them.
const FALLBACK_VIEWPORT = 900

type Metrics = { scrollTop: number; viewport: number; rowHeight: number }

const START: Metrics = { scrollTop: 0, viewport: 0, rowHeight: FALLBACK_ROW_HEIGHT }

// The average height of the rows on screen: wrapped cells (narrow widths, 200% zoom, text spacing) make
// rows taller than the first one measured, and a stale height strands the last rows below the spacer.
const read = (node: HTMLElement, settled: number | null): Metrics => {
  const rows = node.querySelectorAll<HTMLElement>('tbody tr:not([data-row-spacer])')
  let total = 0
  let counted = 0
  rows.forEach(row => {
    if (row.offsetHeight > 0) {
      total += row.offsetHeight
      counted += 1
    }
  })
  const measured = counted > 0 ? total / counted : null
  return {
    scrollTop: node.scrollTop,
    viewport: node.clientHeight,
    rowHeight: measured ?? settled ?? FALLBACK_ROW_HEIGHT,
  }
}

const same = (a: Metrics, b: Metrics) =>
  a.scrollTop === b.scrollTop && a.viewport === b.viewport && a.rowHeight === b.rowHeight

export type RowWindow = {
  active: boolean
  start: number
  end: number
  padTop: number
  padBottom: number
  onScroll: () => void
}

// Windowed rows for a scrolling table; the caller renders a spacer row above and below the slice.
export function useRowWindow(count: number, scroller: RefObject<HTMLElement | null>): RowWindow {
  const active = count > ROW_WINDOW_THRESHOLD
  const [metrics, setMetrics] = useState<Metrics>(START)
  const settled = useRef<number | null>(null)

  const take = (node: HTMLElement) => {
    const next = read(node, settled.current)
    if (!settled.current && next.rowHeight > 0) settled.current = next.rowHeight
    return next
  }

  const sync = () => {
    const node = scroller.current
    if (!node) return
    const next = take(node)
    setMetrics(current => (same(current, next) ? current : next))
  }

  useEffect(() => {
    const node = scroller.current
    if (!active || !node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const next = take(node)
      setMetrics(current => (same(current, next) ? current : next))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [active, count, scroller])

  if (!active) return { active: false, start: 0, end: count, padTop: 0, padBottom: 0, onScroll: sync }

  const { scrollTop, rowHeight } = metrics
  const viewport = metrics.viewport || FALLBACK_VIEWPORT
  const start = Math.max(0, Math.min(count - 1, Math.floor(scrollTop / rowHeight) - BUFFER))
  const end = Math.min(count, start + Math.ceil(viewport / rowHeight) + BUFFER * 2)
  return {
    active: true,
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, count - end) * rowHeight,
    onScroll: sync,
  }
}
