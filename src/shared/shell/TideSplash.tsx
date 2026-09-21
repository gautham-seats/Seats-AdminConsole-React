'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/shared/ui/cn'
import { TidePageLoading } from '@/shared/ui'

const HOLD_MS = 1000
const FADE_MS = 400
const LOADING_LABEL = 'Loading'

// Server-rendered so it covers the page from the first paint on open or reload.
export function TideSplash() {
  const [phase, setPhase] = useState<'hold' | 'fade' | 'done'>('hold')

  useEffect(() => {
    const fade = window.setTimeout(() => setPhase('fade'), HOLD_MS)
    const done = window.setTimeout(() => setPhase('done'), HOLD_MS + FADE_MS)
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(done)
    }
  }, [])

  if (phase === 'done') return null
  // A named region keeps the loading status inside a landmark.
  return (
    <section
      aria-label={LOADING_LABEL}
      className={cn(
        'fixed inset-0 z-[100] flex bg-page transition-opacity duration-400 ease-out',
        phase === 'fade' && 'pointer-events-none opacity-0',
      )}
    >
      <TidePageLoading label={LOADING_LABEL} className="min-h-0 animate-none" />
    </section>
  )
}
