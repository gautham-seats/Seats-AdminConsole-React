import { toApiError } from '@/shared/api'
import { ERROR_KIND_FALLBACK_ONLY } from '@/shared/ui/ErrorState'
import { USERS_FALLBACK_ONLY } from './index/users-text'

// Legacy shows responseJSON.message on any failure; 5xx text stays hidden (LB-005).
export function saveErrorText(error: unknown, fallback: string): string {
  const failure = toApiError(error)
  if (failure.kind === 'blocked') return USERS_FALLBACK_ONLY.safeMode
  // swapp.js:174-183: 401 means NotAuthorised; 403 stays on the fallback because the shell redirects (D-120).
  if (failure.kind === 'auth' && failure.status === 401) return ERROR_KIND_FALLBACK_ONLY.notAuthorised.message
  if (failure.kind === 'http' && failure.status !== null && failure.status < 500 && failure.serverMessage)
    return failure.serverMessage
  return fallback
}
