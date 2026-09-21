type Listener = () => void

const listeners = new Set<Listener>()

// Success toasts announce here so the button that just saved can show its tick.
export function onSaveSuccess(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function announceSaveSuccess() {
  listeners.forEach(listener => listener())
}
