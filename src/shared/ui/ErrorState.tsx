'use client'

import { RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ApiError } from '@/shared/api'
import { redirectToForceLogin } from '@/shared/api/navigation'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from './add-button'
import { ButtonSpinner } from './Button'
import { cn } from './cn'
import { STATE_ART_TONE, StateArt, type StateArtKind } from './StateArt'

// Page fills a route, card fills its area, panel sits in a table cell; all are open and centred (D-084).
export type ErrorStateVariant = 'page' | 'panel' | 'card'

export type ErrorStateTone = 'signal' | 'warning' | 'danger'

export type ErrorStateGlyph = 'connection' | 'permission' | 'session' | 'missing' | 'problem'

export type ErrorStateProps = {
  message: string
  headingLevel?: 1 | 2
  /** Only needed when onRetry is given; a state that cannot be retried shows no button. */
  retryLabel?: string
  onRetry?: () => void
  /** Supporting sentence under the message. */
  hint?: string
  /** Short state name above the message. */
  stateLabel?: string
  /** One quiet line under the actions, such as a reference code. */
  meta?: string
  variant?: ErrorStateVariant
  /** Kept for callers; the drawing now carries the colour of each state. */
  tone?: ErrorStateTone
  glyph?: ErrorStateGlyph
  /** Extra action beside Retry, such as a link home. */
  action?: ReactNode
  retrying?: boolean
  /** The failed read; when given, its kind picks the label, line and drawing. */
  error?: ApiError | null
  className?: string
}

// GeneralResources carries the headline only, so the supporting line and state name default here.
// English fallbacks, like src/app/loading.tsx: no legacy resource key exists for either.
export const ERROR_FALLBACK_ONLY = {
  stateLabel: 'Unable to load',
  hint: 'Nothing was changed. Please try again.',
} as const

type Described = { stateLabel: string; message: string; art: StateArtKind }

// English fallbacks: legacy resources have one generic sentence and no per-failure keys.
export const ERROR_KIND_FALLBACK_ONLY = {
  network: {
    stateLabel: 'Connection lost',
    message: 'Check your connection, then try again.',
    art: 'connection',
  },
  server: {
    stateLabel: 'Server error',
    message: 'The server could not complete the request.',
    art: 'server',
  },
  notFound: {
    stateLabel: 'Not found',
    message: 'The requested information could not be found.',
    art: 'missing',
  },
  blocked: { stateLabel: 'Request blocked', message: 'This action is not allowed here.', art: 'blocked' },
  notAuthorised: {
    stateLabel: 'Not authorised',
    message: 'You do not have permission to view this.',
    art: 'noaccess',
  },
  session: {
    stateLabel: 'Signed out',
    message: 'Your session has ended. Sign in again to continue.',
    art: 'noaccess',
  },
} as const satisfies Record<string, Described>

export const ERROR_ACTION_FALLBACK_ONLY = { signIn: 'Sign in again' } as const

// A 401 or a missing anti-forgery token both mean the legacy session is gone.
export function isSessionError(error: ApiError | null | undefined): boolean {
  return !!error && (error.kind === 'token' || (error.kind === 'auth' && error.status === 401))
}

export function describeApiError(error: ApiError | null | undefined): Described | null {
  if (!error) return null
  if (error.kind === 'network') return ERROR_KIND_FALLBACK_ONLY.network
  if (error.kind === 'blocked') return ERROR_KIND_FALLBACK_ONLY.blocked
  if (error.kind === 'token') return ERROR_KIND_FALLBACK_ONLY.session
  if (error.kind === 'auth' && error.status === 401) return ERROR_KIND_FALLBACK_ONLY.notAuthorised
  // A 403 that stays on the page (permission-only endpoints, D-016 allow-list) is "no permission", not a fault.
  if (error.kind === 'http' && error.status === 403) return ERROR_KIND_FALLBACK_ONLY.notAuthorised
  if (error.kind === 'http' && error.status === 404) return ERROR_KIND_FALLBACK_ONLY.notFound
  if (error.kind === 'http' && error.status !== null && error.status >= 500)
    return ERROR_KIND_FALLBACK_ONLY.server
  return null
}

