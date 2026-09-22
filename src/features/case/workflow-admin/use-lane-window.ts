'use client'

import { useCallback, useState } from 'react'

// A lane taller than this many nodes is windowed: only the visible slice plus a buffer stays in the DOM.
export const LANE_WINDOW_THRESHOLD = 24
const NODE_HEIGHT = 40
const BUFFER = 6
export const LANE_MAX_HEIGHT = 420

export type LaneWindow = {
  active: boolean
  start: number
  end: number
  padTop: number
  padBottom: number
  onScroll: (event: { currentTarget: HTMLElement }) => void
}

export function useLaneWindow(count: number): LaneWindow {
  const active = count > LANE_WINDOW_THRESHOLD
  const [scrollTop, setScrollTop] = useState(0)

  const onScroll = useCallback((event: { currentTarget: HTMLElement }) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  if (!active) return { active: false, start: 0, end: count, padTop: 0, padBottom: 0, onScroll }

  const start = Math.max(0, Math.floor(scrollTop / NODE_HEIGHT) - BUFFER)
  const end = Math.min(count, start + Math.ceil(LANE_MAX_HEIGHT / NODE_HEIGHT) + BUFFER * 2)
  return {
    active: true,
    start,
    end,
    padTop: start * NODE_HEIGHT,
    padBottom: Math.max(0, count - end) * NODE_HEIGHT,
    onScroll,
  }
}
