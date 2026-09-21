'use client'

import { useLayoutEffect, useRef, useState } from 'react'

// A brand underline that slides to the selected tab; place inside a relative role="tablist".
export function TabIndicator({ activeKey }: { activeKey: string | number }) {
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
      className="pointer-events-none absolute -bottom-px h-0.5 rounded-full bg-brand shadow-[0_0_10px_rgba(21,102,162,.45)] transition-[left,width] duration-500 ease-premium motion-reduce:transition-none"
      style={box ? { left: box.left, width: box.width } : { opacity: 0 }}
    />
  )
}
