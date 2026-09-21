import type { Notice } from './SaveToast'

// One message handed from a details screen to the list it returns to (legacy keeps the alert across the redirect).
let pending: Notice | null = null

export function setFlash(message: string) {
  pending = { id: Date.now(), tone: 'success', message }
}

export function peekFlash(): Notice | null {
  return pending
}

export function clearFlash() {
  pending = null
}
