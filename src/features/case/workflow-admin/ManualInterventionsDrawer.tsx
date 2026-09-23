'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Hand, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  Button,
  Checkbox,
  ConfirmDialog,
  DelayedLoading,
  ErrorState,
  Input,
  Label,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from '@/shared/ui/nav-band'
import type { CfcManualInterventionDto, CfcManualInterventionStepDto } from '@/types/case'
import { FormDialog } from '@/features/settings/shared/FormDialog'
import { FRAME_EN } from '@/features/settings/shared/SettingsFrame'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PAGER_MIN_ROWS,
  nextSortState,
  type SortDirection,
} from '@/features/settings/shared/list-model'
import { SettingsTable, type TableColumn } from '@/features/settings/shared/SettingsTable'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { Textarea } from '@/shared/ui/Textarea'
import {
  createManualIntervention,
  deleteManualIntervention,
  fetchManualIntervention,
  fetchManualInterventions,
  fetchManualInterventionTypeOptions,
  fetchWorkflowStagesWithManualInterventionRelation,
  validateDeleteStepAction,
} from '../case-api'

const ACCESS = { item: PermissionItem.AdminCfcStudentManualIntervention, action: PermissionAction.Access }
const ADD = { item: PermissionItem.AdminCfcStudentManualIntervention, action: PermissionAction.Add }
const DELETE = { item: PermissionItem.AdminCfcStudentManualIntervention, action: PermissionAction.Delete }
const EDIT = { item: PermissionItem.AdminCfcStudentManualIntervention, action: PermissionAction.Edit }

const TEXT = {
  ManualInterventions: 'Manual Interventions',
  Add: 'Add',
  Edit: 'Edit',
  Delete: 'Delete',
  Save: 'Save',
  Cancel: 'Cancel',
  Close: 'Close',
  Name: 'Name',
  Description: 'Description',
  Duration: 'Duration',
  StudentsCanCreate: 'Students Can Create',
  Yes: 'Yes',
  No: 'No',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Case: 'Case',
  Steps: 'Steps',
  Stages: 'Stages',
  Type: 'Type',
  Select: 'Select',
  First: 'First',
  Last: 'Last',
  InstanceRestriction: 'Instance Restriction',
  LifetimeSingleInstance: 'Lifetime Single Instance',
  NoConcurrency: 'No Concurrency',
  NoLimitations: 'No Limitations',
  RequiredMessage: 'This field is required.',
  StepsEmpty: 'At least one step is required.',
  StepExists: 'A step with the same details already exists.',
  SavedSuccess: 'Saved successfully.',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  ErrorRetrieveWorkflow: 'There was an error loading manual interventions.',
  TheStepIsInUseAndCanNotBeDeleted: 'The step is in use and cannot be deleted.',
  TheStepNameWillBeUpdatedForAllHistoricalRecordsDoYouWantToProceed:
    'The step name will be updated for all historical records. Do you want to proceed?',
  Confirm: 'Confirm',
  ManualInterventionStep: 'Manual Intervention Step',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  SelectAll: 'Select All',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
} as const

const EN = {
  noItems: 'There are no manual interventions to show.',
  selectRow: (name: string) => `Select ${name}`,
  stepNameRequired: 'Enter a step name.',
  stepTypeRequired: 'Select a step type.',
  stepDurationRequired: 'Enter a duration.',
  stepDescriptionRequired: 'Enter a step description.',
  nameRequired: 'Enter a name.',
  durationRequired: 'Enter a duration.',
  descriptionRequired: 'Enter a description.',
} as const

type InterventionErrors = Partial<Record<'name' | 'duration' | 'description', string>>

// …manual-interventions-create.html:391 rejects a blank duration; the typed text is what is checked.
export function interventionErrorsFor(
  form: CfcManualInterventionDto,
  durationText: string,
): InterventionErrors {
  const errors: InterventionErrors = {}
  if (!form.name?.trim()) errors.name = EN.nameRequired
  if (!durationText.trim()) errors.duration = EN.durationRequired
  if (!form.description?.trim()) errors.description = EN.descriptionRequired
  return errors
}

