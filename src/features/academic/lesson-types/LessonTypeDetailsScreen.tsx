'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fingerprint, Lock, LogOut, MapPin, SlidersHorizontal, Timer, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { LESSON_TYPES_ROUTE } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import {
  buttonVariants,
  Checkbox,
  DelayedLoading,
  ErrorState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { SettingsCard } from '@/features/settings/shared/SettingsCard'
import { FormStatusPill, SaveActions, useSaveShortcut } from '@/features/settings/shared/SettingsFrame'
import { cn } from '@/shared/ui/cn'
import type { LessonTypeTenantFlags, LessonTypeViewModel } from '@/types/lesson-types'
import { fetchLessonType, fetchLessonTypeFlags, saveLessonType } from './lesson-type-api'
import {
  parseLessonTypeId,
  REQUIRED_FIELDS,
  toLessonTypeForm,
  validateLessonType,
  type LessonTypeErrors,
  type LessonTypeForm,
  type NumberField,
} from './lesson-type-form'
import {
  LESSON_TYPE_CHECKOUT,
  LESSON_TYPE_CONSECUTIVE,
  LESSON_TYPE_EDIT,
  LessonTypeGate,
  LessonTypeNoticeBar,
  LessonTypeWorkspace,
  setLessonTypeFlash,
  type LessonTypeNotice,
} from './LessonTypeFrame'
import { LESSON_TYPE_FALLBACK_ONLY, useLessonTypeText, type LessonTypeTextKey } from './lesson-type-text'
import { LessonTimeline } from './LessonTimeline'

const NONE = 'none'
const REQUIRED_MARK = '*'
const NOTICE_MS = { saved: 3500, server: 5000, validation: 4000, flags: 6000 } as const
const NO_FLAGS: LessonTypeTenantFlags = { attendanceByDuration: false, consecutiveAttendanceUpdate: false }

const UNIT: Partial<Record<NumberField, string>> = {
  earlyCutoff: LESSON_TYPE_FALLBACK_ONLY.minutesUnit,
  lateCutoff: LESSON_TYPE_FALLBACK_ONLY.minutesUnit,
  absenceCutoff: LESSON_TYPE_FALLBACK_ONLY.minutesUnit,
  checkoutCutoff: LESSON_TYPE_FALLBACK_ONLY.minutesUnit,
  percentageCutoff: LESSON_TYPE_FALLBACK_ONLY.percentUnit,
}

export function LessonTypeDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <LessonTypeGate>
      <LessonTypeDetails idParam={idParam} />
    </LessonTypeGate>
  )
}

function LessonTypeDetails({ idParam }: { idParam: string }) {
  const t = useLessonTypeText()
  const id = parseLessonTypeId(idParam)
  const view = useApiRead(id === null ? null : `lesson-type:${id}`, signal =>
    id === null ? Promise.resolve(null) : fetchLessonType(id, signal),
  )
  const flags = useApiRead('lesson-type-flags:Details', signal => fetchLessonTypeFlags('Details', signal))
  const notFound =
    id === null ||
    (view.status === 'error' && view.error?.kind === 'http' && view.error.status === 404) ||
    (view.status === 'success' && view.data === null)

  const back = (
    <Link
      href={LESSON_TYPES_ROUTE}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-white')}
    >
      <X aria-hidden className="size-4" />
      {t('Cancel')}
    </Link>
  )

  let content: ReactNode
  if (notFound) {
    content = (
      <div className="flex flex-1">
        <ErrorState
          variant="page"
          glyph="missing"
          stateLabel={LESSON_TYPE_FALLBACK_ONLY.notFoundState}
          message={LESSON_TYPE_FALLBACK_ONLY.notFound}
          hint={LESSON_TYPE_FALLBACK_ONLY.notFoundHint}
          action={back}
        />
      </div>
    )
  } else if (view.status === 'error') {
    content = (
      <div className="grid flex-1 place-items-center rounded-lg border border-border bg-white p-8 shadow-sm">
        <ErrorState
          variant="page"
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={view.reload}
          error={view.error}
          className="border-0"
        />
      </div>
    )
  } else if (
    view.status === 'success' &&
    view.data &&
    (flags.status === 'success' || flags.status === 'error')
  ) {
    // A failed flag read hides only the tenant-dependent fields; the lesson type itself still opens.
    return (
      <LessonTypeEditor
        key={view.data.detail.id}
        view={view.data}
        tenant={flags.status === 'success' && flags.data ? flags.data : NO_FLAGS}
        flagsFailed={flags.status === 'error'}
      />
    )
  } else {
    content = (
      <div className="grid flex-1 place-items-center">
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  }

  return (
    <LessonTypeWorkspace title={t('LessonType')} actions={notFound ? null : back}>
      {content}
    </LessonTypeWorkspace>
  )
}

function Field({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string | null
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-slate-700">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-red-600">
            {REQUIRED_MARK}
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="animate-fade-in text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled: boolean
  onChange: () => void
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'group flex items-center justify-between gap-4 rounded-md border px-3.5 py-3 transition-[border-color,background-color] duration-200',
        checked ? 'border-slate-300 bg-slate-50' : 'border-border bg-white',
        disabled ? 'cursor-default' : 'cursor-pointer hover:border-slate-300',
      )}
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Checkbox id={id} checked={checked} label={label} disabled={disabled} onCheckedChange={onChange} />
    </label>
  )
}

