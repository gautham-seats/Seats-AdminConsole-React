import { toApiError } from '@/shared/api'

// swapp.js:168-206: the global ajaxError handler skips these statuses; any other status shows the general error.
const HANDLED_STATUSES: readonly number[] = [200, 400, 401, 403, 408, 428]

// swAlert.showGeneralError(10000) in the default branch.
export const GENERAL_ERROR_DURATION = 10000

export function isGeneralErrorStatus(status: number | null): boolean {
  return status !== null && status !== 0 && !HANDLED_STATUSES.includes(status)
}

export function isGeneralError(error: unknown): boolean {
  const failure = toApiError(error)
  return failure.kind === 'http' && isGeneralErrorStatus(failure.status)
}
