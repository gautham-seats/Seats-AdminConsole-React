'use client'

import { useEffect, useState, type RefObject } from 'react'
import { ROW_WINDOW_THRESHOLD } from '@/shared/ui/use-row-window'

const BUFFER = 10

export type FixedWindow = {
  active: boolean
  start: number
  end: number
  padTop: number
  padBottom: number
  onScroll: () => void
}

type Metrics = { scrollTop: number; viewport: number }

const measure = (node: HTMLElement): Metrics => ({ scrollTop: node.scrollTop, viewport: node.clientHeight })
const same = (current: Metrics, node: HTMLElement) =>
  current.scrollTop === node.scrollTop && current.viewport === node.clientHeight

// Windows a non-table list whose rows all share one fixed pixel height (shared useRowWindow reads table rows).
export function useFixedWindow(
  count: number,
  rowHeight: number,
  scroller: RefObject<HTMLElement | null>,
): FixedWindow {
  const active = count > ROW_WINDOW_THRESHOLD
  const [metrics, setMetrics] = useState<Metrics>({ scrollTop: 0, viewport: 0 })

  const sync = () => {
    const node = scroller.current
    if (!node) return
    setMetrics(current => (same(current, node) ? current : measure(node)))
  }

  useEffect(() => {
    const node = scroller.current
    if (!active || !node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() =>
      setMetrics(current => (same(current, node) ? current : measure(node))),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [active, count, scroller])

  if (!active || metrics.viewport === 0)
    return { active: false, start: 0, end: count, padTop: 0, padBottom: 0, onScroll: sync }

  const start = Math.max(0, Math.min(count - 1, Math.floor(metrics.scrollTop / rowHeight) - BUFFER))
  const end = Math.min(count, start + Math.ceil(metrics.viewport / rowHeight) + BUFFER * 2)
  return {
    active: true,
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, count - end) * rowHeight,
    onScroll: sync,
  }
}
