'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toApiError } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { ConfirmDialog } from '@/shared/ui'
import {
  FormStatusPill,
  SaveActions,
  useSaveShortcut,
  FRAME_EN,
} from '@/features/settings/shared/SettingsFrame'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'

const ADD = { item: PermissionItem.Case, action: PermissionAction.Add }
const EDIT = { item: PermissionItem.Case, action: PermissionAction.Edit }
const DELETE = { item: PermissionItem.Case, action: PermissionAction.Delete }

const TEXT = {
  Save: 'Save',
  Delete: 'Delete',
  Cancel: 'Cancel',
  Confirm: 'Confirm',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  AlertSaveSucceededDefault: 'The item was saved succesfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
} as const

type NodePanelShellProps<T> = {
  title: string
  baseline: T
  values: T
  isNew: boolean
  onChange: (values: T) => void
  onSave: (values: T) => Promise<void>
  onDelete?: () => Promise<void>
  onDirtyChange?: (dirty: boolean) => void
  onSaved: () => void
  // Field errors the panel shows inline; when true, Save marks the attempt and stops before the request.
  invalid?: boolean
  onSaveAttempt?: () => void
  children: ReactNode
}

export function NodePanelShell<T>({
  title,
  baseline,
  values,
  isNew,
  onChange,
  onSave,
  onDelete,
  onDirtyChange,
  onSaved,
  invalid = false,
  onSaveAttempt,
  children,
}: NodePanelShellProps<T>) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canEdit = profile.can(EDIT)
  const canAdd = profile.can(ADD)
  const canDelete = profile.can(DELETE)
  const canSave = isNew ? canAdd : canEdit
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const save = useCallback(async () => {
    if (!canSave) return
    onSaveAttempt?.()
    setError(null)
    setNotice(null)
    if (invalid) return
    setSaving(true)
    try {
      await onSave(values)
      setNotice(t('AlertSaveSucceededDefault'))
      onSaved()
    } catch (caught) {
      setError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setSaving(false)
    }
  }, [canSave, invalid, onSave, onSaveAttempt, onSaved, t, values])

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  useSaveShortcut(canSave && (dirty || isNew), save)

  const remove = async () => {
    if (!onDelete || !canDelete) return
    setError(null)
    setNotice(null)
    setSaving(true)
    try {
      await onDelete()
      setNotice(t('AlertDeleteSuccessDefault'))
      onSaved()
    } catch (caught) {
      setError(saveFailureMessage(toApiError(caught), t('AlertDeleteErrorDefault')))
    } finally {
      setSaving(false)
      setConfirmDelete(false)
    }
  }

  // Delete follows Case.Delete alone, not Case.Edit (Views/Case/WorkflowStageRuleGroupsRules.cshtml:39-41).
  const deleteButton =
    onDelete && canDelete && !isNew ? (
      <button
        type="button"
        disabled={saving}
        className="rounded-sm text-sm text-red-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        onClick={() => setConfirmDelete(true)}
      >
        {t('Delete')}
      </button>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <h2 className="min-w-0 flex-1 text-sm font-semibold break-words text-foreground">{title}</h2>
        <FormStatusPill canEdit={canSave} dirty={dirty} />
        {canSave ? (
          <SaveActions
            dirty={dirty}
            saving={saving}
            saveLabel={t('Save')}
            onSave={() => void save()}
            onDiscard={() => onChange(baseline)}
            extra={deleteButton}
          />
        ) : (
          deleteButton
        )}
      </div>
      {notice ? (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('Delete')}
        message={t('DeleteConfirmationMsg')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        pending={saving}
        onConfirm={() => void remove()}
      />
    </div>
  )
}

export { FRAME_EN }
