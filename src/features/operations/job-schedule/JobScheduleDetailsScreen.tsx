'use client'

import {
  CalendarClock,
  Check,
  MapPin,
  Save,
  SlidersHorizontal,
  Timer,
  Undo2,
  Workflow,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { JOB_SCHEDULE_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { Button, Input } from '@/shared/ui'
import { ADD_BUTTON_CLASS, CANCEL_BUTTON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import type { JobDetailsDto, JobOptionDto } from '@/types/operations'
import { setFlash } from '@/features/settings/shared/flash'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import { SettingsCard, SettingsField } from '@/features/settings/shared/SettingsCard'
import {
  FormStatusPill,
  FRAME_EN,
  SettingsBody,
  SettingsGate,
  SettingsLayout,
  useSaveShortcut,
} from '@/features/settings/shared/SettingsFrame'
import { ToggleRow } from '@/features/settings/shared/ToggleRow'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { useOperationsArea } from '../operations-area'
import { describeCron, estimateNextCronRuns, formatCronRun, parseCron } from './cron'
import {
  LOOKUPS,
  lookupQuery,
  showsAcademic,
  showsAttendance,
  showsDateRange,
  showsLocation,
  showsMonitor,
  toJobBody,
  toJobDraft,
  validateJob,
  withVisibleDefaults,
  type JobDraft,
  type JobError,
  type LookupField as LookupName,
} from './job-schedule-form'
import { FieldSelect } from './FieldSelect'
import { LookupField } from './LookupField'
import { ScheduleBuilder } from './ScheduleBuilder'
import { Textarea } from '@/shared/ui/Textarea'

const ITEM = PermissionItem.JobSchedule
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const ADD = { item: ITEM, action: PermissionAction.Add }
const EDIT = { item: ITEM, action: PermissionAction.Edit }

// Keys from Views/JobSchedule/Details.cshtml.
const TEXT = {
  Name: 'Name',
  Type: 'Type',
  Enabled: 'Enabled',
  Description: 'Description',
  Frequency: 'Frequency',
  Advance: 'Advance',
  CronExpression: 'Cron Expression',
  SendToTutor: 'Send to Tutor',
  Parameters: 'Parameters',
  DateRange: 'Date Range',
  School: 'School',
  Course: 'Course',
  Module: 'Module',
  Site: 'Site',
  Building: 'Building',
  Room: 'Room',
  PercentageAttended: 'Percentage Attended',
  Minutes: 'Minutes',
  Recipients: 'Recipients',
  Default: 'Default',
  All: 'All',
  Save: 'Save',
  Cancel: 'Cancel',
  FieldsWithInputValidations: 'There are fields with input validation errors.',
  CronExpressionIncorrect: 'Cron expression is incorrect.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
} as const

// JobScheduleApiController.cs:222 returns at most 100 modules and says nothing about the cut.
const MODULE_OPTION_CAP = 100

const EN = {
  newJob: 'New job',
  job: 'Job',
  jobHint: 'What runs and whether it is switched on',
  schedule: 'Schedule',
  scheduleHint: 'When the job runs',
  scope: 'Academic scope',
  scopeHint: 'Leave empty to include everything',
  location: 'Location',
  locationHint: 'Leave empty to include every room',
  monitor: 'Monitoring',
  monitorHint: 'Look-back time and who receives the report',
  attendanceHint: 'Report range and attendance filter',
  generateEmpty: 'Generate if no results',
  invalidEmail: 'Invalid E-mail',
  specialCharacters: 'Special characters are not allowed .',
  minutesRange: 'Minutes must be between 1 and 60.',
  numberRequired: 'Enter a number.',
  recipientsPlaceholder: 'Ex: email1, email2',
  clear: 'Clear',
  noResults: 'No matches',
  reportsPermissionRequired:
    'Building and room options require Reports access. This is a legacy permission quirk (LB-051).',
  cappedResults: 'Only the first 100 modules are listed. Keep typing to narrow the search.',
  percent: '%',
  leaveConfirm: 'You have unsaved changes. Leave this page?',
  cronRequired: 'Enter a schedule.',
  summary: 'Summary',
  summaryHint: 'Live preview of this job',
  nextRuns: 'Next runs (estimate, your local time)',
  enabledYes: 'Yes',
  enabledNo: 'No',
  scopeAll: 'All',
  scopeAllBracket: '[All]',
  none: '-',
  lookupDescriptionError: 'Unable to load this saved selection.',
  notSet: 'Not set',
  noRecipients: 'No recipients yet',
  usingDefault: '(default)',
  attendanceFilter: 'Attendance filter',
  comparison: 'comparison',
  lookBack: 'Look-back',
  minutesUnit: 'min',
  jobId: 'Job ID',
  newJobId: 'Not saved yet',
  retry: 'Retry',
  retrying: 'Retrying…',
} as const

const LOOKUP_LABEL: Record<LookupName, keyof typeof TEXT> = {
  school: 'School',
  course: 'Course',
  module: 'Module',
  site: 'Site',
  building: 'Building',
  room: 'Room',
}

const loadDetails = (id: number, signal: AbortSignal) =>
  api.get<JobDetailsDto>(`JobScheduleApi/${id > 0 ? id : 0}`, { signal })

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <div className="mt-0.5 text-[13px] leading-[17px] text-slate-800">{children}</div>
    </div>
  )
}

function AnimatedCard({ visible, children }: { visible: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-premium motion-reduce:transition-none',
        visible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
      aria-hidden={!visible}
    >
      <div className="overflow-hidden">{visible ? children : null}</div>
    </div>
  )
}

export function JobScheduleDetailsScreen({ id }: { id: number }) {
  return (
    <SettingsGate access={ACCESS}>
      <JobScheduleDetailsWorkspace id={id} />
    </SettingsGate>
  )
}

type Descriptions = Record<LookupName, string>
const NO_DESCRIPTIONS: Descriptions = { school: '', course: '', module: '', site: '', building: '', room: '' }
type DescriptionErrors = Partial<Record<LookupName, boolean>>

function JobScheduleDetailsWorkspace({ id }: { id: number }) {
  const t = useScreenText(TEXT)
  const { area, t: areaText } = useOperationsArea()
  const router = useRouter()
  const profile = useProfile()
  const canSave = profile.can(id > 0 ? EDIT : ADD)
  const load = useCallback((signal: AbortSignal) => loadDetails(id, signal), [id])
  const read = useApiRead(`operations-job-schedule:${id}`, load)
  const details = read.data

  const initial = useMemo(
    () => (details ? withVisibleDefaults(toJobDraft(details.detail), details) : null),
    [details],
  )
  const [draft, setDraft] = useState<{ source: JobDetailsDto; job: JobDraft; advanced: boolean } | null>(null)
  const current = draft && draft.source === details ? draft : null
  const job = current?.job ?? initial
  // jobScheduleDetailsController.js:666-686: expressions the builder cannot show open in Advance.
  const advanced = current?.advanced ?? (initial ? parseCron(initial.cronExpression) === null : false)
  const dirty = current !== null && JSON.stringify(current.job) !== JSON.stringify(initial)
  // A description that arrives late is only applied when the field still holds the id it was asked for.
  const jobRef = useRef(job)
  useEffect(() => {
    jobRef.current = job
  }, [job])
  useLeaveGuard(dirty, EN.leaveConfirm)

  const [descriptions, setDescriptions] = useState<{
    source: JobDetailsDto | null
    values: Descriptions
    loaded: Descriptions
  }>({
    source: null,
    values: NO_DESCRIPTIONS,
    loaded: NO_DESCRIPTIONS,
  })
  const texts = descriptions.source === details ? descriptions.values : NO_DESCRIPTIONS
  const [descriptionErrors, setDescriptionErrors] = useState<{
    source: JobDetailsDto | null
    fields: DescriptionErrors
  }>({ source: null, fields: {} })
  const activeDescriptionErrors = descriptionErrors.source === details ? descriptionErrors.fields : {}
  // One retry in flight per field, so retrying Course never cancels the School retry.
  const [retrying, setRetrying] = useState<Partial<Record<LookupName, boolean>>>({})
  const retryControllers = useRef<Partial<Record<LookupName, AbortController>>>({})

  // After the first Save attempt errors are recomputed from the current values on every change.
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const loadDescription = useCallback(
    (
      source: JobDetailsDto,
      lookup: (typeof LOOKUPS)[number],
      signal: AbortSignal,
      onSettled?: () => void,
    ) => {
      const value = source.detail[lookup.key]
      if (typeof value !== 'number' || value <= 0) return
      void api
        .get<string | null>(`JobScheduleApi/Get${lookup.controller}Description`, {
          query: { id: value },
          signal,
        })
        .then(name => {
          if (signal.aborted) return
          // The user may have picked another option while this was in flight; that choice wins.
          const current = jobRef.current
          if (current && current[lookup.key] !== value) return
          setDescriptions(previous => {
            const same = previous.source === source
            return {
              source,
              values: { ...(same ? previous.values : NO_DESCRIPTIONS), [lookup.field]: name ?? '' },
              loaded: { ...(same ? previous.loaded : NO_DESCRIPTIONS), [lookup.field]: name ?? '' },
            }
          })
          setDescriptionErrors(previous => ({
            source,
            fields: { ...(previous.source === source ? previous.fields : {}), [lookup.field]: false },
          }))
          onSettled?.()
        })
        .catch(() => {
          if (signal.aborted) return
          setDescriptionErrors(previous => ({
            source,
            fields: { ...(previous.source === source ? previous.fields : {}), [lookup.field]: true },
          }))
          onSettled?.()
        })
    },
    [],
  )

  // computed() in the legacy controller loads the name of each saved lookup id.
  useEffect(() => {
    if (!details) return
    const controller = new AbortController()
    for (const lookup of LOOKUPS) loadDescription(details, lookup, controller.signal)
    return () => controller.abort()
  }, [details, loadDescription])

  useEffect(() => {
    const controllers = retryControllers
    return () => Object.values(controllers.current).forEach(controller => controller?.abort())
  }, [])

  const retryDescription = (field: LookupName) => {
    const lookup = LOOKUPS.find(item => item.field === field)
    if (!details || !lookup || retrying[field]) return
    retryControllers.current[field]?.abort()
    const controller = new AbortController()
    retryControllers.current[field] = controller
    setRetrying(previous => ({ ...previous, [field]: true }))
    loadDescription(details, lookup, controller.signal, () => {
      setRetrying(previous => ({ ...previous, [field]: false }))
      // The alert holding the button disappears on success, so focus goes back to the field.
      document.getElementById(`job-${field}`)?.focus()
    })
  }

  const update = (change: Partial<JobDraft>, nextAdvanced = advanced) => {
    if (!details || !job) return
    const merged = { ...job, ...change }
    setDraft({
      source: details,
      job: change.typeId === undefined ? merged : withVisibleDefaults(merged, details),
      advanced: nextAdvanced,
    })
  }

  const loaded = descriptions.source === details ? descriptions.loaded : NO_DESCRIPTIONS
  const clearDescriptionError = (field: LookupName) =>
    setDescriptionErrors(previous =>
      previous.fields[field] ? { ...previous, fields: { ...previous.fields, [field]: false } } : previous,
    )

  const setText = (field: LookupName, value: string) => {
    clearDescriptionError(field)
    setDescriptions({ source: details ?? null, values: { ...texts, [field]: value }, loaded })
  }

  const discard = () => {
    setDraft(null)
    setDescriptions(previous => ({ ...previous, values: previous.loaded }))
    setSubmitted(false)
  }

  const save = async () => {
    if (!job || saving || !canSave) return
    const failure = validateJob(job)
    setSubmitted(true)
    if (failure) {
      const message =
        failure.kind === 'email'
          ? EN.invalidEmail
          : failure.kind === 'cron'
            ? t('CronExpressionIncorrect')
            : failure.kind === 'required'
              ? t('CronExpressionIncorrect')
              : failure.kind === 'range'
                ? EN.minutesRange
                : failure.kind === 'number'
                  ? EN.numberRequired
                  : t('FieldsWithInputValidations')
      setNotice({ id: Date.now(), tone: 'error', message })
      const target =
        document.getElementById(`job-${failure.field}-expression`) ??
        document.getElementById(`job-${failure.field}`)
      target?.focus()
      return
    }
    setSaving(true)
    try {
      await api.post<void>('JobScheduleApi/', { body: toJobBody(job) })
      setFlash(t('AlertSaveSucceededDefault'))
      router.push(JOB_SCHEDULE_ROUTE)
    } catch (caught) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')),
      })
      setSaving(false)
    }
  }
  useSaveShortcut(canSave && job !== null, save)

  const locked = !canSave || saving
  const error: JobError | null = submitted && job ? validateJob(job) : null
  const fieldError = (field: JobError['field']) => {
    if (error?.field !== field) return null
    if (error.kind === 'email') return EN.invalidEmail
    if (error.kind === 'cron') return t('CronExpressionIncorrect')
    if (error.kind === 'required') return EN.cronRequired
    if (error.kind === 'range') return EN.minutesRange
    if (error.kind === 'number') return EN.numberRequired
    if (error.kind === 'special') return EN.specialCharacters
    return t('FieldsWithInputValidations')
  }
  const title = id > 0 ? initial?.description || initial?.typeName || areaText('JobSchedule') : EN.newJob
  const allPlaceholder = `[${t('All')}]`

  const lookup = (field: LookupName) => {
    if (!job) return null
    const entry = LOOKUPS.find(item => item.field === field)
    if (!entry) return null
    const key = entry.key as 'schoolId'
    return (
      <SettingsField key={field} htmlFor={`job-${field}`} label={t(LOOKUP_LABEL[field])}>
        <LookupField
          id={`job-${field}`}
          label={t(LOOKUP_LABEL[field])}
          placeholder={allPlaceholder}
          clearLabel={EN.clear}
          noResults={EN.noResults}
          permissionDeniedMessage={
            field === 'building' || field === 'room' ? EN.reportsPermissionRequired : undefined
          }
          cap={field === 'module' ? MODULE_OPTION_CAP : undefined}
          cappedMessage={field === 'module' ? EN.cappedResults : undefined}
          path={`JobScheduleApi/Get${entry.controller}Options`}
          query={text => lookupQuery(field, job, text)}
          filterKey={JSON.stringify(lookupQuery(field, job, ''))}
          describedBy={activeDescriptionErrors[field] ? `job-${field}-lookup-error` : undefined}
          selectedId={job[key]}
          text={texts[field]}
          disabled={locked}
          onTextChange={value => setText(field, value)}
          onSelect={(option: JobOptionDto | null) => {
            clearDescriptionError(field)
            update({ [key]: option ? option.id : null })
            if (option) setText(field, option.description ?? '')
          }}
        />
        {activeDescriptionErrors[field] ? (
          <div
            id={`job-${field}-lookup-error`}
            role="alert"
            className="mt-1.5 flex items-center gap-2 text-xs text-destructive"
          >
            <span>{EN.lookupDescriptionError}</span>
            <button
              type="button"
              disabled={retrying[field]}
              aria-label={`${EN.retry} ${t(LOOKUP_LABEL[field])}`}
              onClick={() => retryDescription(field)}
              className="rounded-sm font-semibold underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
            >
              {retrying[field] ? EN.retrying : EN.retry}
            </button>
          </div>
        ) : null}
      </SettingsField>
    )
  }

  const typeId = job?.typeId ?? 0
  const typeName =
    job?.typeName ??
    details?.jobTypeAvailables?.find(type => type.id === typeId)?.name ??
    details?.jobTypeAvailables?.find(type => type.id === typeId)?.code ??
    ''
  const cronExpression = job?.cronExpression
  const nextRuns = useMemo(
    () => (cronExpression ? estimateNextCronRuns(cronExpression, 3) : []),
    [cronExpression],
  )
  const dateRangeName =
    details?.dateRangeAvailables?.find(option => option.id === job?.dateRangeId)?.description ?? null
  const comparisonName =
    details?.comparisonOperatorAvailables?.find(
      option => String(option.id) === (job?.comparisonOperator ?? ''),
    )?.description ?? null
  const recipientList = (job?.recipients ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
  const minutesValue = job?.minutes.trim() ? job.minutes.trim() : null
  const minutesFallback = job?.minutesDefault === null ? null : String(job?.minutesDefault ?? '')

  const scopeChips = useMemo(() => {
    if (!job) return []
    const chips: { label: string; value: string }[] = []
    const add = (field: LookupName, lookupId: number | null, text: string) => {
      if (typeof lookupId === 'number' && lookupId > 0 && text.trim()) {
        chips.push({ label: t(LOOKUP_LABEL[field]), value: text })
      }
    }
    if (showsAcademic(typeId)) {
      add('school', job.schoolId, texts.school)
      add('course', job.courseId, texts.course)
      add('module', job.moduleId, texts.module)
    }
    if (showsLocation(typeId)) {
      add('site', job.siteId, texts.site)
      add('building', job.buildingId, texts.building)
      add('room', job.roomId, texts.room)
    }
    return chips
  }, [job, texts, t, typeId])

  return (
    <SettingsLayout
      sectionId="job-schedule"
      title={title}
      area={area}
      meta={<FormStatusPill canEdit={canSave} dirty={dirty} />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href={JOB_SCHEDULE_ROUTE} className={CANCEL_BUTTON_CLASS}>
            {t('Cancel')}
          </Link>
          {canSave && job && dirty ? (
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              className={cn(CANCEL_BUTTON_CLASS, 'animate-slide-in motion-reduce:animate-none')}
            >
              <Undo2 aria-hidden className="size-[18px]" />
              {FRAME_EN.discard}
            </button>
          ) : null}
          {canSave && job ? (
            <Button
              onClick={() => void save()}
              loading={saving}
              aria-keyshortcuts="Control+S"
              title={FRAME_EN.shortcut}
              className={ADD_BUTTON_CLASS}
            >
              <Save aria-hidden className="size-[18px]" />
              {t('Save')}
            </Button>
          ) : null}
        </div>
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      <SettingsBody error={read.error} status={read.status} onRetry={read.reload}>
        {details && job ? (
          <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start xl:gap-4">
            <div className="flex min-w-0 flex-col gap-4">
              <SettingsCard icon={Workflow} title={EN.job} hint={EN.jobHint}>
                {job.id !== 0 ? (
                  <SettingsField htmlFor="job-name" label={t('Name')}>
                    <Input
                      id="job-name"
                      value={job.typeName ?? ''}
                      disabled
                      className="h-9 w-full bg-slate-50"
                    />
                  </SettingsField>
                ) : (
                  <SettingsField htmlFor="job-type" label={t('Type')}>
                    <FieldSelect
                      id="job-type"
                      value={String(job.typeId)}
                      disabled={locked}
                      onChange={next => update({ typeId: Number(next) })}
                      options={(details.jobTypeAvailables ?? []).map(type => ({
                        value: String(type.id),
                        label: type.name ?? type.code ?? String(type.id),
                      }))}
                    />
                  </SettingsField>
                )}
                <ToggleRow
                  id="job-enabled"
                  label={t('Enabled')}
                  checked={job.enabled}
                  disabled={locked}
                  onChange={checked => update({ enabled: checked })}
                />
                <ToggleRow
                  id="job-empty-email"
                  label={EN.generateEmpty}
                  checked={job.emptyEmail}
                  disabled={locked}
                  onChange={checked => update({ emptyEmail: checked })}
                />
                <SettingsField
                  htmlFor="job-description"
                  label={t('Description')}
                  error={fieldError('description')}
                >
                  <Textarea
                    id="job-description"
                    value={job.description ?? ''}
                    maxLength={100}
                    rows={2}
                    disabled={locked}
                    aria-invalid={error?.field === 'description' || undefined}
                    aria-describedby={error?.field === 'description' ? 'job-description-error' : undefined}
                    onChange={event => update({ description: event.target.value })}
                    className="field-bloom w-full resize-none rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-[border-color,box-shadow] outline-none hover:border-brand/80 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </SettingsField>
                {showsAttendance(typeId) ? (
                  <ToggleRow
                    id="job-send-tutor"
                    label={t('SendToTutor')}
                    checked={job.sendToTutor === true}
                    disabled={locked}
                    onChange={checked => update({ sendToTutor: checked })}
                  />
                ) : null}
              </SettingsCard>

              <SettingsCard icon={CalendarClock} title={EN.schedule} hint={EN.scheduleHint} delay={60}>
                <div className="px-5 py-4">
                  <p
                    id="job-frequency-label"
                    className="mb-3 text-[13.5px] leading-5 font-semibold text-slate-800"
                  >
                    {t('Frequency')}
                  </p>
                  <ScheduleBuilder
                    id="job-cronExpression"
                    value={job.cronExpression ?? ''}
                    advanced={advanced}
                    advancedLabel={t('Advance')}
                    cronLabel={t('CronExpression')}
                    cronError={fieldError('cronExpression')}
                    disabled={locked}
                    invalid={error?.field === 'cronExpression'}
                    labelledBy="job-frequency-label"
                    onChange={value => update({ cronExpression: value })}
                    onAdvancedChange={(next, cron) =>
                      update(cron === undefined ? {} : { cronExpression: cron }, next)
                    }
                  />
                </div>
              </SettingsCard>

              <AnimatedCard visible={showsDateRange(typeId)}>
                <SettingsCard
                  icon={SlidersHorizontal}
                  title={t('Parameters')}
                  hint={EN.attendanceHint}
                  delay={120}
                >
                  <SettingsField htmlFor="job-date-range" label={t('DateRange')}>
                    <FieldSelect
                      id="job-date-range"
                      value={String(job.dateRangeId)}
                      disabled={locked}
                      onChange={next => update({ dateRangeId: Number(next) })}
                      options={(details.dateRangeAvailables ?? []).map(option => ({
                        value: String(option.id),
                        label: option.description ?? String(option.id),
                      }))}
                    />
                  </SettingsField>
                  {showsAttendance(typeId) ? (
                    <SettingsField
                      htmlFor="job-percentageAttended"
                      label={t('PercentageAttended')}
                      error={fieldError('percentageAttended')}
                    >
                      <div className="flex gap-2">
                        <FieldSelect
                          id="job-comparison"
                          label={`${t('PercentageAttended')} ${EN.comparison}`}
                          value={job.comparisonOperator ?? ''}
                          disabled={locked}
                          onChange={next => update({ comparisonOperator: next })}
                          className="w-40 shrink-0"
                          options={(details.comparisonOperatorAvailables ?? []).map(option => ({
                            value: String(option.id),
                            label: option.description ?? String(option.id),
                          }))}
                        />
                        <div className="relative w-32">
                          <Input
                            id="job-percentageAttended"
                            inputMode="decimal"
                            maxLength={100}
                            value={job.percentageAttended}
                            aria-invalid={error?.field === 'percentageAttended' || undefined}
                            aria-describedby={
                              error?.field === 'percentageAttended'
                                ? 'job-percentageAttended-error'
                                : undefined
                            }
                            disabled={locked}
                            onChange={event => update({ percentageAttended: event.target.value })}
                            className="h-9 w-full bg-white pr-7 tabular-nums"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-500">
                            {EN.percent}
                          </span>
                        </div>
                      </div>
                    </SettingsField>
                  ) : null}
                </SettingsCard>
              </AnimatedCard>

              <AnimatedCard visible={showsAcademic(typeId)}>
                <SettingsCard icon={SlidersHorizontal} title={EN.scope} hint={EN.scopeHint} delay={160}>
                  {(['school', 'course', 'module'] as const).map(lookup)}
                </SettingsCard>
              </AnimatedCard>

              <AnimatedCard visible={showsLocation(typeId)}>
                <SettingsCard icon={MapPin} title={EN.location} hint={EN.locationHint} delay={200}>
                  {(['site', 'building', 'room'] as const).map(lookup)}
                </SettingsCard>
              </AnimatedCard>

              <AnimatedCard visible={showsMonitor(typeId)}>
                <SettingsCard icon={Timer} title={EN.monitor} hint={EN.monitorHint} delay={120}>
                  <SettingsField htmlFor="job-minutes" label={t('Minutes')} error={fieldError('minutes')}>
                    <Input
                      id="job-minutes"
                      type="number"
                      min={1}
                      max={60}
                      value={job.minutes}
                      aria-invalid={error?.field === 'minutes' || undefined}
                      aria-describedby={error?.field === 'minutes' ? 'job-minutes-error' : undefined}
                      disabled={locked}
                      placeholder={`${t('Default')}: ${job.minutesDefault ?? ''}`}
                      onChange={event => update({ minutes: event.target.value })}
                      className="h-9 w-40 bg-white tabular-nums"
                    />
                  </SettingsField>
                  <SettingsField
                    htmlFor="job-recipients"
                    label={t('Recipients')}
                    error={fieldError('recipients')}
                  >
                    <Input
                      id="job-recipients"
                      type="email"
                      multiple
                      value={job.recipients ?? ''}
                      disabled={locked}
                      placeholder={EN.recipientsPlaceholder}
                      aria-invalid={error?.field === 'recipients' || undefined}
                      aria-describedby={error?.field === 'recipients' ? 'job-recipients-error' : undefined}
                      onChange={event => update({ recipients: event.target.value })}
                      className="h-9 w-full bg-white"
                    />
                  </SettingsField>
                </SettingsCard>
              </AnimatedCard>
            </div>

            {/* Sticky so the preview stays beside the form, with its own scroll when the list grows. */}
            <aside className="xl:sticky xl:top-4 xl:self-start">
              <SettingsCard
                icon={CalendarClock}
                title={EN.summary}
                hint={EN.summaryHint}
                delay={80}
                className="xl:flex xl:min-h-[calc(100vh-12rem)] xl:flex-col"
                bodyClassName="divide-y-0 xl:min-h-0 xl:flex-1"
              >
                <div className="flex flex-1 flex-col justify-between gap-2.5 px-4 py-3.5">
                  <SummaryRow label={t('Type')}>
                    <span className="font-semibold">{typeName || EN.none}</span>
                  </SummaryRow>

                  <SummaryRow label={t('Description')}>
                    {job.description?.trim() ? (
                      <span className="break-words">{job.description}</span>
                    ) : (
                      <span className="text-slate-500">{EN.notSet}</span>
                    )}
                  </SummaryRow>

                  <div aria-live="polite" className="min-w-0">
                    <SummaryRow label={EN.schedule}>
                      <p
                        key={job.cronExpression}
                        className="animate-fade-in font-semibold motion-reduce:animate-none"
                      >
                        {describeCron(job.cronExpression) || EN.none}
                      </p>
                      <code className="mt-1 block font-mono text-xs text-slate-500 tabular-nums">
                        {job.cronExpression}
                      </code>
                    </SummaryRow>
                  </div>

                  <SummaryRow label={EN.nextRuns}>
                    {nextRuns.length ? (
                      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-slate-700">
                        {nextRuns.map(run => (
                          <li key={run.getTime()} className="tabular-nums">
                            {formatCronRun(run)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-500">{EN.none}</span>
                    )}
                  </SummaryRow>

                  <SummaryRow label={t('Enabled')}>
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      {job.enabled ? (
                        <Check aria-hidden className="size-4 text-emerald-600" />
                      ) : (
                        <X aria-hidden className="size-4 text-red-600" />
                      )}
                      {job.enabled ? EN.enabledYes : EN.enabledNo}
                    </span>
                  </SummaryRow>

                  <SummaryRow label={EN.generateEmpty}>
                    <span className="font-semibold">{job.emptyEmail ? EN.enabledYes : EN.enabledNo}</span>
                  </SummaryRow>

                  {showsAttendance(typeId) ? (
                    <SummaryRow label={t('SendToTutor')}>
                      <span className="font-semibold">
                        {job.sendToTutor === true ? EN.enabledYes : EN.enabledNo}
                      </span>
                    </SummaryRow>
                  ) : null}

                  {showsDateRange(typeId) ? (
                    <SummaryRow label={t('DateRange')}>
                      {dateRangeName ? (
                        <span>{dateRangeName}</span>
                      ) : (
                        <span className="text-slate-500">{EN.notSet}</span>
                      )}
                    </SummaryRow>
                  ) : null}

                  {showsAttendance(typeId) ? (
                    <SummaryRow label={EN.attendanceFilter}>
                      {comparisonName && job.percentageAttended.trim() ? (
                        <span className="tabular-nums">
                          {comparisonName} {job.percentageAttended.trim()}
                          {EN.percent}
                        </span>
                      ) : (
                        <span className="text-slate-500">{EN.notSet}</span>
                      )}
                    </SummaryRow>
                  ) : null}

                  {showsMonitor(typeId) ? (
                    <>
                      <SummaryRow label={EN.lookBack}>
                        {minutesValue ? (
                          <span className="tabular-nums">
                            {minutesValue} {EN.minutesUnit}
                          </span>
                        ) : minutesFallback ? (
                          <span className="tabular-nums text-slate-600">
                            {minutesFallback} {EN.minutesUnit} {EN.usingDefault}
                          </span>
                        ) : (
                          <span className="text-slate-500">{EN.notSet}</span>
                        )}
                      </SummaryRow>
                      <SummaryRow label={t('Recipients')}>
                        {recipientList.length ? (
                          <ul className="space-y-0.5">
                            {recipientList.map(address => (
                              <li key={address} className="truncate" title={address}>
                                {address}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-slate-500">{EN.noRecipients}</span>
                        )}
                      </SummaryRow>
                    </>
                  ) : null}

                  {showsAcademic(typeId) || showsLocation(typeId) ? (
                    <SummaryRow label={showsLocation(typeId) ? EN.location : EN.scope}>
                      {scopeChips.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {scopeChips.map(chip => (
                            <span
                              key={chip.label + '-' + chip.value}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              <span className="text-slate-500">{chip.label}</span>
                              <span className="truncate" title={chip.value}>
                                {chip.value}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500">{EN.scopeAllBracket}</span>
                      )}
                    </SummaryRow>
                  ) : null}

                  <SummaryRow label={EN.jobId}>
                    {job.id > 0 ? (
                      <span className="tabular-nums">{job.id}</span>
                    ) : (
                      <span className="text-slate-500">{EN.newJobId}</span>
                    )}
                  </SummaryRow>
                </div>
              </SettingsCard>
            </aside>
          </div>
        ) : null}
      </SettingsBody>
    </SettingsLayout>
  )
}
