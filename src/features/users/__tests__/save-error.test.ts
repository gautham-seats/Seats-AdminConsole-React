import { ApiError } from '@/shared/api'
import { ERROR_KIND_FALLBACK_ONLY } from '@/shared/ui/ErrorState'
import { USERS_FALLBACK_ONLY } from '../index/users-text'
import { saveErrorText } from '../save-error'

describe('saveErrorText', () => {
  it('shows the server message for client errors and hides it for server errors', () => {
    expect(saveErrorText(new ApiError('http', '/api/x', 400, 'Bad name'), 'Save failed')).toBe('Bad name')
    expect(saveErrorText(new ApiError('http', '/api/x', 403, 'No rights'), 'Save failed')).toBe('No rights')
    expect(saveErrorText(new ApiError('http', '/api/x', 500, 'Stack trace'), 'Save failed')).toBe(
      'Save failed',
    )
    expect(saveErrorText(new ApiError('http', '/api/x', 403), 'Save failed')).toBe('Save failed')
  })

  it('explains safe mode', () => {
    expect(saveErrorText(new ApiError('blocked', '/api/x'), 'Save failed')).toBe(USERS_FALLBACK_ONLY.safeMode)
  })

  it('G1-3 shows the not-authorised text on 401 and keeps 403 on the fallback', () => {
    expect(saveErrorText(new ApiError('auth', '/api/x', 401), 'Save failed')).toBe(
      ERROR_KIND_FALLBACK_ONLY.notAuthorised.message,
    )
    expect(saveErrorText(new ApiError('auth', '/api/x', 403), 'Save failed')).toBe('Save failed')
  })
})