const GLYPH_ART: Record<ErrorStateGlyph, StateArtKind> = {
  connection: 'unable',
  permission: 'noaccess',
  session: 'unable',
  missing: 'missing',
  problem: 'unable',
}

const SIZE = {
  page: { box: 'min-h-[68vh] py-16', art: 'size-44', msg: 'text-lg' },
  card: { box: 'h-full min-h-72 py-12', art: 'size-40', msg: 'text-[15px]' },
  panel: { box: 'py-10', art: 'size-28', msg: 'text-[15px]' },
} as const

function RetryButton({
  label,
  onRetry,
  retrying,
}: {
  label: string
  onRetry: () => void
  retrying: boolean
}) {
  return (
    <button
      type="button"
      onClick={retrying ? undefined : onRetry}
      aria-disabled={retrying || undefined}
      aria-busy={retrying || undefined}
      className={cn(ADD_BUTTON_CLASS, retrying && 'pointer-events-none opacity-70')}
    >
      {retrying ? <ButtonSpinner /> : <RotateCw aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />}
      {label}
    </button>
  )
}

// One failure language for every screen: an open, centred drawing that names the problem and offers the way out.
export function ErrorState({
  message,
  headingLevel,
  retryLabel,
  onRetry,
  hint,
  stateLabel,
  meta,
  variant = 'card',
  glyph = 'connection',
  action,
  retrying = false,
  error,
  className,
}: ErrorStateProps) {
  const described = describeApiError(error)
  const art = described?.art ?? GLYPH_ART[glyph]
  const size = SIZE[variant]
  const text = described?.message ?? message
  const eyebrow = described?.stateLabel ?? stateLabel ?? ERROR_FALLBACK_ONLY.stateLabel
  const support = described ? hint : (hint ?? ERROR_FALLBACK_ONLY.hint)
  // Retry cannot bring a session back; the way out of a 401 or a lost token is the login page.
  const signIn = isSessionError(error) ? (
    <button type="button" onClick={() => redirectToForceLogin()} className={ADD_BUTTON_CLASS}>
      {ERROR_ACTION_FALLBACK_ONLY.signIn}
    </button>
  ) : null
  const hasActions = Boolean((onRetry && retryLabel) || action || signIn)
  const messageClassName = cn('font-semibold text-balance text-foreground', size.msg)

  return (
    <div className={cn('grid w-full flex-1 place-items-center px-6', size.box, className)}>
      <div role="alert" className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <StateArt kind={art} className={cn('qs-rise shrink-0', size.art)} />
        <div className="qs-rise flex flex-col gap-1.5 [animation-delay:120ms]">
          <span
            className={cn(
              'text-[10.5px] font-bold tracking-[0.17em] uppercase',
              art === 'server' ? 'text-red-700' : STATE_ART_TONE[art],
            )}
          >
            {eyebrow}
          </span>
          {headingLevel === 1 ? (
            <h1 className={messageClassName}>{text}</h1>
          ) : headingLevel === 2 ? (
            <h2 className={messageClassName}>{text}</h2>
          ) : (
            <p className={messageClassName}>{text}</p>
          )}
          {support ? <p className="text-sm text-balance text-muted-foreground">{support}</p> : null}
        </div>
        {hasActions ? (
          <div className="qs-rise flex flex-wrap items-center justify-center gap-2 [animation-delay:240ms]">
            {onRetry && retryLabel ? (
              <RetryButton label={retryLabel} onRetry={onRetry} retrying={retrying} />
            ) : null}
            {signIn}
            {action}
          </div>
        ) : null}
        {meta ? (
          <p className="qs-rise font-mono text-[11px] tracking-wide text-muted-foreground [animation-delay:360ms]">
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  )
}
