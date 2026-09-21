import { ApiError } from '@/shared/api'
import { deleteFailureNotice } from '../ListWorkspace'

const fail = (status: number, message?: string) => new ApiError('http', '/api/UserApi', status, message)

describe('deleteFailureNotice', () => {
  it('shows a refused delete as a 5 s warning with the server text', () => {
    expect(deleteFailureNotice(fail(400, 'In use'), 'Delete failed', 'General')).toMatchObject({
      tone: 'warning',
      message: 'In use',
      duration: 5000,
    })
  })

  it('shows the general error text for 5 s on general-error statuses', () => {
    expect(deleteFailureNotice(fail(500), 'Delete failed', 'General')).toMatchObject({
      tone: 'error',
      message: 'General',
      duration: 5000,
    })
    expect(deleteFailureNotice(fail(404), 'Delete failed', 'General').message).toBe('General')
  })

  it('keeps the delete error text for statuses the global handler skips', () => {
    expect(deleteFailureNotice(fail(408), 'Delete failed', 'General')).toMatchObject({
      tone: 'error',
      message: 'Delete failed',
      duration: 5000,
    })
  })
})
