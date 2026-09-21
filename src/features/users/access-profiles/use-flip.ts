'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'

const MOVE_MS = 340
const EASE = 'cubic-bezier(.22,1,.36,1)'

// Remembers where each [data-flip] child sat; after a reflow each one glides from its old spot to its new one.
// Positions are taken relative to the container, so page scrolling never reads as movement.
export function useFlip(container: RefObject<HTMLElement | null>, signature: string) {
  const last = useRef(new Map<string, { x: number; y: number }>())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const origin = root.getBoundingClientRect()
    const next = new Map<string, { x: number; y: number }>()
    root.querySelectorAll<HTMLElement>('[data-flip]').forEach(node => {
      const key = node.dataset.flip ?? ''
      const rect = node.getBoundingClientRect()
      const spot = { x: rect.left - origin.left, y: rect.top - origin.top }
      next.set(key, spot)
      const before = last.current.get(key)
      if (!before || reduce || typeof node.animate !== 'function') return
      const dx = before.x - spot.x
      const dy = before.y - spot.y
      if (!dx && !dy) return
      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: MOVE_MS,
        easing: EASE,
      })
    })
    last.current = next
  }, [container, signature])
}
