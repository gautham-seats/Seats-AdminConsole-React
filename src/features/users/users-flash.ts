export type FlashNotice = { tone: 'success' | 'error'; message: string; duration?: number }

let pending: FlashNotice | null = null

// Carries the save toast across the client navigation back to the list, as legacy toasts survive the hash redirect.
export function setFlash(notice: FlashNotice): void {
  pending = notice
}

export function peekFlash(): FlashNotice | null {
  return pending
}

export function clearFlash(): void {
  pending = null
}
