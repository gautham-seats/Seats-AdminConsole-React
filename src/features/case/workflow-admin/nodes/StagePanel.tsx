'use client'

import { Layers, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, ConfirmDialog, Input } from '@/shared/ui'
import { isValidCronExpression } from '@/features/operations/job-schedule/cron'
import { ScheduleBuilder } from '@/features/operations/job-schedule/ScheduleBuilder'
import {
  FormStatusPill,
  FRAME_EN,
  SaveActions,
  useSaveShortcut,
} from '@/features/settings/shared/SettingsFrame'
import { SettingsCard, SettingsField } from '@/features/settings/shared/SettingsCard'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import type { CfcWorkflowStageDto } from '@/types/case'
import { createWorkflowStage, deleteWorkflowStage, fetchStages, updateWorkflowStage } from '../../case-api'
import { NodePanelState } from './NodePanelState'

const TEXT = {
  Stages: 'Stages',
  Name: 'Name',
  Description: 'Description',
  NumericValue: 'Numeric value',
  DefaultNextCheckSuccessPeriod: 'Default next check success period',
  DefaultNextCheckFailurePeriod: 'Default next check failure period',
  DefaultNextCheckSuccessDay: 'Default next check success day',
  DefaultNextCheckFailureDay: 'Default next check failure day',
  DefaultAttendanceDurationPeriod: 'Default attendance duration period',
  DefaultNextCheckCron: 'Default next check cron',
  CronExpressionIncorrect: 'Cron expression is incorrect.',
  Save: 'Save',
  Delete: 'Delete',
  RequiredMessage: 'There are fields with input validation errors.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  DeleteConfirm: 'Delete this stage?',
  DeleteTitle: 'Delete stage',
  Cancel: 'Cancel',
  Dismiss: 'Close',
  Advance: 'Advanced',
  DigitsFrom0to7: 'Digits from 0 to 7',
} as const

const EN = {
  detailsHint: 'Stage thresholds and default next-check schedule',
  nameRequired: 'Enter a name.',
  descriptionRequired: 'Enter a description.',
  numericValueRequired: 'Enter a numeric value.',
  successPeriodRequired: 'Enter the default next check success period.',
  failurePeriodRequired: 'Enter the default next check failure period.',
  successDayRequired: 'Enter the default next check success day, from 0 to 7.',
  failureDayRequired: 'Enter the default next check failure day, from 0 to 7.',
  durationPeriodRequired: 'Enter the default attendance duration period.',
} as const

type StageDraft = {
  id: number | null
  name: string
  description: string
  numericValue: string
  defaultNextCheckSuccessPeriod: string
  defaultNextCheckFailurePeriod: string
  defaultNextCheckSuccessDay: string
  defaultNextCheckFailureDay: string
  defaultAttendanceDurationPeriod: string
  defaultNextCheckCron: string
  sortOrder: number
  cfcWorkflowStageGroupId: number
}

type StagePanelProps = {
  workflowId: number
  stageGroupId: number
  stageId: number | null
  onSaved: () => void
  onDeleted?: () => void
  onDirtyChange: (dirty: boolean) => void
}

function toDraft(stageGroupId: number, data: CfcWorkflowStageDto | null, create: boolean): StageDraft {
  return {
    id: create ? null : (data?.id ?? null),
    name: create ? '' : (data?.name ?? ''),
    description: create ? '' : (data?.description ?? ''),
    numericValue: create ? '' : String(data?.numericValue ?? ''),
    defaultNextCheckSuccessPeriod: create ? '' : String(data?.defaultNextCheckSuccessPeriod ?? ''),
    defaultNextCheckFailurePeriod: create ? '' : String(data?.defaultNextCheckFailurePeriod ?? ''),
    defaultNextCheckSuccessDay: create ? '' : String(data?.defaultNextCheckSuccessDay ?? ''),
    defaultNextCheckFailureDay: create ? '' : String(data?.defaultNextCheckFailureDay ?? ''),
    defaultAttendanceDurationPeriod: create ? '' : String(data?.defaultAttendanceDurationPeriod ?? ''),
    defaultNextCheckCron: create ? '' : (data?.defaultNextCheckCron ?? ''),
    sortOrder: data?.sortOrder ?? 0,
    cfcWorkflowStageGroupId: stageGroupId,
  }
}

