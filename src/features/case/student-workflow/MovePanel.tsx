'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toApiError } from '@/shared/api'
import { shortDatePattern } from '@/shared/i18n/culture'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/shared/ui'
import type { CfcWorkflowStageDto, WorkflowActionDto, WorkflowTypeId } from '@/types/case'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { updateWorkflowActions } from '../case-api'
import { hasMoveErrors, moveStageOptions, todayCultureDate, validateMove } from './student-workflow'
import { Textarea } from '@/shared/ui/Textarea'
import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from '@/shared/ui/nav-band'
import { cn } from '@/shared/ui/cn'

const EDIT_HOLD = { item: PermissionItem.Students, action: PermissionAction.EditHoldStatus }

const TEXT = {
  Move: 'Move',
  MoveStage: 'Move stage',
  IsOnHold: 'Is on hold',
  OnHoldExpiryDate: 'On hold expiry date',
  NextCheckDate: 'Next check date',
  Comment: 'Comment',
  Save: 'Save',
  Cancel: 'Cancel',
  Close: 'Close',
  Select: 'Select',
  NoStageSelected: 'No stage selected.',
  NoStudentsSelected: 'No students selected.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
} as const

const EN = {
  invalidDate: 'Enter the date as',
} as const

type MovePanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: number
  workflowType: WorkflowTypeId
  studentIds: readonly number[]
  stages: readonly CfcWorkflowStageDto[]
  onSaved: () => void
}

function emptyAction(workflowId: number, type: WorkflowTypeId): WorkflowActionDto {
  return {
    workflowId,
    isOnHold: false,
    stageId: null,
    nextChangeDate: todayCultureDate(),
    type,
    onHoldExpiryDate: null,
    comment: null,
    closedUserId: 0,
    studentsSelected: [],
  }
}

