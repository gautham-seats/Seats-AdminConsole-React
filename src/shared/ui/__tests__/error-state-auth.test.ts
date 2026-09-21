import { ApiError } from '@/shared/api'
import { describeApiError, ERROR_KIND_FALLBACK_ONLY, isSessionError } from '../ErrorState'

describe('describeApiError', () => {
  it('D1 describes a 401 as Not authorised with the no-access art', () => {
    expect(describeApiError(new ApiError('auth', 'UserApi', 401))).toMatchObject({
      stateLabel: 'Not authorised',
      art: 'noaccess',
    })
  })

  it('leaves a 403 to the redirect path', () => {
    expect(describeApiError(new ApiError('auth', 'UserApi', 403))).toBeNull()
  })
})

describe('SF-06 / SF-21 session errors', () => {
  it('SF-06 names a missing anti-forgery token as a signed-out session', () => {
    expect(describeApiError(new ApiError('token', 'JobScheduleApi/'))).toMatchObject({
      stateLabel: 'Signed out',
      art: 'noaccess',
    })
    expect(isSessionError(new ApiError('token', 'x'))).toBe(true)
    expect(isSessionError(new ApiError('auth', 'x', 401))).toBe(true)
    expect(isSessionError(new ApiError('auth', 'x', 403))).toBe(false)
    expect(isSessionError(new ApiError('http', 'x', 500))).toBe(false)
  })
})

describe('SF-49 permission-only 403', () => {
  it('SF-49 describes a 403 that stays on the page as no permission, not a generic fault', () => {
    expect(describeApiError(new ApiError('http', 'JobScheduleApi/GetBuildingOptions', 403))).toBe(
      ERROR_KIND_FALLBACK_ONLY.notAuthorised,
    )
  })
})
