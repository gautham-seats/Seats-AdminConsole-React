'use client'

import { useEffect, useRef, useState } from 'react'
import { getUiCulture } from '@/shared/i18n/culture'

const DURATION_MS = 700
// A grouped number in any culture (3,807 · 3.807 · 3 807) or a plain run of digits.
const NUMBER = /\d{1,3}(?:[,.\u00a0\u202f ]\d{3})+|\d+/

const canAnimate = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

const format = (value: number, grouped: boolean) =>
  grouped ? new Intl.NumberFormat(getUiCulture()).format(value) : String(value)

// Counts the first number in a label (e.g. "Total 3807") up from its previous value.
export function CountUp({ text }: { text: string }) {
  const match = NUMBER.exec(text)
  const target = match ? Number(match[0].replace(/\D/g, '')) : null
  const [shown, setShown] = useState<number | null>(null)
  const from = useRef(0)

  useEffect(() => {
    if (target === null || !canAnimate()) return
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(Math.round(origin + (target - origin) * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
      else from.current = target
    }
    frame = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(frame)
      from.current = target
    }
  }, [target])

  if (!match || target === null || shown === null || shown === target) return <>{text}</>
  const grouped = /\D/.test(match[0])
  return (
    <span aria-label={text} className="tabular-nums">
      {text.slice(0, match.index)}
      {format(shown, grouped)}
      {text.slice(match.index + match[0].length)}
    </span>
  )
}
