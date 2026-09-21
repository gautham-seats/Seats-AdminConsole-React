export type ApiErrorKind = 'http' | 'network' | 'aborted' | 'blocked' | 'parse' | 'auth' | 'token'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly path: string
  readonly serverMessage: string | null

  constructor(
    kind: ApiErrorKind,
    path: string,
    status: number | null = null,
    serverMessage: string | null = null,
    cause?: unknown,
  ) {
    super(
      `${kind}${status === null ? '' : ` ${status}`}: ${path}`,
      cause === undefined ? undefined : { cause },
    )
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.path = path
    this.serverMessage = serverMessage
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ApiError) return error.kind === 'aborted'
  return error instanceof Error && error.name === 'AbortError'
}

export function toApiError(error: unknown, path = ''): ApiError {
  if (error instanceof ApiError) return error
  if (isAbortError(error)) return new ApiError('aborted', path)
  return new ApiError('network', path)
}
