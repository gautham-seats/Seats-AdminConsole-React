'use client'

import { CircleAlert, CircleCheck, Info, Lock, X } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { toApiError } from '@/shared/api'
import { ERROR_KIND_FALLBACK_ONLY } from '@/shared/ui/ErrorState'
import { ENGAGEMENT_GROUP, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { useToastAutoClose } from '@/shared/ui/Toast'
import { cn } from '@/shared/ui/cn'
import { ENGAGEMENT_FALLBACK_ONLY, useEngagementText } from './engagement-text'

export const ENGAGEMENT_ACCESS = { item: PermissionItem.Engagement, action: PermissionAction.Access }
export const ENGAGEMENT_ADD = { item: PermissionItem.Engagement, action: PermissionAction.Add }
export const ENGAGEMENT_RECALCULATE = {
  item: PermissionItem.Engagement,
  action: PermissionAction.ReCalculateModel,
}

// The data calls need Engagement + Access (EngagementApiController.cs:149).
export function EngagementGate({ children }: { children: ReactNode }) {
  const profile = useProfile()
  const t = useEngagementText()
  if (profile.status === 'error')
    return (
      <div className="grid flex-1 place-items-center p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={profile.reload}
          error={profile.error}
        />
      </div>
    )
  if (profile.status !== 'success')
    return (
      <div className="grid flex-1 place-items-center">
        <h1 className="sr-only">{t('Loading')}</h1>
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  if (!profile.can(ENGAGEMENT_ACCESS))
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div
          role="alert"
          className="flex max-w-md animate-rise-in flex-col items-center gap-3 rounded-lg border border-border bg-white p-8 text-center shadow-sm"
        >
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <Lock aria-hidden className="size-5" />
          </span>
          <h1 className="text-[15px] font-semibold text-foreground">{ENGAGEMENT_FALLBACK_ONLY.noAccess}</h1>
        </div>
      </div>
    )
  return children
}

export function EngagementWorkspace({
  activeId,
  title,
  meta,
  actions,
  children,
}: {
  activeId: 'engagement-configuration' | 'engagement-history'
  title: string
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const t = useEngagementText()
  const sections = useMemo(
    () =>
      ENGAGEMENT_GROUP.map(link => ({
        ...link,
        label: link.id === 'engagement-history' ? t('History') : t('Configuration'),
      })),
    [t],
  )
  return (
    <AreaWorkspace
      areaLabel={t('Engagement')}
      sections={sections}
      activeId={activeId}
      title={title}
      meta={meta}
      actions={actions}
      collapseLabel={t('Collapse')}
      expandLabel={ENGAGEMENT_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {children}
    </AreaWorkspace>
  )
}

export type EngagementNotice = { id: number; tone: 'success' | 'error' | 'info'; message: string }

// A notice for the next Engagement screen, so a Save that navigates back still shows its success text.
let pendingFlash: EngagementNotice | null = null
export const setEngagementFlash = (notice: EngagementNotice) => {
  pendingFlash = notice
}
export const peekEngagementFlash = () => pendingFlash
export const clearEngagementFlash = () => {
  pendingFlash = null
}

// swapp.js:174-206 and D-120: the server text only on 400, NotAuthorised on 401, safe mode when blocked.
export function engagementFailureText(error: unknown, fallback: string): string {
  const failure = toApiError(error)
  if (failure.kind === 'blocked') return ENGAGEMENT_FALLBACK_ONLY.safeMode
  if (failure.kind === 'auth' && failure.status === 401) return ERROR_KIND_FALLBACK_ONLY.notAuthorised.message
  if (failure.kind === 'http' && failure.status === 400 && failure.serverMessage) return failure.serverMessage
  return fallback
}

export function EngagementNoticeBar({
  notice,
  onDismiss,
}: {
  notice: EngagementNotice | null
  onDismiss: () => void
}) {
  useToastAutoClose(notice !== null, 5000, onDismiss)
  if (!notice) return null
  const Icon = notice.tone === 'success' ? CircleCheck : notice.tone === 'error' ? CircleAlert : Info
  return (
    <div
      key={notice.id}
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex animate-rise-in items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-sm motion-reduce:animate-none',
        notice.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        notice.tone === 'error' && 'border-red-200 bg-red-50 text-red-900',
        notice.tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="flex-1">{notice.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={ENGAGEMENT_FALLBACK_ONLY.dismiss}
        className="grid size-6 place-items-center rounded-sm opacity-70 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  )
}
