import { useSyncExternalStore } from 'react'

type Listener = () => void

let open = 0
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(listener => listener())
}

// Counts requests in flight so the shell can show one "working" edge instead of per-screen spinners.
export function trackRequest(): () => void {
  open += 1
  emit()
  let done = false
  return () => {
    if (done) return
    done = true
    open -= 1
    emit()
  }
}

export function inflightCount(): number {
  return open
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const serverSnapshot = () => 0

export function useInflight(): number {
  return useSyncExternalStore(subscribe, inflightCount, serverSnapshot)
}
