'use client'

import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import { autoCloseMessages } from '@/shared/ui/accessibility-prefs'
import {
  LESSON_TYPES_ROUTE,
  PermissionAction,
  PermissionItem,
  type MenuLink,
} from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { LESSON_TYPE_FALLBACK_ONLY, useLessonTypeText } from './lesson-type-text'

export const LESSON_TYPE_ACCESS = { item: PermissionItem.LessonType, action: PermissionAction.Access }
export const LESSON_TYPE_EDIT = { item: PermissionItem.LessonType, action: PermissionAction.Edit }
export const LESSON_TYPE_CHECKOUT = {
  item: PermissionItem.LessonType,
  action: PermissionAction.CheckOutPolicy,
}
export const LESSON_TYPE_CONSECUTIVE = {
  item: PermissionItem.LessonType,
  action: PermissionAction.ConsecAttendance,
}

// _Layout.cshtml:111-114: a top-level item with no sub-navigation.
const SECTION: MenuLink = {
  id: 'lesson-type',
  labelKey: 'LessonType',
  fallback: 'Lesson Type',
  icon: 'book',
  legacyRoute: '#/LessonType',
  reactRoute: LESSON_TYPES_ROUTE,
  permission: LESSON_TYPE_ACCESS,
}

// LessonTypeController.cs:18 and :28 serve both screens with LessonType + Access.
export function LessonTypeGate({ children }: { children: ReactNode }) {
  const profile = useProfile()
  const t = useLessonTypeText()
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
  // Retrying cannot grant a permission, so this state offers no Retry.
  if (!profile.can(LESSON_TYPE_ACCESS))
    return (
      <div className="flex flex-1 p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          tone="warning"
          glyph="permission"
          stateLabel={LESSON_TYPE_FALLBACK_ONLY.noAccessState}
          message={LESSON_TYPE_FALLBACK_ONLY.noAccess}
          hint={LESSON_TYPE_FALLBACK_ONLY.noAccessHint}
        />
      </div>
    )
  return children
}

export function LessonTypeWorkspace({
  title,
  meta,
  actions,
  children,
}: {
  title: string
  meta?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  const t = useLessonTypeText()
  const sections = useMemo(() => [{ ...SECTION, label: t('LessonType') }], [t])
  return (
    <AreaWorkspace
      areaLabel={t('LessonType')}
      sections={sections}
      activeId="lesson-type"
      title={title}
      meta={meta}
      actions={actions}
      collapseLabel={t('Collapse')}
      expandLabel={LESSON_TYPE_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {children}
    </AreaWorkspace>
  )
}

export type LessonTypeNotice = {
  id: number
  tone: 'success' | 'error' | 'info'
  message: string
  duration: number
}

let pendingFlash: LessonTypeNotice | null = null
export const setLessonTypeFlash = (notice: LessonTypeNotice) => {
  pendingFlash = notice
}
export const peekLessonTypeFlash = () => pendingFlash
export const clearLessonTypeFlash = () => {
  pendingFlash = null
}

// swAlert timings: save success 3.5 s, gray server message 5 s, validation 4 s (lessonTypeDetailsController.js:22-28).
export function LessonTypeNoticeBar({
  notice,
  onDismiss,
  dismissLabel,
}: {
  notice: LessonTypeNotice | null
  onDismiss: () => void
  dismissLabel: string
}) {
  useEffect(() => {
    if (!notice || !autoCloseMessages()) return
    const timer = setTimeout(onDismiss, notice.duration)
    return () => clearTimeout(timer)
  }, [notice, onDismiss])
  if (!notice) return null
  const Icon = notice.tone === 'success' ? CircleCheck : CircleAlert
  return (
    <div
      key={notice.id}
      role={notice.tone === 'success' ? 'status' : 'alert'}
      className={cn(
        'flex animate-rise-in items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-sm motion-reduce:animate-none',
        notice.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        notice.tone === 'error' && 'border-red-200 bg-red-50 text-red-900',
        notice.tone === 'info' && 'border-slate-200 bg-slate-50 text-slate-800',
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          'size-4 shrink-0',
          notice.tone === 'success'
            ? 'text-emerald-600'
            : notice.tone === 'error'
              ? 'text-red-600'
              : 'text-slate-500',
        )}
      />
      <span className="flex-1">{notice.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="grid size-6 place-items-center rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  )
}
