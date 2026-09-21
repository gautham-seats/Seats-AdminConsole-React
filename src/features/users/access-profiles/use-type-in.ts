'use client'

import { useEffect, useState } from 'react'

export const TYPE_STEP_MS = 30
const REDUCED = '(prefers-reduced-motion: reduce)'

const prefersReduced = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED).matches
    : false

// Types a phrase in once each time it changes, the one-shot cousin of the nav search typewriter.
export function useTypeIn(text: string) {
  const [shown, setShown] = useState({ text, length: 0 })
  const reduced = prefersReduced()
  // A new phrase restarts from nothing; comparing during render avoids a flash of the whole text.
  const length = shown.text === text ? shown.length : 0
  if (shown.text !== text) setShown({ text, length: 0 })

  useEffect(() => {
    if (reduced || length >= text.length) return
    const timer = setTimeout(() => setShown({ text, length: length + 1 }), TYPE_STEP_MS)
    return () => clearTimeout(timer)
  }, [reduced, text, length])

  const done = reduced || length >= text.length
  return { text: done ? text : text.slice(0, length), done }
}

export const CHANGE_PULSE_MS = 1200

// True for a moment after the key changes, so a live panel can say it just updated.
export function useJustChanged(key: string) {
  const [seen, setSeen] = useState({ key, at: 0 })
  if (seen.key !== key) setSeen({ key, at: seen.at + 1 })
  const [settled, setSettled] = useState(0)

  useEffect(() => {
    if (seen.at === 0) return
    const timer = setTimeout(() => setSettled(seen.at), CHANGE_PULSE_MS)
    return () => clearTimeout(timer)
  }, [seen.at])

  return { active: seen.at > 0 && settled !== seen.at, pulse: seen.at }
}
