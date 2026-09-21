'use client'

import { useEffect, useState } from 'react'

const DOTS = '...'
const TYPE_MS = 115
const DOT_MS = 260
const ERASE_MS = 55
const HOLD_MS = 2200
const REDUCED = '(prefers-reduced-motion: reduce)'

const prefersReduced = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED).matches
    : false

// Types a word out letter by letter, trails three slower dots, holds, erases, then moves to the next.
export function useTypewriter(words: readonly string[], paused: boolean) {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [erasing, setErasing] = useState(false)
  const word = words.length ? (words[index % words.length] ?? '') : ''
  const full = word ? `${word}${DOTS}` : ''
  const reduced = prefersReduced()
  // A hidden tab stops the loop; timers would otherwise tick for hours in the background.
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (paused || hidden || reduced || !full) return
    if (!erasing && length >= full.length) {
      const timer = setTimeout(() => setErasing(true), HOLD_MS)
      return () => clearTimeout(timer)
    }
    if (erasing && length <= 0) {
      const timer = setTimeout(() => {
        setErasing(false)
        setIndex(current => current + 1)
      }, ERASE_MS)
      return () => clearTimeout(timer)
    }
    // The dots land one at a time and slower, so the word settles instead of stopping dead.
    const typing = length >= word.length ? DOT_MS : TYPE_MS
    const timer = setTimeout(
      () => setLength(current => current + (erasing ? -1 : 1)),
      erasing ? ERASE_MS : typing,
    )
    return () => clearTimeout(timer)
  }, [paused, hidden, reduced, full, word, length, erasing])

  if (reduced) return full
  return full.slice(0, Math.min(length, full.length))
}