const FIELD_ERROR_CLASS = 'text-xs text-destructive'

const fieldA11y = (error: string | undefined, id: string) =>
  error ? { 'aria-invalid': true, 'aria-describedby': id } : {}

type StepErrors = Partial<Record<'name' | 'type' | 'duration' | 'description', string>>

// Same required checks as before, reported per field (requirements 8.1 and 8.2).
export function stepErrorsFor(draft: StepDraft): StepErrors {
  const errors: StepErrors = {}
  if (!draft.name?.trim()) errors.name = EN.stepNameRequired
  if (!draft.type) errors.type = EN.stepTypeRequired
  if (!draft.durationText.trim()) errors.duration = EN.stepDurationRequired
  if (!draft.description?.trim()) errors.description = EN.stepDescriptionRequired
  return errors
}

type ManualInterventionsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: number
}

// …manual-interventions-step-create.html:192,280: a new step keeps id 0 until the service numbers it, so the
// list is keyed by a client key and never by id.
export type StepDraft = CfcManualInterventionStepDto & {
  key: string
  durationText: string
  typeDescription?: string | null
}

let stepKeySeed = 0
export function newStepKey(): string {
  stepKeySeed += 1
  return `new:${stepKeySeed}`
}

export function toStepDraft(step: CfcManualInterventionStepDto, typeDescription?: string | null): StepDraft {
  return {
    ...step,
    key: step.id > 0 ? `id:${step.id}` : newStepKey(),
    durationText: String(step.duration ?? ''),
    typeDescription: typeDescription ?? String(step.type),
  }
}

function toStepBody(draft: StepDraft): CfcManualInterventionStepDto {
  return {
    id: draft.id,
    name: draft.name,
    description: draft.description,
    duration: Number(draft.durationText),
    type: draft.type,
  }
}
type FormTab = 'case' | 'steps' | 'stages'

