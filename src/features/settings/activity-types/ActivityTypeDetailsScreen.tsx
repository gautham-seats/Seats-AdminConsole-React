'use client'

import { BellRing, CalendarPlus, ClipboardCheck, FileText, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { ACTIVITY_TYPES_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'
import { useProfile } from '@/shared/shell/profile'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { ActivityTypeDetailsDto, ActivityTypeDto } from '@/types/activity-types'
import { setFlash } from '../shared/flash'
import { NativeSelect } from '../shared/NativeSelect'
import { SaveToast, type Notice } from '../shared/SaveToast'
import { SettingsCard, SettingsField } from '../shared/SettingsCard'
import {
  DetailActions,
  FormStatusPill,
  FRAME_EN,
  SettingsBody,
  SettingsGate,
  SettingsLayout,
  useSaveShortcut,
} from '../shared/SettingsFrame'
import { ToggleRow } from '../shared/ToggleRow'
import { saveFailureMessage } from '../shared/use-object-form'
import { useScreenText } from '../shared/use-screen-text'
import { APPROVAL_COLUMN, MANDATORY_ATTACHMENTS } from './ActivityTypesScreen'
import {
  showsAttachmentType,
  showsFileTemplates,
  toActivityTypeBody,
  toggleId,
  validateActivityType,
  withSelectDefaults,
  type ActivityTypeError,
} from './activity-type-form'

const ITEM = PermissionItem.ScheduledActivityType
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const ADD = { item: ITEM, action: PermissionAction.Add }
const EDIT = { item: ITEM, action: PermissionAction.Edit }

// Keys from Views/ScheduledActivityType/Details.cshtml.
const TEXT = {
  ActivityTypes: 'Activity Types',
  Name: 'Name',
  Type: 'Type',
  AccessLevel: 'Access Level',
  AttendanceType: 'Associated Attendance Type',
  TriggerEmail: 'Trigger e-mail',
  Attachment: 'Attachment',
  FileTemplate: 'File Template',
  ActAsClocking: 'Act as Attended',
  ActAsBlackout: 'Act as a Blackout',
  IsAppointment: 'Is Appointment',
  RequiresApproval: 'Requires Approval',
  MandatoryComments: 'Mandatory Comments',
  MandatoryAttachments: 'Mandatory Attachments',
  Save: 'Save',
  Cancel: 'Cancel',
  NameIsRequired: 'The Name is required.',
  RequiredMessage: 'There are fields with input validation errors.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
} as const

const EN = {
  none: '[None]',
  specialCharacters: 'Special characters are not allowed .',
  newType: 'New activity type',
  general: 'General',
  generalHint: 'Name, type and who can use it',
  attendance: 'Attendance',
  attendanceHint: 'How this activity counts towards attendance',
  rules: 'Rules',
  rulesHint: 'What people must add when recording it',
  notifications: 'Notifications',
  notificationsHint: 'E-mails and letters sent for this activity',
  noTemplates: 'There are no letter templates yet.',
} as const

const loadDetails = (id: number, signal: AbortSignal) =>
  api.get<ActivityTypeDetailsDto>(`ScheduledActivityTypeApi/${id > 0 ? id : 'Details'}`, {
    query: { letterFileTemplatesOnly: true },
    signal,
  })

export function ActivityTypeDetailsScreen({ id }: { id: number }) {
  return (
    <SettingsGate access={ACCESS}>
      <ActivityTypeDetailsWorkspace id={id} />
    </SettingsGate>
  )
}

function ActivityTypeDetailsWorkspace({ id }: { id: number }) {
  const t = useScreenText(TEXT)
  const router = useRouter()
  const profile = useProfile()
  const canSave = profile.can(id > 0 ? EDIT : ADD)
  const load = useCallback((signal: AbortSignal) => loadDetails(id, signal), [id])
  const read = useApiRead(`settings-activity-type:${id}`, load)
  const details = read.data

  const [draft, setDraft] = useState<{ source: ActivityTypeDetailsDto; detail: ActivityTypeDto } | null>(null)
  const initial = useMemo(() => (details ? withSelectDefaults(details) : null), [details])
  const detail = draft && draft.source === details ? draft.detail : initial
  const dirty =
    draft !== null && draft.source === details && JSON.stringify(draft.detail) !== JSON.stringify(initial)

  // After the first Save attempt the error is recomputed from the current values on every change.
  const [submitted, setSubmitted] = useState(false)
  const error: ActivityTypeError | null = submitted && detail ? validateActivityType(detail) : null
  const [saving, setSaving] = useState(false)
  useLeaveGuard(dirty && !saving, LEAVE_EN.message)
  const [notice, setNotice] = useState<Notice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const update = (change: Partial<ActivityTypeDto>) => {
    if (!details || !detail) return
    setDraft({ source: details, detail: { ...detail, ...change } })
  }

  const save = async () => {
    if (!detail || saving || !canSave) return
    const failure = validateActivityType(detail)
    setSubmitted(true)
    if (failure) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: failure.messageKey === 'NameIsRequired' ? t('NameIsRequired') : t('RequiredMessage'),
      })
      document.getElementById('activity-type-name')?.focus()
      return
    }
    setSaving(true)
    try {
      await api.post<void>('ScheduledActivityTypeApi/', { body: toActivityTypeBody(detail) })
      setFlash(t('AlertSaveSucceededDefault'))
      router.push(ACTIVITY_TYPES_ROUTE)
    } catch (caught) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')),
      })
      setSaving(false)
    }
  }
  useSaveShortcut(canSave && detail !== null, save)

  const locked = !canSave || saving
  const title = id > 0 ? (initial?.name ?? t('ActivityTypes')) : EN.newType

  return (
    <SettingsLayout
      sectionId="activity-types"
      title={title}
      meta={<FormStatusPill canEdit={canSave} dirty={dirty} />}
      actions={
        <DetailActions
          cancelHref={ACTIVITY_TYPES_ROUTE}
          cancelLabel={t('Cancel')}
          saveLabel={t('Save')}
          onSave={() => void save()}
          saving={saving}
          canSave={canSave && detail !== null}
        />
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      <SettingsBody error={read.error} status={read.status} onRetry={read.reload}>
        {details && detail ? (
          <div className="mx-auto grid h-full w-full max-w-6xl gap-4 lg:grid-cols-2 lg:items-stretch">
            <div className="flex min-h-0 flex-col gap-4">
              <SettingsCard icon={CalendarPlus} title={EN.general} hint={EN.generalHint}>
                <SettingsField
                  htmlFor="activity-type-name"
                  label={t('Name')}
                  error={
                    error
                      ? error.messageKey === 'NameIsRequired'
                        ? t('NameIsRequired')
                        : EN.specialCharacters
                      : null
                  }
                >
                  <Input
                    id="activity-type-name"
                    value={detail.name ?? ''}
                    disabled={locked}
                    aria-invalid={error !== null || undefined}
                    aria-describedby={error ? 'activity-type-name-error' : undefined}
                    onChange={event => update({ name: event.target.value })}
                    className="h-9 w-full bg-white"
                  />
                </SettingsField>
                <div className="grid sm:grid-cols-2">
                  <SettingsField htmlFor="activity-type-subtype" label={t('Type')}>
                    <NativeSelect
                      id="activity-type-subtype"
                      value={detail.scheduledActivitySubTypeId}
                      disabled={locked}
                      onChange={event => update({ scheduledActivitySubTypeId: Number(event.target.value) })}
                    >
                      {(details.scheduledActivitySubTypeAvailables ?? []).map(option => (
                        <option key={option.id} value={option.id}>
                          {option.description}
                        </option>
                      ))}
                    </NativeSelect>
                  </SettingsField>
                  <SettingsField htmlFor="activity-type-access-level" label={t('AccessLevel')}>
                    <NativeSelect
                      id="activity-type-access-level"
                      value={detail.accessLevelId ?? ''}
                      disabled={locked}
                      onChange={event => update({ accessLevelId: Number(event.target.value) })}
                    >
                      {(details.accessLevels ?? []).map(option => (
                        <option key={option.id} value={option.id}>
                          {option.description}
                        </option>
                      ))}
                    </NativeSelect>
                  </SettingsField>
                </div>
              </SettingsCard>

              <SettingsCard
                icon={UserCheck}
                title={EN.attendance}
                hint={EN.attendanceHint}
                delay={60}
                className="flex flex-1 flex-col"
                bodyClassName="flex-1"
              >
                <ToggleRow
                  id="activity-type-clocking"
                  label={t('ActAsClocking')}
                  checked={detail.actAsClocking}
                  disabled={locked}
                  onChange={checked => update({ actAsClocking: checked })}
                >
                  <label
                    htmlFor="activity-type-attendance"
                    className="mb-1.5 block text-xs font-semibold text-slate-700"
                  >
                    {t('AttendanceType')}
                  </label>
                  <NativeSelect
                    id="activity-type-attendance"
                    value={detail.attendanceStatusTypeId ?? ''}
                    disabled={locked}
                    onChange={event =>
                      update({
                        attendanceStatusTypeId: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  >
                    <option value="">{EN.none}</option>
                    {(details.attendanceTypes ?? []).map(option => (
                      <option key={option.id} value={option.id}>
                        {option.description}
                      </option>
                    ))}
                  </NativeSelect>
                </ToggleRow>
                <ToggleRow
                  id="activity-type-blackout"
                  label={t('ActAsBlackout')}
                  checked={detail.actAsBlackout}
                  disabled={locked}
                  onChange={checked => update({ actAsBlackout: checked })}
                />
                <ToggleRow
                  id="activity-type-appointment"
                  label={t('IsAppointment')}
                  checked={detail.isAppointment}
                  disabled={locked}
                  onChange={checked => update({ isAppointment: checked })}
                />
              </SettingsCard>
            </div>

            <div className="flex min-h-0 flex-col gap-4">
              <SettingsCard icon={ClipboardCheck} title={EN.rules} hint={EN.rulesHint} delay={120}>
                <ToggleRow
                  id="activity-type-mandatory-comment"
                  label={t('MandatoryComments')}
                  checked={detail.mandatoryComment}
                  disabled={locked}
                  onChange={checked => update({ mandatoryComment: checked })}
                />
                {profile.can(MANDATORY_ATTACHMENTS) ? (
                  <ToggleRow
                    id="activity-type-mandatory-attachments"
                    label={t('MandatoryAttachments')}
                    checked={detail.mandatoryAttachments}
                    disabled={locked}
                    onChange={checked => update({ mandatoryAttachments: checked })}
                  />
                ) : null}
                {profile.can(APPROVAL_COLUMN) ? (
                  <ToggleRow
                    id="activity-type-approval"
                    label={t('RequiresApproval')}
                    checked={detail.requiresApproval}
                    disabled={locked}
                    onChange={checked => update({ requiresApproval: checked })}
                  />
                ) : null}
              </SettingsCard>

              <SettingsCard
                icon={BellRing}
                title={EN.notifications}
                hint={EN.notificationsHint}
                delay={180}
                className="flex flex-1 flex-col"
                bodyClassName="flex-1"
              >
                <ToggleRow
                  id="activity-type-trigger-email"
                  label={t('TriggerEmail')}
                  checked={detail.triggerEmail}
                  disabled={locked}
                  onChange={checked => update({ triggerEmail: checked })}
                >
                  {showsAttachmentType(detail, details) ? (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label
                          htmlFor="activity-type-notification"
                          className="mb-1.5 block text-xs font-semibold text-slate-700"
                        >
                          {t('Attachment')}
                        </label>
                        <NativeSelect
                          id="activity-type-notification"
                          value={detail.notificationTypeId ?? ''}
                          disabled={locked}
                          onChange={event =>
                            update({
                              notificationTypeId: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                        >
                          <option value="">{EN.none}</option>
                          {(details.notificationTypeAvailables ?? []).map(option => (
                            <option key={option.id} value={option.id}>
                              {option.description}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      {showsFileTemplates(detail) ? (
                        <fieldset className="animate-rise-in motion-reduce:animate-none">
                          <legend className="mb-1.5 text-xs font-semibold text-slate-700">
                            {t('FileTemplate')}
                          </legend>
                          <div className="max-h-44 overflow-auto rounded-lg border border-border bg-white p-1">
                            {(details.fileTemplateAvailables ?? []).map(template => {
                              const checked = detail.fileTemplateIds.includes(template.id)
                              return (
                                <label
                                  key={template.id}
                                  className={cn(
                                    'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-brand/[0.05]',
                                    checked && 'bg-brand/[0.07] text-brand',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={locked}
                                    onChange={() =>
                                      update({
                                        fileTemplateIds: toggleId(detail.fileTemplateIds, template.id),
                                      })
                                    }
                                    className="size-4 rounded-sm accent-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  />
                                  <FileText aria-hidden className="size-3.5 opacity-60" />
                                  {template.name}
                                </label>
                              )
                            })}
                          </div>
                        </fieldset>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{EN.noTemplates}</p>
                  )}
                </ToggleRow>
              </SettingsCard>
            </div>
          </div>
        ) : null}
      </SettingsBody>
    </SettingsLayout>
  )
}