export function MovePanel({
  open,
  onOpenChange,
  workflowId,
  workflowType,
  studentIds,
  stages,
  onSaved,
}: MovePanelProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canHold = profile.can(EDIT_HOLD)
  const baseline = useMemo(() => emptyAction(workflowId, workflowType), [workflowId, workflowType])
  const resetKey = `${workflowId}:${workflowType}`
  const [draftState, setDraftState] = useState<{ source: string; values: WorkflowActionDto } | null>(null)
  const draft = draftState?.source === resetKey ? draftState.values : baseline
  const setDraft = (update: WorkflowActionDto | ((current: WorkflowActionDto) => WorkflowActionDto)) => {
    setDraftState({ source: resetKey, values: typeof update === 'function' ? update(draft) : update })
  }
  const [busy, setBusy] = useState(false)
  const [errorState, setErrorState] = useState<{ source: string; value: string | null } | null>(null)
  const error = errorState?.source === resetKey ? errorState.value : null
  const setError = (value: string | null) => setErrorState({ source: resetKey, value })
  const [submittedKey, setSubmittedKey] = useState<string | null>(null)
  const stageOptions = useMemo(() => moveStageOptions(stages), [stages])
  // seats-admin-workflow-student.html:881-883 _toggleDialog clears the modal, so a reopen starts clean.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDraftState(null)
      setErrorState(null)
      setSubmittedKey(null)
    }
    onOpenChange(next)
  }

  // Recomputed every render, so a message disappears as soon as the value becomes valid.
  const datePattern = shortDatePattern()
  const invalidDate = `${EN.invalidDate} ${datePattern}.`
  const validation = validateMove(
    draft.stageId,
    studentIds.length,
    { noStage: t('NoStageSelected'), noStudents: t('NoStudentsSelected'), invalidDate },
    draft,
  )
  const showErrors = submittedKey === resetKey
  const stageError = showErrors ? validation.stage : null
  const selectionError = showErrors ? validation.selection : null
  const nextDateError = showErrors ? validation.nextChangeDate : null
  const holdDateError = showErrors ? validation.onHoldExpiryDate : null

  // seats-admin-workflow-student.html:693-696: both pickers start on today; the hold date appears filled.
  const toggleHold = (checked: boolean) =>
    setDraft(current => ({
      ...current,
      isOnHold: checked,
      onHoldExpiryDate: checked && !current.onHoldExpiryDate ? todayCultureDate() : current.onHoldExpiryDate,
    }))

  const save = async () => {
    if (hasMoveErrors(validation)) {
      setSubmittedKey(resetKey)
      setError(null)
      return
    }
    setSubmittedKey(null)
    setBusy(true)
    setError(null)
    try {
      await updateWorkflowActions({
        ...draft,
        workflowId,
        type: workflowType,
        studentsSelected: [...studentIds],
        onHoldExpiryDate: draft.isOnHold ? draft.onHoldExpiryDate : null,
      })
      onSaved()
      handleOpenChange(false)
    } catch (caught) {
      setError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={event => event.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-white shadow-dialog outline-none data-[state=open]:animate-slide-in motion-reduce:animate-none"
        >
          <div className={cn('relative flex items-center gap-2.5 px-4 py-2.5', NAV_BAND)}>
            <NavBandGlow />
            <span className={cn('grid size-7 shrink-0 place-items-center', NAV_ICON_BOX)}>
              <ArrowRight aria-hidden className="size-4" />
            </span>
            <DialogPrimitive.Title className="min-w-0 flex-1 text-[14.5px] leading-[19px] font-bold tracking-[-.005em] text-white">
              {t('Move')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              type="button"
              aria-label={t('Close')}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-white/85 transition-[background-color,color,rotate] duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X aria-hidden className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
            {error ? (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            ) : null}
            {selectionError ? (
              <p
                role="alert"
                className="animate-rise-in rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 motion-reduce:animate-none"
              >
                {selectionError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="move-stage">{t('MoveStage')}</Label>
              <Select
                value={draft.stageId ? String(draft.stageId) : ''}
                onValueChange={value => setDraft(current => ({ ...current, stageId: Number(value) }))}
              >
                <SelectTrigger
                  id="move-stage"
                  aria-label={t('MoveStage')}
                  aria-invalid={stageError ? true : undefined}
                  aria-describedby={stageError ? 'move-stage-error' : undefined}
                >
                  <SelectValue placeholder={t('Select')} />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map(stage => (
                    <SelectItem key={stage.id ?? stage.name} value={String(stage.id)}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stageError ? (
                <p
                  id="move-stage-error"
                  role="alert"
                  className="animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
                >
                  {stageError}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is-on-hold"
                checked={draft.isOnHold}
                disabled={!canHold}
                label={t('IsOnHold')}
                onCheckedChange={toggleHold}
              />
              {/* The switch carries the accessible name; this copy is for sighted users only. */}
              <span aria-hidden className="text-[13.5px] leading-5 font-semibold text-slate-800">
                {t('IsOnHold')}
              </span>
            </div>
            {draft.isOnHold ? (
              <div className="space-y-2">
                <Label htmlFor="on-hold-expiry">{t('OnHoldExpiryDate')}</Label>
                <Input
                  id="on-hold-expiry"
                  value={draft.onHoldExpiryDate ?? ''}
                  placeholder={datePattern}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={holdDateError ? true : undefined}
                  aria-describedby={holdDateError ? 'on-hold-expiry-error' : undefined}
                  onChange={event =>
                    setDraft(current => ({ ...current, onHoldExpiryDate: event.target.value }))
                  }
                />
                {holdDateError ? (
                  <p
                    id="on-hold-expiry-error"
                    role="alert"
                    className="animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
                  >
                    {holdDateError}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="next-check-date">{t('NextCheckDate')}</Label>
              <Input
                id="next-check-date"
                value={draft.nextChangeDate ?? ''}
                placeholder={datePattern}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={nextDateError ? true : undefined}
                aria-describedby={nextDateError ? 'next-check-date-error' : undefined}
                onChange={event => setDraft(current => ({ ...current, nextChangeDate: event.target.value }))}
              />
              {nextDateError ? (
                <p
                  id="next-check-date-error"
                  role="alert"
                  className="animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
                >
                  {nextDateError}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="move-comment">{t('Comment')}</Label>
              <Textarea
                id="move-comment"
                value={draft.comment ?? ''}
                onChange={event => setDraft(current => ({ ...current, comment: event.target.value }))}
                className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border bg-slate-50/80 px-5 py-3">
            <Button type="button" variant="outline" disabled={busy} onClick={() => handleOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {t('Save')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
