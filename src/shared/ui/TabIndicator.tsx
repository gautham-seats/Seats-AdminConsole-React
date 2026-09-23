'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from './cn'

// The underline colour: brand on a light tablist, white on a brand-blue one.
const TONE = {
  brand: 'bg-brand shadow-[0_0_10px_rgba(21,102,162,.45)]',
  onBrand: 'bg-white shadow-[0_0_10px_rgba(255,255,255,.55)]',
} as const

// A sliding underline for the selected tab; place inside a relative role="tablist".
export function TabIndicator({
  activeKey,
  tone = 'brand',
}: {
  activeKey: string | number
  tone?: keyof typeof TONE
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [box, setBox] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const list = ref.current?.parentElement
    if (!list) return
    const measure = () => {
      const tab = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      if (!tab) return
      const next = { left: tab.offsetLeft + 8, width: Math.max(0, tab.offsetWidth - 16) }
      setBox(current =>
        current && current.left === next.left && current.width === next.width ? current : next,
      )
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    // A tab label that arrives later (resources, fonts) moves the tabs without resizing the list.
    list.querySelectorAll<HTMLElement>('[role="tab"]').forEach(tab => observer.observe(tab))
    return () => observer.disconnect()
  }, [activeKey])

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute -bottom-px h-0.5 rounded-full transition-[left,width] duration-500 ease-premium motion-reduce:transition-none',
        TONE[tone],
      )}
      style={box ? { left: box.left, width: box.width } : { opacity: 0 }}
    />
  )
}
