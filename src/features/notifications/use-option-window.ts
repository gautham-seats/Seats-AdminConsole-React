'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'
import { ROW_WINDOW_THRESHOLD } from '@/shared/ui/use-row-window'

const BUFFER = 12
const FALLBACK_HEIGHT = 80

export type OptionWindow = {
  active: boolean
  start: number
  end: number
  padTop: number
  padBottom: number
  onScroll: () => void
}

type Metrics = { scrollTop: number; viewport: number; height: number }

const same = (a: Metrics, b: Metrics) =>
  a.scrollTop === b.scrollTop && a.viewport === b.viewport && a.height === b.height

// The first measured option height is kept so later rows cannot move the spacers.
function measure(node: HTMLElement, settled: RefObject<number | null>): Metrics {
  if (!settled.current) {
    const option = node.querySelector<HTMLElement>('[role="option"]')
    if (option && option.offsetHeight > 0) settled.current = option.offsetHeight
  }
  return {
    scrollTop: node.scrollTop,
    viewport: node.clientHeight,
    height: settled.current ?? FALLBACK_HEIGHT,
  }
}

// The shared row window measures table rows; this listbox measures its first option the same way.
export function useOptionWindow(count: number, scroller: RefObject<HTMLElement | null>): OptionWindow {
  const active = count > ROW_WINDOW_THRESHOLD
  const [metrics, setMetrics] = useState<Metrics>({ scrollTop: 0, viewport: 0, height: FALLBACK_HEIGHT })
  const settled = useRef<number | null>(null)

  const sync = () => {
    const node = scroller.current
    if (!node) return
    const next = measure(node, settled)
    setMetrics(current => (same(current, next) ? current : next))
  }

  useEffect(() => {
    const node = scroller.current
    if (!active || !node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const next = measure(node, settled)
      setMetrics(current => (same(current, next) ? current : next))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [active, count, scroller])

  if (!active || metrics.viewport === 0)
    return { active: false, start: 0, end: count, padTop: 0, padBottom: 0, onScroll: sync }

  const { scrollTop, viewport, height } = metrics
  const start = Math.max(0, Math.min(count - 1, Math.floor(scrollTop / height) - BUFFER))
  const end = Math.min(count, start + Math.ceil(viewport / height) + BUFFER * 2)
  return {
    active: true,
    start,
    end,
    padTop: start * height,
    padBottom: Math.max(0, count - end) * height,
    onScroll: sync,
  }
}