function toBody(draft: StageDraft): CfcWorkflowStageDto {
  return {
    id: draft.id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    numericValue: Number(draft.numericValue),
    numericLabel: null,
    defaultNextCheckSuccessPeriod: Number(draft.defaultNextCheckSuccessPeriod),
    defaultNextCheckFailurePeriod: Number(draft.defaultNextCheckFailurePeriod),
    defaultNextCheckSuccessDay: Number(draft.defaultNextCheckSuccessDay),
    defaultNextCheckFailureDay: Number(draft.defaultNextCheckFailureDay),
    defaultAttendanceDurationPeriod: Number(draft.defaultAttendanceDurationPeriod),
    defaultNextCheckCron: draft.defaultNextCheckCron.trim() || null,
    sortOrder: draft.sortOrder,
    cfcWorkflowStageGroupId: draft.cfcWorkflowStageGroupId,
    cfcWorkflowStageRuleGroups: null,
  }
}

type RequiredField =
  | 'name'
  | 'description'
  | 'numericValue'
  | 'defaultNextCheckSuccessPeriod'
  | 'defaultNextCheckFailurePeriod'
  | 'defaultNextCheckSuccessDay'
  | 'defaultNextCheckFailureDay'
  | 'defaultAttendanceDurationPeriod'

export type StageErrors = Partial<Record<RequiredField, string>>

const REQUIRED_MESSAGES: Record<RequiredField, string> = {
  name: EN.nameRequired,
  description: EN.descriptionRequired,
  numericValue: EN.numericValueRequired,
  defaultNextCheckSuccessPeriod: EN.successPeriodRequired,
  defaultNextCheckFailurePeriod: EN.failurePeriodRequired,
  defaultNextCheckSuccessDay: EN.successDayRequired,
  defaultNextCheckFailureDay: EN.failureDayRequired,
  defaultAttendanceDurationPeriod: EN.durationPeriodRequired,
}

// Same required fields as before, each with its own message (requirement 8.1).
export function stageErrorsFor(draft: StageDraft): StageErrors {
  const errors: StageErrors = {}
  for (const field of Object.keys(REQUIRED_MESSAGES) as RequiredField[]) {
    if (!draft[field].trim()) errors[field] = REQUIRED_MESSAGES[field]
  }
  return errors
}

const fieldA11y = (error: string | undefined, id: string) =>
  error ? { 'aria-invalid': true, 'aria-describedby': `${id}-error` } : {}

