'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, DoorOpen, Hash, LoaderCircle, Save, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { toApiError } from '@/shared/api'
import { legacyHref, PermissionAction, PermissionItem, ROOMS_ROUTE } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  buttonVariants,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { ADD_BUTTON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { RoomDetailsViewModel } from '@/types/devices'
import { setDevicesFlash } from '../devices-flash'
import { FormField } from '../FormField'
import { DevicesNotice, type DevicesNoticeState } from '../index/DevicesNotice'
import { DEVICES_FALLBACK_ONLY, isSilentFailure, type DevicesText } from '../index/devices-text'
import { RoomIdentityPreview } from './RoomIdentityPreview'
import { saveRoom } from './room-details-api'
import {
  roomAuditPath,
  toRoomForm,
  toRoomSaveBody,
  validateRoomForm,
  type RoomFieldError,
  type RoomForm,
  type RoomFormErrors,
  type RoomTextField,
  type RoomTouched,
} from './room-form'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'

const ROOMS_ADD = { item: PermissionItem.Rooms, action: PermissionAction.Add }
const ROOMS_EDIT = { item: PermissionItem.Rooms, action: PermissionAction.Edit }

// swAlert timings: save success 3.5 s, save error 5 s (roomDetailsController.js:23-27), validation 4 s (swapp.js:574).
const DURATION = { saved: 3500, saveFailed: 5000, invalid: 4000 } as const

const FIELD_IDS: Record<RoomTextField, string> = {
  externalCode: 'room-code',
  name: 'room-name',
  capacity: 'room-capacity',
}

const FIELD_ORDER: readonly RoomTextField[] = ['externalCode', 'name', 'capacity']

const FORM_ID = 'room-details-form'

type RoomDetailsFormProps = { view: RoomDetailsViewModel; t: DevicesText; actionsSlot: HTMLElement | null }

export function RoomDetailsForm({ view, t, actionsSlot }: RoomDetailsFormProps) {
  const router = useRouter()
  const profile = useProfile()
  const { detail, buildings } = view
  const canSave = profile.can(detail.id === 0 ? ROOMS_ADD : ROOMS_EDIT)

  const [form, setForm] = useState<RoomForm>(() => toRoomForm(view))
  const [pristine] = useState(() => JSON.stringify(toRoomForm(view)))
  const [errors, setErrors] = useState<RoomFormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<RoomTouched>(() => new Set<RoomTextField>())
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== pristine
  useLeaveGuard(!saving && dirty, LEAVE_EN.message)
  const [notice, setNotice] = useState<DevicesNoticeState | null>(null)
  const selectedBuilding = buildings.find(building => building.id === form.buildingId)?.name ?? null
  const inFlight = useRef(false)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const notify = (tone: DevicesNoticeState['tone'], message: string, durationMs: number) =>
    setNotice({ id: Date.now(), tone, message, durationMs })

  const commit = (next: RoomForm) => {
    setForm(next)
    if (submitted) setErrors(validateRoomForm(next))
  }

  const message = (error: RoomFieldError | undefined): string | null => {
    if (error === 'required') return t('Required')
    if (error === 'specialCharacters') return DEVICES_FALLBACK_ONLY.specialCharacters
    if (error === 'wholeNumber') return DEVICES_FALLBACK_ONLY.wholeNumber
    return null
  }

  const submit = async () => {
    if (inFlight.current) return
    setSubmitted(true)
    const nextErrors = validateRoomForm(form)
    setErrors(nextErrors)
    const firstInvalid = FIELD_ORDER.find(field => nextErrors[field])
    if (firstInvalid) {
      notify('info', t('FieldsWithInputValidations'), DURATION.invalid)
      document.getElementById(FIELD_IDS[firstInvalid])?.focus()
      return
    }
    inFlight.current = true
    setSaving(true)
    try {
      const url = new URL(legacyHref(roomAuditPath(detail.id)), window.location.origin).href
      await saveRoom(toRoomSaveBody(detail, form, url, touched))
      setDevicesFlash({ message: t('AlertSaveSucceededDefault'), durationMs: DURATION.saved })
      router.push(ROOMS_ROUTE)
    } catch (error) {
      const failure = toApiError(error)
      inFlight.current = false
      setSaving(false)
      if (isSilentFailure(failure)) return
      const text =
        failure.kind === 'auth'
          ? DEVICES_FALLBACK_ONLY.notAuthorised
          : failure.kind === 'blocked'
            ? DEVICES_FALLBACK_ONLY.safeMode
            : failure.kind === 'http' && failure.serverMessage
              ? failure.serverMessage
              : t('AlertSaveErrorDefault')
      notify('error', text, DURATION.saveFailed)
    }
  }

  // Ctrl+S saves from anywhere on the page, like the Settings screens.
  const saveShortcut = useRef<() => void>(() => undefined)
  useEffect(() => {
    saveShortcut.current = () => {
      if (canSave && (dirty || detail.id === 0) && !saving) void submit()
    }
  })
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveShortcut.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const actions = (
    <div className="flex items-center gap-2">
      {canSave && dirty ? (
        <StatusBadge tone="warning" pulse className="animate-fade-in">
          {DEVICES_FALLBACK_ONLY.unsavedChanges}
        </StatusBadge>
      ) : null}
      <Link href={ROOMS_ROUTE} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-4')}>
        <X aria-hidden className="size-4" />
        {t('Cancel')}
      </Link>
      {canSave ? (
        <button
          type="submit"
          form={FORM_ID}
          disabled={saving || (detail.id !== 0 && !dirty)}
          aria-busy={saving}
          aria-keyshortcuts="Control+S"
          className={ADD_BUTTON_CLASS}
        >
          {saving ? (
            <LoaderCircle aria-hidden className="size-[18px] animate-spin motion-reduce:animate-none" />
          ) : (
            <Save aria-hidden className="size-[18px]" />
          )}
          {t('Save')}
        </button>
      ) : null}
    </div>
  )

  const textField = (field: RoomTextField, label: string, icon: ReactNode, required = false) => {
    const id = FIELD_IDS[field]
    const error = message(errors[field])
    return (
      <FormField id={id} label={label} error={error} required={required}>
        <div className="relative">
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          >
            {icon}
          </span>
          <Input
            id={id}
            value={form[field]}
            inputMode={field === 'capacity' ? 'numeric' : undefined}
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-required={required || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={event => {
              setTouched(current => (current.has(field) ? current : new Set(current).add(field)))
              commit({ ...form, [field]: event.target.value })
            }}
            className={cn('h-9 bg-white pl-9', field === 'capacity' && 'tabular-nums')}
          />
        </div>
      </FormField>
    )
  }

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={event => {
        event.preventDefault()
        if (canSave && !saving) void submit()
      }}
      // Four fields never fill a page, so the form sizes to its content instead of stretching to the viewport.
      className="flex flex-col gap-4"
    >
      <DevicesNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Close')} />

      <div>
        <div className="grid max-w-4xl grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <RoomIdentityPreview form={form} buildingName={selectedBuilding} t={t} />

          <section
            aria-labelledby="room-title"
            className="rounded-lg border border-border bg-white shadow-sm"
          >
            <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
              <h2 id="room-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <DoorOpen aria-hidden className="size-4 text-brand" />
                {DEVICES_FALLBACK_ONLY.roomDetails}
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormField id="room-building" label={t('Building')} error={null}>
                  <Select
                    value={form.buildingId === null ? undefined : String(form.buildingId)}
                    onValueChange={value => commit({ ...form, buildingId: Number(value) })}
                    disabled={buildings.length === 0}
                  >
                    <SelectTrigger id="room-building" className="bg-white">
                      <span className="flex min-w-0 items-center gap-2">
                        <Building2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                        <SelectValue />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map(building => (
                        <SelectItem key={building.id} value={String(building.id)}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              {textField('externalCode', t('RoomCode'), <Hash className="size-4" />)}
              {textField('name', t('RoomName'), <DoorOpen className="size-4" />, true)}
              {textField('capacity', t('RoomCapacity'), <Users className="size-4" />, true)}
            </div>
          </section>
        </div>
      </div>

      {actionsSlot ? createPortal(actions, actionsSlot) : null}
    </form>
  )
}
