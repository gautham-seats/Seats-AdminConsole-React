'use client'

import { useEffect, useState } from 'react'
import { useInflight } from '@/shared/api'

const SHOW_AFTER_MS = 150
const MIN_SHOWN_MS = 500

// A 2 px aurora edge under the nav bar while any request is in flight: one "working" signal for the
// whole shell. Quick requests never show it; once shown it stays long enough to be read as a sweep.
export function RequestPulse() {
  const busy = useInflight() > 0
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (busy) {
      const timer = window.setTimeout(() => setShown(true), SHOW_AFTER_MS)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setShown(false), MIN_SHOWN_MS)
    return () => window.clearTimeout(timer)
  }, [busy])

  return (
    <div aria-hidden className="request-pulse" data-active={shown}>
      <span className="request-pulse-beam" />
    </div>
  )
}
