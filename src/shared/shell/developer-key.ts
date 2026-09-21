import { api } from '@/shared/api'
import type { DeveloperKeyResultDto } from '@/types/developer-keys'

// developerKeyGeneratorController.js:1-7 hard-codes these messages.
export const DEVELOPER_KEY_TEXT = {
  keyExpired: 'Current key has expired.',
  keyExpiring: 'Current key expires on',
  keyWarning: 'Getting a new developer key will invalidate any previous one associated to this user.',
  newKeyWarning: 'Make sure to copy the key now. You will not be able to see it again.',
  newKeyExpiring: 'New key expires on',
  copied: 'Copied',
  saveError: 'There was an error while trying to save the item.',
  safeMode: 'Saving is turned off in this environment (safe mode).',
} as const

const pad = (value: number) => String(value).padStart(2, '0')

// developerKeyGeneratorController.js:30-38 and :63 both show DD/MM/YYYY HH:mm:ss in local time.
export function formatKeyDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export type KeyStatus = { message: string; warning: string | null }

// developerKeyGeneratorController.js:52-69: no expiry shows nothing; a past expiry hides the warning.
export function currentKeyStatus(result: DeveloperKeyResultDto | null, now: Date): KeyStatus | null {
  if (!result?.expiryDate) return null
  const expiry = new Date(result.expiryDate)
  if (Number.isNaN(expiry.getTime())) return null
  if (expiry < now) return { message: DEVELOPER_KEY_TEXT.keyExpired, warning: null }
  return {
    message: `${DEVELOPER_KEY_TEXT.keyExpiring} ${formatKeyDate(expiry)}.`,
    warning: DEVELOPER_KEY_TEXT.keyWarning,
  }
}

export function newKeyStatus(result: DeveloperKeyResultDto): KeyStatus {
  const expiry = result.expiryDate ? new Date(result.expiryDate) : null
  const date = expiry && !Number.isNaN(expiry.getTime()) ? formatKeyDate(expiry) : ''
  return {
    message: `${DEVELOPER_KEY_TEXT.newKeyExpiring} ${date}.`,
    warning: DEVELOPER_KEY_TEXT.newKeyWarning,
  }
}

function toResult(raw: unknown): DeveloperKeyResultDto | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  return {
    developerKey: typeof record.developerKey === 'string' ? record.developerKey : null,
    expiryDate: typeof record.expiryDate === 'string' ? record.expiryDate : null,
  }
}

// POST api/UserApi/GetUserDeveloperKey returns a masked key and the expiry; read only (UserApiController.cs:626-639).
export async function fetchCurrentDeveloperKey(signal: AbortSignal): Promise<DeveloperKeyResultDto | null> {
  return toResult(await api.post<unknown>('UserApi/GetUserDeveloperKey', { signal }))
}

// POST api/UserApi/GenerateDeveloperKey replaces the user's key and returns it once (UserApiController.cs:612-624).
export async function generateDeveloperKey(): Promise<DeveloperKeyResultDto | null> {
  return toResult(await api.post<unknown>('UserApi/GenerateDeveloperKey'))
}