export function StagePanel({
  workflowId,
  stageGroupId,
  stageId,
  onSaved,
  onDeleted,
  onDirtyChange,
}: StagePanelProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canEdit = profile.can({ item: PermissionItem.Case, action: PermissionAction.Edit })
  const canAdd = profile.can({ item: PermissionItem.Case, action: PermissionAction.Add })
  const canDelete = profile.can({ item: PermissionItem.Case, action: PermissionAction.Delete })
  const create = stageId === null
  // CaseApiController.cs:1073 needs Case.Add to create a stage; :737 needs Case.Edit to update one.
  const canSave = create ? canAdd : canEdit
  const read = useApiRead(create ? null : `case:stage:${workflowId}:${stageGroupId}:${stageId}`, signal =>
    fetchStages(workflowId, stageGroupId, stageId ?? undefined, signal),
  )
  const [form, setForm] = useState<{ source: StageDraft; baseline: StageDraft; draft: StageDraft } | null>(
    null,
  )
  const [cronAdvanced, setCronAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [attempted, setAttempted] = useState(false)

  const loaded = useMemo(() => {
    if (create) return toDraft(stageGroupId, null, true)
    if (read.status !== 'success' || !read.data) return null
    const data = Array.isArray(read.data) ? read.data[0] : read.data
    if (!data) return null
    return toDraft(stageGroupId, data, false)
  }, [create, read.data, read.status, stageGroupId])

  const currentForm =
    loaded && form?.source === loaded
      ? form
      : loaded
        ? { source: loaded, baseline: loaded, draft: loaded }
        : null
  const draft = currentForm?.draft ?? null
  const baseline = currentForm?.baseline ?? null
  const setDraft = (update: StageDraft | ((current: StageDraft | null) => StageDraft | null)) => {
    if (!currentForm || !loaded) return
    const next = typeof update === 'function' ? update(currentForm.draft) : update
    if (next) setForm({ ...currentForm, source: loaded, draft: next })
  }

  const dirty = draft !== null && baseline !== null && JSON.stringify(draft) !== JSON.stringify(baseline)

  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])

  // Requirement 8.1: after the first Save, every message follows the current values.
  const errors: StageErrors = attempted && draft ? stageErrorsFor(draft) : {}
  const cron = draft?.defaultNextCheckCron.trim() ?? ''
  const cronError =
    attempted && cron !== '' && !isValidCronExpression(cron) ? t('CronExpressionIncorrect') : null

  const validate = () => {
    if (!draft) return false
    setAttempted(true)
    if (Object.keys(stageErrorsFor(draft)).length > 0) return false
    const value = draft.defaultNextCheckCron.trim()
    return !value || isValidCronExpression(value)
  }

  const save = async () => {
    if (!draft || saving || !canSave || !validate()) return
    setSaving(true)
    try {
      const body = toBody(draft)
      if (create) await createWorkflowStage(body)
      else await updateWorkflowStage(body)
      if (loaded) setForm({ source: loaded, baseline: draft, draft })
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertSaveSucceededDefault') })
      onSaved()
    } catch (error) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: saveFailureMessage(toApiError(error), t('AlertSaveErrorDefault')),
      })
    } finally {
      setSaving(false)
    }
  }

  useSaveShortcut(canSave && draft !== null && !saving, save)

  const discard = () => {
    if (!baseline) return
    setDraft(baseline)
    setAttempted(false)
  }

  const confirmDelete = async () => {
    if (!draft?.id || deleting || !canDelete) return
    setDeleting(true)
    try {
      await deleteWorkflowStage([draft.id])
      setDeleteOpen(false)
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertDeleteSuccessDefault') })
      ;(onDeleted ?? onSaved)()
    } catch (error) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: saveFailureMessage(toApiError(error), t('AlertDeleteErrorDefault')),
      })
    } finally {
      setDeleting(false)
    }
  }

  const digitsOnly = (value: string, maxLength?: number) =>
    value.replace(/\D/g, '').slice(0, maxLength ?? value.length)

  const dayOnly = (value: string) => {
    const digit = value.replace(/\D/g, '').slice(0, 1)
    if (!digit) return ''
    const num = Number(digit)
    return num > 7 ? '7' : digit
  }

  // Delete follows Case.Delete alone, not Case.Edit (Views/Case/WorkflowStages.cshtml:41-43).
  const deleteButton =
    !create && canDelete ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDeleteOpen(true)}
        disabled={saving || deleting}
        className="text-red-700 hover:bg-red-50 hover:text-red-800"
      >
        <Trash2 aria-hidden className="size-4" />
        {t('Delete')}
      </Button>
    ) : null

  if (!create && read.status !== 'success')
    return (
      <NodePanelState status={read.status} onRetry={read.reload}>
        {null}
      </NodePanelState>
    )
  if (!draft)
    return (
      <NodePanelState status="success" empty onRetry={read.reload}>
        {null}
      </NodePanelState>
    )

  return (
    <>
      <SettingsCard
        icon={Layers}
        title={t('Stages')}
        hint={EN.detailsHint}
        action={
          <div className="flex items-center gap-2">
            <FormStatusPill canEdit={canSave} dirty={dirty} />
            {canSave ? (
              <SaveActions
                dirty={dirty}
                saving={saving}
                saveLabel={t('Save')}
                discardLabel={FRAME_EN.discard}
                onSave={() => void save()}
                onDiscard={discard}
                extra={deleteButton}
              />
            ) : (
              deleteButton
            )}
          </div>
        }
      >
        <SettingsField htmlFor="stage-name" label={t('Name')} error={errors.name}>
          <Input
            id="stage-name"
            {...fieldA11y(errors.name, 'stage-name')}
            value={draft.name}
            disabled={!canSave || saving}
            onChange={event => setDraft(current => current && { ...current, name: event.target.value })}
          />
        </SettingsField>
        <SettingsField htmlFor="stage-description" label={t('Description')} error={errors.description}>
          <Input
            id="stage-description"
            {...fieldA11y(errors.description, 'stage-description')}
            value={draft.description}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(current => current && { ...current, description: event.target.value })
            }
          />
        </SettingsField>
        <SettingsField htmlFor="stage-numeric-value" label={t('NumericValue')} error={errors.numericValue}>
          <Input
            id="stage-numeric-value"
            {...fieldA11y(errors.numericValue, 'stage-numeric-value')}
            inputMode="numeric"
            maxLength={2}
            value={draft.numericValue}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(current => current && { ...current, numericValue: digitsOnly(event.target.value, 2) })
            }
          />
        </SettingsField>
        <SettingsField
          htmlFor="stage-failure-period"
          label={t('DefaultNextCheckFailurePeriod')}
          error={errors.defaultNextCheckFailurePeriod}
        >
          <Input
            id="stage-failure-period"
            {...fieldA11y(errors.defaultNextCheckFailurePeriod, 'stage-failure-period')}
            inputMode="numeric"
            value={draft.defaultNextCheckFailurePeriod}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(
                current =>
                  current && {
                    ...current,
                    defaultNextCheckFailurePeriod: digitsOnly(event.target.value),
                  },
              )
            }
          />
        </SettingsField>
        <SettingsField
          htmlFor="stage-success-period"
          label={t('DefaultNextCheckSuccessPeriod')}
          error={errors.defaultNextCheckSuccessPeriod}
        >
          <Input
            id="stage-success-period"
            {...fieldA11y(errors.defaultNextCheckSuccessPeriod, 'stage-success-period')}
            inputMode="numeric"
            value={draft.defaultNextCheckSuccessPeriod}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(
                current =>
                  current && {
                    ...current,
                    defaultNextCheckSuccessPeriod: digitsOnly(event.target.value),
                  },
              )
            }
          />
        </SettingsField>
        <SettingsField
          htmlFor="stage-success-day"
          label={t('DefaultNextCheckSuccessDay')}
          error={errors.defaultNextCheckSuccessDay}
          note={<span className="text-xs font-semibold text-slate-500">{t('DigitsFrom0to7')}</span>}
        >
          <Input
            id="stage-success-day"
            {...fieldA11y(errors.defaultNextCheckSuccessDay, 'stage-success-day')}
            inputMode="numeric"
            maxLength={1}
            value={draft.defaultNextCheckSuccessDay}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(
                current => current && { ...current, defaultNextCheckSuccessDay: dayOnly(event.target.value) },
              )
            }
          />
        </SettingsField>
        <SettingsField
          htmlFor="stage-failure-day"
          label={t('DefaultNextCheckFailureDay')}
          error={errors.defaultNextCheckFailureDay}
          note={<span className="text-xs font-semibold text-slate-500">{t('DigitsFrom0to7')}</span>}
        >
          <Input
            id="stage-failure-day"
            {...fieldA11y(errors.defaultNextCheckFailureDay, 'stage-failure-day')}
            inputMode="numeric"
            maxLength={1}
            value={draft.defaultNextCheckFailureDay}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(
                current => current && { ...current, defaultNextCheckFailureDay: dayOnly(event.target.value) },
              )
            }
          />
        </SettingsField>
        <SettingsField
          htmlFor="stage-duration-period"
          label={t('DefaultAttendanceDurationPeriod')}
          error={errors.defaultAttendanceDurationPeriod}
        >
          <Input
            id="stage-duration-period"
            {...fieldA11y(errors.defaultAttendanceDurationPeriod, 'stage-duration-period')}
            inputMode="numeric"
            value={draft.defaultAttendanceDurationPeriod}
            disabled={!canSave || saving}
            onChange={event =>
              setDraft(
                current =>
                  current && {
                    ...current,
                    defaultAttendanceDurationPeriod: digitsOnly(event.target.value),
                  },
              )
            }
          />
        </SettingsField>
        <SettingsField htmlFor="stage-cron" label={t('DefaultNextCheckCron')} error={cronError}>
          <ScheduleBuilder
            id="stage-cron"
            value={draft.defaultNextCheckCron}
            advanced={cronAdvanced}
            advancedLabel={t('Advance')}
            cronLabel={t('DefaultNextCheckCron')}
            cronError={cronError}
            disabled={!canSave || saving}
            invalid={Boolean(cronError)}
            onChange={value => setDraft(current => current && { ...current, defaultNextCheckCron: value })}
            onAdvancedChange={(next, cron) => {
              setCronAdvanced(next)
              if (cron) setDraft(current => current && { ...current, defaultNextCheckCron: cron })
            }}
          />
        </SettingsField>
      </SettingsCard>
      <SaveToast notice={notice} onDismiss={() => setNotice(null)} dismissLabel={t('Dismiss')} />
      <ConfirmDialog
        open={deleteOpen}
        title={t('DeleteTitle')}
        message={t('DeleteConfirm')}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        pending={deleting}
        onConfirm={() => void confirmDelete()}
        onOpenChange={open => !deleting && setDeleteOpen(open)}
      />
    </>
  )
}
