'use client'

import { Lock, Save, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { SETTINGS_GROUP, type MenuLink, type Permission } from '@/shared/shell/admin-menu'
import { AreaWorkspace, type WorkspaceSection } from '@/shared/shell/AreaWorkspace'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { useProfile } from '@/shared/shell/profile'
import { Button, DelayedLoading, ErrorState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ADD_BUTTON_CLASS, CANCEL_BUTTON_CLASS, EXPORT_BUTTON_CLASS } from '@/shared/ui/add-button'
import type { ApiError, ReadStatus } from '@/shared/api'
import { useScreenText } from './use-screen-text'
import { StatusBadge } from '@/shared/ui/StatusBadge'

// Sidebar labels and frame text shared by every Settings screen.
export const FRAME_TEXT = {
  Settings: 'Settings',
  FileTemplate: 'File Template',
  ActivityTypes: 'Activity Types',
  Resources: 'Resources',
  CustomFields: 'Custom Fields',
  Authentication: 'Authentication',
  Contacts: 'Contacts',
  Collapse: 'Collapse',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Save: 'Save',
  Cancel: 'Cancel',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
} as const

export const FRAME_EN = {
  expand: 'Expand',
  noAccess: 'You do not have permission to view this page.',
  unsaved: 'Unsaved changes',
  discard: 'Discard',
  viewOnly: 'View only',
  shortcut: 'Ctrl+S',
  dismiss: 'Close',
  safeMode: 'Saving is switched off (safe mode). Nothing was changed.',
} as const

export function useFrameText() {
  return useScreenText(FRAME_TEXT)
}

// Profile loading, error and access check before any Settings screen renders.
export function SettingsGate({ access, children }: { access: Permission; children: ReactNode }) {
  const profile = useProfile()
  const t = useFrameText()

  if (profile.status === 'error') {
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
  }
  if (profile.status !== 'success') {
    return (
      <div className="grid flex-1 place-items-center">
        <h1 className="sr-only">{t('Loading')}</h1>
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  }
  if (!profile.can(access)) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div
          role="alert"
          className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-white p-8 text-center shadow-sm"
        >
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <Lock aria-hidden className="size-5" />
          </span>
          <h1 className="text-[15px] font-semibold text-foreground">{FRAME_EN.noAccess}</h1>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

// Another area's sidebar with already translated labels, keyed by section id.
export type WorkspaceArea = {
  label: string
  sections: readonly MenuLink[]
  labels: Readonly<Record<string, string>>
}

type SettingsLayoutProps = {
  sectionId: string
  title: string
  meta?: ReactNode
  actions?: ReactNode
  area?: WorkspaceArea
  children: ReactNode
}

export function SettingsLayout({ sectionId, title, meta, actions, area, children }: SettingsLayoutProps) {
  const profile = useProfile()
  const t = useFrameText()
  const sections = useMemo<WorkspaceSection[]>(
    () =>
      (area?.sections ?? SETTINGS_GROUP)
        .filter(section => !section.permission || profile.can(section.permission))
        .map(section => ({
          ...section,
          label: area
            ? (area.labels[section.id] ?? section.fallback)
            : section.labelKey && Object.hasOwn(FRAME_TEXT, section.labelKey)
              ? t(section.labelKey as keyof typeof FRAME_TEXT)
              : section.fallback,
        })),
    [area, profile, t],
  )

  return (
    <AreaWorkspace
      areaLabel={area?.label ?? t('Settings')}
      sections={sections}
      activeId={sectionId}
      title={title}
      collapseLabel={t('Collapse')}
      expandLabel={FRAME_EN.expand}
      meta={meta}
      actions={actions}
    >
      {children}
    </AreaWorkspace>
  )
}

// Scrollable body with the shared loading and error states.
export function SettingsBody({
  status,
  onRetry,
  error = null,
  children,
}: {
  status: ReadStatus
  onRetry: () => void
  error?: ApiError | null
  children: ReactNode
}) {
  const t = useFrameText()
  return (
    <div className="-mx-6 -mb-6 min-h-0 flex-1 overflow-auto px-6 pb-6">
      {status === 'error' ? (
        <ErrorState
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={onRetry}
          error={error}
          className="min-h-80"
        />
      ) : status !== 'success' ? (
        <div className="grid h-80 place-items-center">
          <DelayedLoading active label={t('Loading')} />
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export function FormStatusPill({ canEdit, dirty }: { canEdit: boolean; dirty: boolean }) {
  if (!canEdit) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
        {FRAME_EN.viewOnly}
      </span>
    )
  }
  if (!dirty) return null
  return (
    <StatusBadge tone="warning" pulse className="animate-fade-in">
      {FRAME_EN.unsaved}
    </StatusBadge>
  )
}

type SaveActionsProps = {
  dirty: boolean
  saving: boolean
  saveLabel: string
  discardLabel?: string
  onSave: () => void
  onDiscard: () => void
  alwaysShowDiscard?: boolean
  extra?: ReactNode
}

export function SaveActions({
  dirty,
  saving,
  saveLabel,
  discardLabel = FRAME_EN.discard,
  onSave,
  onDiscard,
  alwaysShowDiscard = false,
  extra,
}: SaveActionsProps) {
  useLeaveGuard(dirty && !saving, LEAVE_EN.message)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {extra}
      {dirty || alwaysShowDiscard ? (
        <Button
          variant="ghost"
          onClick={onDiscard}
          disabled={saving}
          className={cn(CANCEL_BUTTON_CLASS, 'animate-slide-in motion-reduce:animate-none')}
        >
          <Undo2 aria-hidden className="size-[18px]" />
          {discardLabel}
        </Button>
      ) : null}
      <Button
        onClick={onSave}
        loading={saving}
        aria-keyshortcuts="Control+S"
        title={FRAME_EN.shortcut}
        // Same glossy primary as the Add button on every list screen.
        className={ADD_BUTTON_CLASS}
      >
        <Save
          aria-hidden
          className="size-[18px] transition-transform duration-500 ease-premium group-hover:-translate-y-px"
        />
        {saveLabel}
      </Button>
    </div>
  )
}

type DetailActionsProps = {
  cancelHref: string
  cancelLabel: string
  saveLabel: string
  onSave: () => void
  saving: boolean
  canSave: boolean
  /** Blocks Save while another action on the form is running. */
  disabled?: boolean
  /** A second action beside Save, built with SecondaryAction so all three share one box. */
  extra?: ReactNode
}

// Cancel / (extra) / Save for a full-page Settings form. One box for all three: see add-button.ts.
export function DetailActions({
  cancelHref,
  cancelLabel,
  saveLabel,
  onSave,
  saving,
  canSave,
  disabled = false,
  extra,
}: DetailActionsProps) {
  return (
    // One equal track per action, so a longer label widens all three rather than just its own button.
    <div className="grid grid-flow-col auto-cols-fr items-center gap-2">
      <Link href={cancelHref} className={CANCEL_BUTTON_CLASS}>
        {cancelLabel}
      </Link>
      {extra}
      {canSave ? (
        <Button
          onClick={onSave}
          loading={saving}
          disabled={disabled}
          aria-keyshortcuts="Control+S"
          title={FRAME_EN.shortcut}
          className={ADD_BUTTON_CLASS}
        >
          <Save aria-hidden className="size-[18px]" />
          {saveLabel}
        </Button>
      ) : null}
    </div>
  )
}

// A quiet button in the same box as Cancel and Save, for a form's own extra action.
export function SecondaryAction({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(EXPORT_BUTTON_CLASS, 'border-slate-300 text-slate-700')}
    >
      {icon}
      {children}
    </Button>
  )
}

// Ctrl+S / Cmd+S runs the latest save handler while editing is allowed.
export function useSaveShortcut(enabled: boolean, save: () => void | Promise<void>) {
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