function LessonTypeEditor({
  view,
  tenant,
  flagsFailed,
}: {
  view: LessonTypeViewModel
  tenant: LessonTypeTenantFlags
  flagsFailed: boolean
}) {
  const t = useLessonTypeText()
  const router = useRouter()
  const profile = useProfile()
  const initial = useMemo(() => toLessonTypeForm(view.detail), [view.detail])
  const [draft, setDraft] = useState<{ source: LessonTypeViewModel; form: LessonTypeForm } | null>(null)
  const form = draft && draft.source === view ? draft.form : initial
  const dirty =
    draft !== null && draft.source === view && JSON.stringify(draft.form) !== JSON.stringify(initial)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<LessonTypeNotice | null>(() =>
    flagsFailed
      ? { id: 1, tone: 'info', message: LESSON_TYPE_FALLBACK_ONLY.flagsFailed, duration: NOTICE_MS.flags }
      : null,
  )
  const dismiss = useCallback(() => setNotice(null), [])

  const canEdit = profile.can(LESSON_TYPE_EDIT)
  const showCheckout = profile.can(LESSON_TYPE_CHECKOUT)
  const showScaling = tenant.attendanceByDuration
  const showConsecutive = tenant.consecutiveAttendanceUpdate && profile.can(LESSON_TYPE_CONSECUTIVE)
  const locked = !canEdit || saving
  const numberFields: NumberField[] = [
    'earlyCutoff',
    'lateCutoff',
    'absenceCutoff',
    ...(showCheckout ? (['checkoutCutoff'] as const) : []),
    'percentageCutoff',
  ]

  const update = <K extends keyof LessonTypeForm>(key: K, value: LessonTypeForm[K]) => {
    setDraft(current => ({
      source: view,
      form: { ...(current && current.source === view ? current.form : initial), [key]: value },
    }))
  }

  const discard = () => {
    setDraft(null)
    setSubmitted(false)
  }

  // After a Save attempt errors follow the current values, so each clears or appears as the user types.
  const errors: LessonTypeErrors = submitted ? validateLessonType(form, numberFields) : {}

  const errorText = (field: NumberField) =>
    errors[field] === 'required'
      ? t('Required')
      : errors[field] === 'wholeNumber'
        ? LESSON_TYPE_FALLBACK_ONLY.wholeNumber
        : null

  const submit = async () => {
    const found = validateLessonType(form, numberFields)
    setSubmitted(true)
    const first = numberFields.find(field => found[field])
    if (first) {
      setNotice({
        id: Date.now(),
        tone: 'info',
        message: t('FieldsWithInputValidations'),
        duration: NOTICE_MS.validation,
      })
      document.getElementById(`lesson-type-${first}`)?.focus()
      return
    }
    setSaving(true)
    try {
      await saveLessonType(form)
      setLessonTypeFlash({
        id: Date.now(),
        tone: 'success',
        message: t('AlertSaveSucceededDefault'),
        duration: NOTICE_MS.saved,
      })
      router.push(LESSON_TYPES_ROUTE)
    } catch (error) {
      const failure = toApiError(error)
      const message =
        failure.kind === 'blocked'
          ? LESSON_TYPE_FALLBACK_ONLY.safeMode
          : failure.kind === 'http' && failure.serverMessage
            ? failure.serverMessage
            : t('AlertSaveErrorDefault')
      // A failed save reads as an error here as it does in Devices; legacy's neutral gray alert is LB-060.
      setNotice({ id: Date.now(), tone: 'error', message, duration: NOTICE_MS.server })
      setSaving(false)
    }
  }
  useSaveShortcut(canEdit && !saving && dirty, submit)
  useLeaveGuard(dirty && canEdit && !saving, LESSON_TYPE_FALLBACK_ONLY.leaveConfirm)

  const numberInput = (field: NumberField, label: LessonTypeTextKey) => {
    const id = `lesson-type-${field}`
    const error = errorText(field)
    return (
      <Field key={field} id={id} label={t(label)} required={REQUIRED_FIELDS.includes(field)} error={error}>
        <div className="relative">
          <Input
            id={id}
            type="number"
            inputMode="numeric"
            step={1}
            value={form[field]}
            disabled={locked}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={event => update(field, event.target.value)}
            className="h-9 bg-white pr-14 tabular-nums"
          />
          <span className="pointer-events-none absolute top-1/2 right-8 -translate-y-1/2 text-xs font-medium text-slate-500">
            {UNIT[field]}
          </span>
        </div>
      </Field>
    )
  }

  const select = (
    id: string,
    label: string,
    value: string,
    caption: string,
    options: readonly { id: number; description: string | null }[],
    onChange: (value: string) => void,
  ) => (
    <Field id={id} label={label}>
      <Select value={value} onValueChange={onChange} disabled={locked}>
        <SelectTrigger id={id} className="h-9 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{caption}</SelectItem>
          {options.map(option => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )

  const lockedInput = (id: string, label: LessonTypeTextKey, value: string | null) => (
    <Field id={id} label={t(label)} hint={LESSON_TYPE_FALLBACK_ONLY.readOnly}>
      <div className="relative">
        <Input
          id={id}
          value={value ?? ''}
          disabled
          aria-describedby={`${id}-hint`}
          className="h-9 bg-muted/50 pr-9"
        />
        <Lock
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
      </div>
    </Field>
  )

  const gpsText = form.isGPSEnabled ? LESSON_TYPE_FALLBACK_ONLY.on : LESSON_TYPE_FALLBACK_ONLY.off
  const checkoutValue =
    form.isAttendanceBasedOnCheckout === null ? NONE : form.isAttendanceBasedOnCheckout ? '1' : '0'
  const checkoutLabel =
    view.attendanceBasedOnCheckoutAvailables.find(option => String(option.id) === checkoutValue)
      ?.description ?? LESSON_TYPE_FALLBACK_ONLY.disabledCaption

  const gpsPill = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        form.isGPSEnabled
          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
          : 'bg-red-50 text-red-700 ring-1 ring-red-200',
      )}
    >
      <span
        aria-hidden
        className={cn('size-1.5 rounded-full', form.isGPSEnabled ? 'bg-emerald-500' : 'bg-red-500')}
      />
      {gpsText}
    </span>
  )

  return (
    <LessonTypeWorkspace
      title={form.name ?? t('LessonType')}
      meta={<FormStatusPill canEdit={canEdit} dirty={dirty} />}
      actions={
        canEdit ? (
          <SaveActions
            dirty={dirty}
            saving={saving}
            saveLabel={t('Save')}
            onSave={() => void submit()}
            onDiscard={discard}
            extra={
              <Link
                href={LESSON_TYPES_ROUTE}
                aria-disabled={saving}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'text-muted-foreground',
                  saving && 'pointer-events-none opacity-50',
                )}
              >
                {t('Cancel')}
              </Link>
            }
          />
        ) : (
          <Link
            href={LESSON_TYPES_ROUTE}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}
          >
            {t('Cancel')}
          </Link>
        )
      }
    >
      <form
        id="lesson-type-form"
        noValidate
        onSubmit={event => {
          event.preventDefault()
          if (canEdit && !saving) void submit()
        }}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <LessonTypeNoticeBar notice={notice} onDismiss={dismiss} dismissLabel={t('Cancel')} />

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mx-auto grid max-w-6xl gap-4 pb-2 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start xl:gap-5">
            <div className="flex min-w-0 flex-col gap-4">
              <SettingsCard icon={Fingerprint} title={LESSON_TYPE_FALLBACK_ONLY.identity}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
                  {lockedInput('lesson-type-name', 'Name', form.name)}
                  {lockedInput('lesson-type-description', 'Description', form.description)}
                  <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-white px-3.5 py-3 md:col-span-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <MapPin aria-hidden className="size-4 text-muted-foreground" />
                      {t('IsGPSEnabled')}
                    </span>
                    {gpsPill}
                  </div>
                </div>
              </SettingsCard>

              <SettingsCard icon={Timer} title={LESSON_TYPE_FALLBACK_ONLY.cutoffs} delay={60}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
                  {numberInput('earlyCutoff', 'EarlyCutoff')}
                  {numberInput('lateCutoff', 'LateCutoff')}
                  {numberInput('absenceCutoff', 'AbsenceCutoff')}
                  {numberInput('percentageCutoff', 'PercentageCutoff')}
                </div>
              </SettingsCard>

              {showCheckout ? (
                <SettingsCard icon={LogOut} title={LESSON_TYPE_FALLBACK_ONLY.checkOut} delay={120}>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
                    {select(
                      'lesson-type-checkout',
                      t('IsAttendanceBasedOnCheckout'),
                      checkoutValue,
                      LESSON_TYPE_FALLBACK_ONLY.disabledCaption,
                      view.attendanceBasedOnCheckoutAvailables,
                      value => update('isAttendanceBasedOnCheckout', value === NONE ? null : value === '1'),
                    )}
                    {numberInput('checkoutCutoff', 'CheckoutCutoff')}
                  </div>
                </SettingsCard>
              ) : null}

              <SettingsCard
                icon={SlidersHorizontal}
                title={LESSON_TYPE_FALLBACK_ONLY.attendanceRules}
                delay={180}
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
                  <ToggleRow
                    id="lesson-type-based-on-start"
                    label={t('IsAbsenceBasedOnStart')}
                    checked={form.isAbsenceBasedOnStart}
                    disabled={locked}
                    onChange={() => update('isAbsenceBasedOnStart', !form.isAbsenceBasedOnStart)}
                  />
                  <ToggleRow
                    id="lesson-type-is-active"
                    label={t('IsActive')}
                    checked={form.isActive}
                    disabled={locked}
                    onChange={() => update('isActive', !form.isActive)}
                  />
                  {showScaling
                    ? select(
                        'lesson-type-scaling',
                        t('AttendanceScaling'),
                        form.attendanceScaling === null || form.attendanceScaling === 0
                          ? NONE
                          : String(form.attendanceScaling),
                        LESSON_TYPE_FALLBACK_ONLY.noneCaption,
                        view.attendanceScalingAvailables,
                        value => update('attendanceScaling', value === NONE ? null : Number(value)),
                      )
                    : null}
                  {showConsecutive ? (
                    <ToggleRow
                      id="lesson-type-consecutive"
                      label={t('ConsecutiveAttendanceUpdate')}
                      checked={form.isConsecutiveAttendanceUpdate}
                      disabled={locked}
                      onChange={() =>
                        update('isConsecutiveAttendanceUpdate', !form.isConsecutiveAttendanceUpdate)
                      }
                    />
                  ) : null}
                </div>
              </SettingsCard>
            </div>

            <aside className="lg:sticky lg:top-0">
              <SettingsCard
                icon={Timer}
                title={LESSON_TYPE_FALLBACK_ONLY.summary}
                hint={LESSON_TYPE_FALLBACK_ONLY.summaryHint}
                delay={80}
              >
                <div className="flex flex-col gap-4 px-5 py-4">
                  <LessonTimeline
                    early={form.earlyCutoff}
                    late={form.lateCutoff}
                    absence={form.absenceCutoff}
                    basedOnStart={form.isAbsenceBasedOnStart}
                    labels={{
                      start: LESSON_TYPE_FALLBACK_ONLY.lessonStart,
                      end: LESSON_TYPE_FALLBACK_ONLY.lessonEnd,
                      early: t('EarlyCutoff'),
                      late: t('LateCutoff'),
                      absence: t('AbsenceCutoff'),
                      minutes: LESSON_TYPE_FALLBACK_ONLY.minutesUnit,
                      incomplete: LESSON_TYPE_FALLBACK_ONLY.timelineIncomplete,
                    }}
                  />
                  <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 border-t border-border pt-4 text-sm">
                    <dt className="text-slate-500">{t('IsGPSEnabled')}</dt>
                    <dd className="justify-self-end">{gpsPill}</dd>
                    {showCheckout ? (
                      <>
                        <dt className="text-slate-500">{t('IsAttendanceBasedOnCheckout')}</dt>
                        <dd className="justify-self-end font-semibold text-slate-800">{checkoutLabel}</dd>
                      </>
                    ) : null}
                    <dt className="text-slate-500">{t('PercentageCutoff')}</dt>
                    <dd className="justify-self-end font-semibold text-slate-800 tabular-nums">
                      {form.percentageCutoff.trim() || LESSON_TYPE_FALLBACK_ONLY.dash}
                      {form.percentageCutoff.trim() ? LESSON_TYPE_FALLBACK_ONLY.percentUnit : null}
                    </dd>
                  </dl>
                </div>
              </SettingsCard>
            </aside>
          </div>
        </div>
      </form>
    </LessonTypeWorkspace>
  )
}
