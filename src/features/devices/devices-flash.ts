export type DevicesFlash = { message: string; durationMs: number }

let pending: DevicesFlash | null = null

// Carries the save toast back to the list, as the legacy toast survives the hash redirect.
export function setDevicesFlash(flash: DevicesFlash): void {
  pending = flash
}

export function peekDevicesFlash(): DevicesFlash | null {
  return pending
}

export function clearDevicesFlash(): void {
  pending = null
}