function SideDrawer({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  closeLabel: string
  children: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={event => event.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-border bg-white shadow-dialog outline-none data-[state=open]:animate-slide-in motion-reduce:animate-none"
        >
          <div className={cn('relative flex items-center gap-2.5 px-4 py-2.5', NAV_BAND)}>
            <NavBandGlow />
            <span className={cn('grid size-7 shrink-0 place-items-center', NAV_ICON_BOX)}>
              <Hand aria-hidden className="size-4" />
            </span>
            <DialogPrimitive.Title className="min-w-0 flex-1 text-[14.5px] leading-[19px] font-bold break-words tracking-[-.005em] text-white">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              type="button"
              aria-label={closeLabel}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-white/85 transition-[background-color,color,rotate] duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X aria-hidden className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function emptyForm(workflowId: number): CfcManualInterventionDto {
  return {
    id: 0,
    name: '',
    description: '',
    duration: 0,
    cfcWorkflowId: workflowId,
    cfcInstanceRestrictionTypeId: 1,
    studentsCanCreate: false,
    steps: [],
    stages: [],
  }
}

export function ManualInterventionsDrawer({
  open,
  onOpenChange,
  workflowId,
}: ManualInterventionsDrawerProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canAdd = profile.can(ADD)
  const canDelete = profile.can(DELETE)
  const canEdit = profile.can(EDIT)

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  // …manual-interventions.html:426-429: sortCol / sortDir start empty until a header is clicked.
  const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({
    column: '',
    direction: 'asc',
  })
  const [selected, setSelected] = useState<ReadonlySet<number>>(() => new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<CfcManualInterventionDto>(() => emptyForm(workflowId))
  const [durationText, setDurationText] = useState('')
  const [steps, setSteps] = useState<StepDraft[]>([])
  const [stageIds, setStageIds] = useState<ReadonlySet<number>>(() => new Set())
  const [tab, setTab] = useState<FormTab>('case')
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formAttempted, setFormAttempted] = useState(false)
  const [listNotice, setListNotice] = useState<string | null>(null)
  const [stepDialogOpen, setStepDialogOpen] = useState(false)
  const [stepDraft, setStepDraft] = useState<StepDraft | null>(null)
  const [stepConfirm, setStepConfirm] = useState<StepDraft | null>(null)
  const [stepAttempted, setStepAttempted] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [selectedSteps, setSelectedSteps] = useState<ReadonlySet<string>>(() => new Set())

  const queryKey = `${workflowId}:${pageIndex}:${pageSize}:${sort.column}:${sort.direction}`
  const loadList = useCallback(
    (signal: AbortSignal) =>
      fetchManualInterventions(
        {
          workflowId,
          pageNumber: pageIndex,
          pageSize,
          sortCol: sort.column,
          sortDir: sort.column ? sort.direction : '',
        },
        signal,
      ),
    [workflowId, pageIndex, pageSize, sort.column, sort.direction],
  )
  const read = useApiRead(open ? `manual-interventions-${queryKey}` : null, loadList)
  const typeOptionsRead = useApiRead(
    formOpen ? 'manual-intervention-step-types' : null,
    fetchManualInterventionTypeOptions,
  )
  const stagesRead = useApiRead(formOpen ? `manual-intervention-stages-${workflowId}` : null, signal =>
    fetchWorkflowStagesWithManualInterventionRelation(workflowId, signal),
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelected(new Set())
      setFormOpen(false)
      setListNotice(null)
      setConfirmDelete(false)
    }
    onOpenChange(nextOpen)
  }

  const rows = read.data?.grid?.items ?? []
  const total = Math.max(read.data?.grid?.totalRowCount ?? 0, pageIndex * pageSize + rows.length)
  const hideStudentsCanCreate = read.data ? !read.data.hasSubscriptionAccess : true

  const resetForm = useCallback(() => {
    setForm(emptyForm(workflowId))
    setDurationText('')
    setSteps([])
    setStageIds(new Set())
    setTab('case')
    setFormError(null)
    setFormAttempted(false)
    setSelectedSteps(new Set())
    setStepDialogOpen(false)
    setStepDraft(null)
  }, [workflowId])

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = useCallback(
    async (row: CfcManualInterventionDto) => {
      resetForm()
      setFormBusy(true)
      try {
        const detail = await fetchManualIntervention(row.id)
        setForm({
          ...detail,
          cfcWorkflowId: workflowId,
          steps: detail.steps ?? [],
          stages: detail.stages ?? [],
        })
        setDurationText(String(detail.duration ?? ''))
        setSteps((detail.steps ?? []).map(step => toStepDraft(step)))
        setStageIds(new Set(detail.stages ?? []))
        setFormOpen(true)
      } catch (caught) {
        setListNotice(saveFailureMessage(toApiError(caught), t('ErrorRetrieveWorkflow')))
      } finally {
        setFormBusy(false)
      }
    },
    [resetForm, t, workflowId],
  )

  const openStepDialog = (draft: StepDraft) => {
    setStepAttempted(false)
    setStepError(null)
    setStepDraft(draft)
    setStepDialogOpen(true)
  }

  // Requirements 8.1: after the first Save, step errors follow the current values.
  const stepShown: StepErrors = stepAttempted && stepDraft ? stepErrorsFor(stepDraft) : {}
  // Requirement 8.1: after the first Save, form errors follow the current values.
  const formShown: InterventionErrors = formAttempted ? interventionErrorsFor(form, durationText) : {}
  const stepsMissing = formAttempted && steps.length === 0

  const confirmDeleteRows = async () => {
    if (!canDelete || selected.size === 0) return
    setDeleting(true)
    try {
      await deleteManualIntervention([...selected])
      setSelected(new Set())
      setListNotice(t('AlertDeleteSuccessDefault'))
      read.reload()
    } catch (caught) {
      const error = toApiError(caught)
      setListNotice(
        error.kind === 'blocked'
          ? FRAME_EN.safeMode
          : error.kind === 'http' && error.status === 400 && error.serverMessage
            ? error.serverMessage
            : t('AlertDeleteErrorDefault'),
      )
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const saveForm = async () => {
    const canSave = form.id > 0 ? canEdit : canAdd
    if (!canSave) return
    setFormAttempted(true)
    setFormError(null)
    if (Object.keys(interventionErrorsFor(form, durationText)).length > 0) {
      setTab('case')
      return
    }
    if (steps.length === 0) return
    setFormBusy(true)
    setFormError(null)
    try {
      await createManualIntervention({
        ...form,
        duration: Number(durationText),
        cfcWorkflowId: workflowId,
        steps: steps.map(toStepBody),
        stages: [...stageIds],
      })
      setFormOpen(false)
      resetForm()
      setListNotice(t('SavedSuccess'))
      read.reload()
    } catch (caught) {
      setFormError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setFormBusy(false)
    }
  }

  const removeSteps = async () => {
    if (!selectedSteps.size) return
    const existingIds = steps.filter(step => selectedSteps.has(step.key) && step.id > 0).map(step => step.id)
    if (form.id > 0 && existingIds.length > 0) {
      try {
        const blocked = await validateDeleteStepAction(existingIds, form.id)
        if (blocked) {
          setFormError(t('TheStepIsInUseAndCanNotBeDeleted'))
          return
        }
      } catch (caught) {
        setFormError(saveFailureMessage(toApiError(caught), t('AlertDeleteErrorDefault')))
        return
      }
    }
    setSteps(current => current.filter(step => !selectedSteps.has(step.key)))
    setSelectedSteps(new Set())
  }

  const saveStep = (draft: StepDraft) => {
    const duplicate = steps.some(
      step =>
        step.name === draft.name &&
        step.type === draft.type &&
        step.durationText === draft.durationText &&
        step.key !== draft.key,
    )
    if (duplicate) {
      setStepError(t('StepExists'))
      return
    }
    const typeLabel = typeOptionsRead.data?.find(option => option.id === draft.type)?.description
    const next: StepDraft = {
      ...draft,
      duration: Number(draft.durationText),
      typeDescription: typeLabel ?? String(draft.type),
    }
    setSteps(current =>
      current.some(step => step.key === draft.key)
        ? current.map(step => (step.key === draft.key ? next : step))
        : [...current, next],
    )
    setStepDialogOpen(false)
    setStepDraft(null)
    setFormError(null)
  }

  const columns = useMemo((): readonly TableColumn<CfcManualInterventionDto>[] => {
    const base: TableColumn<CfcManualInterventionDto>[] = [
      { key: 'name', label: t('Name'), sortable: true, render: row => row.name },
      { key: 'description', label: t('Description'), sortable: true, render: row => row.description },
      { key: 'duration', label: t('Duration'), sortable: true, render: row => row.duration },
    ]
    if (!hideStudentsCanCreate) {
      base.push({
        key: 'studentsCanCreate',
        label: t('StudentsCanCreate'),
        sortable: true,
        render: row => (row.studentsCanCreate ? t('Yes') : t('No')),
      })
    }
    if (profile.can(ACCESS)) {
      base.push({
        key: 'edit',
        label: t('Edit'),
        render: row => (
          <Button type="button" variant="ghost" size="sm" onClick={() => void openEdit(row)}>
            <Pencil aria-hidden className="size-4" />
            {t('Edit')}
          </Button>
        ),
      })
    }
    return base
  }, [hideStudentsCanCreate, openEdit, profile, t])

  return (
    <>
      <SideDrawer
        open={open}
        onOpenChange={handleOpenChange}
        title={t('ManualInterventions')}
        closeLabel={t('Close')}
      >
        {formOpen ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 border-b border-border pb-3">
              {(['case', 'steps', 'stages'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    tab === key ? 'bg-brand/[0.08] text-brand' : 'text-muted-foreground hover:bg-page',
                  )}
                >
                  {t(key === 'case' ? 'Case' : key === 'steps' ? 'Steps' : 'Stages')}
                </button>
              ))}
            </div>
            {formError ? (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {formError}
              </p>
            ) : null}
            {stepsMissing ? (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {t('StepsEmpty')}
              </p>
            ) : null}
            {tab === 'case' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manual-intervention-name">{t('Name')}</Label>
                  <Input
                    id="manual-intervention-name"
                    maxLength={150}
                    value={form.name ?? ''}
                    onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                    {...fieldA11y(formShown.name, 'manual-intervention-name-error')}
                  />
                  {formShown.name ? (
                    <p id="manual-intervention-name-error" className={FIELD_ERROR_CLASS}>
                      {formShown.name}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-intervention-duration">{t('Duration')}</Label>
                  <Input
                    id="manual-intervention-duration"
                    inputMode="numeric"
                    maxLength={8}
                    value={durationText}
                    onChange={event => setDurationText(event.target.value.replace(/\D/g, ''))}
                    {...fieldA11y(formShown.duration, 'manual-intervention-duration-error')}
                  />
                  {formShown.duration ? (
                    <p id="manual-intervention-duration-error" className={FIELD_ERROR_CLASS}>
                      {formShown.duration}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-intervention-description">{t('Description')}</Label>
                  <Textarea
                    id="manual-intervention-description"
                    maxLength={500}
                    value={form.description ?? ''}
                    onChange={event => setForm(current => ({ ...current, description: event.target.value }))}
                    className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                    {...fieldA11y(formShown.description, 'manual-intervention-description-error')}
                  />
                  {formShown.description ? (
                    <p id="manual-intervention-description-error" className={FIELD_ERROR_CLASS}>
                      {formShown.description}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-intervention-restriction">{t('InstanceRestriction')}</Label>
                  <Select
                    value={String(form.cfcInstanceRestrictionTypeId)}
                    onValueChange={value =>
                      setForm(current => ({ ...current, cfcInstanceRestrictionTypeId: Number(value) }))
                    }
                  >
                    <SelectTrigger id="manual-intervention-restriction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('LifetimeSingleInstance')}</SelectItem>
                      <SelectItem value="2">{t('NoConcurrency')}</SelectItem>
                      <SelectItem value="3">{t('NoLimitations')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!hideStudentsCanCreate ? (
                  <Checkbox
                    checked={form.studentsCanCreate}
                    label={t('StudentsCanCreate')}
                    onCheckedChange={() =>
                      setForm(current => ({ ...current, studentsCanCreate: !current.studentsCanCreate }))
                    }
                  />
                ) : null}
              </div>
            ) : null}
            {tab === 'steps' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      openStepDialog({
                        id: 0,
                        key: newStepKey(),
                        name: '',
                        description: '',
                        duration: 0,
                        durationText: '',
                        type: typeOptionsRead.data?.[0]?.id ?? 0,
                      })
                    }
                  >
                    <Plus aria-hidden className="size-4" />
                    {t('Add')}
                  </Button>
                  {selectedSteps.size > 0 ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void removeSteps()}>
                      <Trash2 aria-hidden className="size-4" />
                      {t('Delete')}
                    </Button>
                  ) : null}
                </div>
                <ul className="overflow-auto rounded-lg border border-border">
                  {steps.map(step => (
                    <li
                      key={step.key}
                      className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedSteps.has(step.key)}
                        label={step.name ?? t('Name')}
                        onCheckedChange={() =>
                          setSelectedSteps(current => {
                            const next = new Set(current)
                            if (next.has(step.key)) next.delete(step.key)
                            else next.add(step.key)
                            return next
                          })
                        }
                      />
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-sm text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        onClick={() => {
                          if (step.id > 0) setStepConfirm(step)
                          else openStepDialog(step)
                        }}
                      >
                        <span className="font-medium">{step.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          {step.typeDescription ?? step.type}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {tab === 'stages' ? (
              <div className="space-y-3">
                {stagesRead.status === 'loading' ? <DelayedLoading active label={t('Loading')} /> : null}
                {stagesRead.status === 'error' ? (
                  <ErrorState
                    message={t('ErrorRetrieveWorkflow')}
                    retryLabel={t('Refresh')}
                    onRetry={stagesRead.reload}
                    error={stagesRead.error}
                  />
                ) : null}
                {stagesRead.status === 'success' ? (
                  <ul className="max-h-64 overflow-auto rounded-lg border border-border">
                    {(stagesRead.data ?? []).map(stage => {
                      const id = stage.id ?? 0
                      return (
                        <li
                          key={id}
                          className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0"
                        >
                          <Checkbox
                            checked={stageIds.has(id)}
                            label={stage.name ?? t('Stages')}
                            onCheckedChange={() =>
                              setStageIds(current => {
                                const next = new Set(current)
                                if (next.has(id)) next.delete(id)
                                else next.add(id)
                                return next
                              })
                            }
                          />
                          <span className="text-sm">{stage.name}</span>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={formBusy}
                onClick={() => {
                  setFormOpen(false)
                  resetForm()
                }}
              >
                {t('Cancel')}
              </Button>
              {(form.id > 0 ? canEdit : canAdd) ? (
                <Button type="button" disabled={formBusy} onClick={() => void saveForm()}>
                  {t('Save')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listNotice ? (
              <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {listNotice}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {canAdd ? (
                <Button type="button" size="sm" onClick={openCreate}>
                  <Plus aria-hidden className="size-4" />
                  {t('Add')}
                </Button>
              ) : null}
              {canDelete && selected.size > 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden className="size-4" />
                  {t('Delete')}
                </Button>
              ) : null}
            </div>
            {/* A bounded height gives the shared table a real viewport, so its row windowing engages. */}
            <div className="flex max-h-[60dvh] min-h-0 flex-col">
              <SettingsTable
                rows={rows}
                columns={columns}
                status={read.status}
                sort={sort}
                onSort={column => setSort(current => nextSortState(current, column))}
                selectable={canDelete}
                selected={selected}
                onToggle={id => {
                  setSelected(current => {
                    const next = new Set(current)
                    if (next.has(id)) next.delete(id)
                    else next.add(id)
                    return next
                  })
                }}
                onTogglePage={() => {
                  const ids = rows.map(row => row.id)
                  const allSelected = ids.every(id => selected.has(id))
                  setSelected(current => {
                    const next = new Set(current)
                    ids.forEach(id => {
                      if (allSelected) next.delete(id)
                      else next.add(id)
                    })
                    return next
                  })
                }}
                onRetry={read.reload}
                error={read.error}
                emptyText={EN.noItems}
                text={{
                  loading: t('Loading'),
                  error: t('ErrorRetrieveWorkflow'),
                  retry: t('Refresh'),
                  selectAll: t('SelectAll'),
                  select: row => EN.selectRow(row.name ?? ''),
                }}
              />
            </div>
            {total >= PAGER_MIN_ROWS ? (
              <Pagination
                id="manual-interventions-pager"
                pageIndex={pageIndex}
                pageSize={pageSize}
                total={total}
                pageSizes={PAGE_SIZES}
                labels={{
                  itemsPerPage: t('NumberOfItemsPerPage'),
                  of: t('Of'),
                  first: t('First'),
                  previous: t('Previous'),
                  next: t('Next'),
                  last: t('Last'),
                }}
                onPageChange={setPageIndex}
                onPageSizeChange={size => {
                  setPageSize(size)
                  setPageIndex(0)
                }}
              />
            ) : null}
          </div>
        )}
      </SideDrawer>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('Delete')}
        message={t('DeleteConfirmationMsg')}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        pending={deleting}
        onConfirm={() => void confirmDeleteRows()}
      />

      <ConfirmDialog
        open={stepConfirm !== null}
        onOpenChange={open => {
          if (!open) setStepConfirm(null)
        }}
        title={t('Edit')}
        message={t('TheStepNameWillBeUpdatedForAllHistoricalRecordsDoYouWantToProceed')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        destructive={false}
        onConfirm={() => {
          if (stepConfirm) openStepDialog(stepConfirm)
          setStepConfirm(null)
        }}
      />

      {stepDraft ? (
        <FormDialog
          open={stepDialogOpen}
          onOpenChange={open => {
            if (!open) {
              setStepDialogOpen(false)
              setStepDraft(null)
            }
          }}
          icon={Hand}
          title={t('ManualInterventionStep')}
          closeLabel={t('Close')}
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStepDialogOpen(false)
                  setStepDraft(null)
                }}
              >
                {t('Cancel')}
              </Button>
              <Button type="submit">{t('Save')}</Button>
            </>
          }
          onSubmit={() => {
            setStepAttempted(true)
            if (Object.keys(stepErrorsFor(stepDraft)).length > 0) return
            saveStep(stepDraft)
          }}
        >
          <div className="space-y-4 p-5">
            {/* Errors live inside the step dialog; the drawer banner sits behind this modal. */}
            {stepError ? (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {stepError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="step-name">{t('Name')}</Label>
              <Input
                id="step-name"
                maxLength={150}
                aria-invalid={stepShown.name ? true : undefined}
                aria-describedby={stepShown.name ? 'step-name-error' : undefined}
                value={stepDraft.name ?? ''}
                onChange={event =>
                  setStepDraft(current => (current ? { ...current, name: event.target.value } : current))
                }
              />
              {stepShown.name ? (
                <p id="step-name-error" className="text-xs text-destructive">
                  {stepShown.name}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-type">{t('Type')}</Label>
              <Select
                value={String(stepDraft.type)}
                disabled={stepDraft.id > 0}
                onValueChange={value =>
                  setStepDraft(current => (current ? { ...current, type: Number(value) } : current))
                }
              >
                <SelectTrigger
                  id="step-type"
                  aria-invalid={stepShown.type ? true : undefined}
                  aria-describedby={stepShown.type ? 'step-type-error' : undefined}
                >
                  <SelectValue placeholder={t('Select')} />
                </SelectTrigger>
                <SelectContent>
                  {(typeOptionsRead.data ?? []).map(option => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stepShown.type ? (
                <p id="step-type-error" className="text-xs text-destructive">
                  {stepShown.type}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-duration">{t('Duration')}</Label>
              <Input
                id="step-duration"
                aria-invalid={stepShown.duration ? true : undefined}
                aria-describedby={stepShown.duration ? 'step-duration-error' : undefined}
                inputMode="numeric"
                maxLength={8}
                value={stepDraft.durationText}
                onChange={event =>
                  setStepDraft(current =>
                    current ? { ...current, durationText: event.target.value.replace(/\D/g, '') } : current,
                  )
                }
              />
              {stepShown.duration ? (
                <p id="step-duration-error" className="text-xs text-destructive">
                  {stepShown.duration}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="step-description">{t('Description')}</Label>
              <Textarea
                id="step-description"
                maxLength={500}
                aria-invalid={stepShown.description ? true : undefined}
                aria-describedby={stepShown.description ? 'step-description-error' : undefined}
                value={stepDraft.description ?? ''}
                onChange={event =>
                  setStepDraft(current =>
                    current ? { ...current, description: event.target.value } : current,
                  )
                }
                className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
              />
              {stepShown.description ? (
                <p id="step-description-error" className="text-xs text-destructive">
                  {stepShown.description}
                </p>
              ) : null}
            </div>
          </div>
        </FormDialog>
      ) : null}
    </>
  )
}
