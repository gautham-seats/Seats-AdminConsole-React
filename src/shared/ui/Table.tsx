'use client'

import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react'
import { cn } from './cn'

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  const scroller = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)

  // A sideways-scrolling table must be reachable from the keyboard, so the scroller gets a tab stop only then.
  useEffect(() => {
    const node = scroller.current
    if (!node) return
    const measure = () => setOverflows(node.scrollWidth > node.clientWidth + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    const table = node.querySelector('table')
    if (table) observer.observe(table)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={scroller}
      // A focusable scroller is a region so assistive tech knows why it takes focus (WCAG 2.1.1).
      role={overflows ? 'region' : undefined}
      aria-label={overflows ? (props['aria-label'] ?? undefined) : undefined}
      tabIndex={overflows ? 0 : undefined}
      className="relative w-full overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('text-white [&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 bg-brand px-2 text-left align-middle text-xs font-medium tracking-[0.02em] text-white',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('p-2 align-middle', className)} {...props} />
}
