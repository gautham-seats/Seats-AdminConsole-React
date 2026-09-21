import { ApiError } from '@/shared/api'
import { isGeneralError, isGeneralErrorStatus } from '../general-error'

describe('isGeneralErrorStatus', () => {
  it.each([500, 502, 404, 409, 405])('reports %s like the global ajaxError default branch', status => {
    expect(isGeneralErrorStatus(status)).toBe(true)
  })

  it.each([200, 400, 401, 403, 408, 428, 0])('skips %s', status => {
    expect(isGeneralErrorStatus(status)).toBe(false)
  })

  it('skips a missing status', () => {
    expect(isGeneralErrorStatus(null)).toBe(false)
  })
})

describe('isGeneralError', () => {
  it('only treats HTTP failures with a reported status as general errors', () => {
    expect(isGeneralError(new ApiError('http', '/api/UserApi', 500))).toBe(true)
    expect(isGeneralError(new ApiError('http', '/api/UserApi', 400, 'Bad'))).toBe(false)
    expect(isGeneralError(new ApiError('network', '/api/UserApi'))).toBe(false)
    expect(isGeneralError(new ApiError('blocked', '/api/UserApi'))).toBe(false)
    expect(isGeneralError(new Error('boom'))).toBe(false)
  })
})
