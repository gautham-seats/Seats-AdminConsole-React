'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, CalendarClock, DoorOpen, Hash, History, LoaderCircle, Save, Users, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
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
import { ADD_BUTTON_CLASS, CANCEL_BUTTON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { RoomDetailsViewModel } from '@/types/devices'
import { setDevicesFlash } from '../devices-flash'
import { FormField } from '../FormField'
import { DevicesNotice, type DevicesNoticeState } from '../index/DevicesNotice'
import { DEVICES_FALLBACK_ONLY, isSilentFailure, type DevicesText } from '../index/devices-text'
import { ACTIVITY_ROUTE } from '@/shared/shell/admin-menu'
import { NAV_BAND, NavBandGlow } from '@/shared/ui/nav-band'
import { TAB, TAB_BAR } from '../DetailHero'
import { RoomHero } from './RoomHero'
import { RoomDevicesPanel, useRoomDevices } from './RoomDevicesPanel'
import { useBatteryColumn } from '../index/use-devices-setup'
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

const TABS = ['details', 'devices', 'timetable', 'activity'] as const
type TabId = (typeof TABS)[number]

const TAB_LABEL: Record<TabId, string> = {
  details: DEVICES_FALLBACK_ONLY.details,
  devices: DEVICES_FALLBACK_ONLY.rooms_devices,
  timetable: DEVICES_FALLBACK_ONLY.timetable,
  activity: DEVICES_FALLBACK_ONLY.activity,
}

const tabId = (id: TabId) => `room-tab-${id}`
const panelId = (id: TabId) => `room-panel-${id}`

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
  const [tab, setTab] = useState<TabId>('details')
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
      // Every validated field lives on Details, so a save from another tab has to bring that tab back first.
      setTab('details')
      requestAnimationFrame(() => document.getElementById(FIELD_IDS[firstInvalid])?.focus())
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
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canSave && dirty ? (
        <StatusBadge tone="warning" pulse className="animate-fade-in">
          {DEVICES_FALLBACK_ONLY.unsavedChanges}
        </StatusBadge>
      ) : null}
      <Link href={ROOMS_ROUTE} className={CANCEL_BUTTON_CLASS}>
        <X aria-hidden className="size-[18px]" />
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

  const devices = useRoomDevices(detail.id === 0 ? null : detail.id)
  // One "now" for the page, fixed at mount, so every relative label agrees and never re-renders on its own.
  const [now] = useState(() => Date.now())
  // Device.BatteryPercent.Enabled decides the battery column, same as the devices grid.
  const batteryEnabled = useBatteryColumn().data === true
  const deviceCount = devices.data?.total ?? null
  const seats = Number(form.capacity)
  const perSeat = deviceCount !== null && Number.isFinite(seats) && seats > 0 ? deviceCount / seats : null
  const perSeatText = perSeat === null ? DEVICES_FALLBACK_ONLY.noValue : `1 : ${Math.round(1 / perSeat)}`
  const perSeatHint = `${deviceCount ?? 0} ${t('Devices')} · ${form.capacity || 0} ${t('RoomCapacity')}`

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length] ?? tab
    setTab(next)
    requestAnimationFrame(() => document.getElementById(tabId(next))?.focus())
  }

  const band = (title: string, icon: ReactNode, hint: string, children: ReactNode) => (
    <section className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {/* The shared band, so a room card is titled like every card, table and dialog in Admin. */}
      <h3
        className={cn(
          'flex items-center gap-2 px-5 py-3 text-[11px] font-bold tracking-[0.07em] text-white uppercase',
          NAV_BAND,
        )}
      >
        <NavBandGlow />
        <span aria-hidden className="[&>svg]:size-3.5">
          {icon}
        </span>
        {title}
      </h3>
      <div className="px-5 pt-4 pb-5">
        <p className="mb-4 text-xs text-muted-foreground">{hint}</p>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
      </div>
    </section>
  )

  // A tab the Admin API cannot fill yet says so, rather than showing invented rows.
  const gap = (title: string, body: string, icon: ReactNode, href: string, action: string) => (
    <div className="grid flex-1 place-items-center">
      <div className="flex max-w-md animate-rise-in flex-col items-center gap-3 text-center motion-reduce:animate-none">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-brand/[0.08] text-brand [&>svg]:size-6"
        >
          {icon}
        </span>
        <p className="text-[15px] font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Link href={href} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-1')}>
          {action}
        </Link>
      </div>
    </div>
  )

  const panelClass =
    'flex min-h-0 flex-1 flex-col p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'

  return (
    <form
      id={FORM_ID}
      noValidate
      onSubmit={event => {
        event.preventDefault()
        if (canSave && !saving) void submit()
      }}
      // The hero is a fixed band and the tab card takes everything under it, so the page fills the screen.
      className="flex min-h-0 flex-1 flex-col gap-3.5"
    >
      <DevicesNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Close')} />

      <RoomHero
        name={form.name}
        buildingName={selectedBuilding}
        code={form.externalCode}
        capacity={form.capacity}
        devices={devices.data ?? null}
        batteryEnabled={batteryEnabled}
        now={now}
        t={t}
      />

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div role="tablist" aria-label={DEVICES_FALLBACK_ONLY.roomDetails} className={TAB_BAR}>
          {TABS.map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              id={tabId(id)}
              aria-selected={tab === id}
              aria-controls={panelId(id)}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onTabKeyDown}
              className={cn(TAB.base, tab === id ? TAB.active : TAB.idle)}
            >
              {TAB_LABEL[id]}
              {id === 'devices' && deviceCount !== null ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    tab === id ? TAB.badgeActive : TAB.badgeIdle,
                  )}
                >
                  {deviceCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Details stays mounted so switching tabs never discards an edit. */}
        <div
          role="tabpanel"
          id={panelId('details')}
          aria-labelledby={tabId('details')}
          tabIndex={0}
          hidden={tab !== 'details'}
          className="min-h-0 flex-1 overflow-auto p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
            {band(
              DEVICES_FALLBACK_ONLY.locationGroup,
              <Building2 />,
              DEVICES_FALLBACK_ONLY.locationHint,
              <div className="sm:col-span-2">
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
              </div>,
            )}

            {band(
              DEVICES_FALLBACK_ONLY.identification,
              <Hash />,
              DEVICES_FALLBACK_ONLY.identificationHint,
              <>
                {textField('externalCode', t('RoomCode'), <Hash className="size-4" />)}
                {textField('name', t('RoomName'), <DoorOpen className="size-4" />, true)}
              </>,
            )}

            {band(
              DEVICES_FALLBACK_ONLY.capacityGroup,
              <Users />,
              DEVICES_FALLBACK_ONLY.capacityHint,
              <>
                {textField('capacity', t('RoomCapacity'), <Users className="size-4" />, true)}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-foreground">
                    {DEVICES_FALLBACK_ONLY.devicesPerSeat}
                  </span>
                  <span className="text-[19px] leading-7 font-semibold tabular-nums">{perSeatText}</span>
                  <span className="text-xs text-muted-foreground">{perSeatHint}</span>
                </div>
              </>,
            )}
          </div>
        </div>

        <div
          role="tabpanel"
          id={panelId('devices')}
          aria-labelledby={tabId('devices')}
          tabIndex={0}
          hidden={tab !== 'devices'}
          className={panelClass}
        >
          {tab === 'devices' ? (
            <RoomDevicesPanel read={devices} batteryEnabled={batteryEnabled} t={t} />
          ) : null}
        </div>

        <div
          role="tabpanel"
          id={panelId('timetable')}
          aria-labelledby={tabId('timetable')}
          tabIndex={0}
          hidden={tab !== 'timetable'}
          className={panelClass}
        >
          {gap(
            DEVICES_FALLBACK_ONLY.roomTimetableTitle,
            DEVICES_FALLBACK_ONLY.roomTimetableBody,
            <CalendarClock />,
            ROOMS_ROUTE,
            DEVICES_FALLBACK_ONLY.rooms,
          )}
        </div>

        <div
          role="tabpanel"
          id={panelId('activity')}
          aria-labelledby={tabId('activity')}
          tabIndex={0}
          hidden={tab !== 'activity'}
          className={panelClass}
        >
          {gap(
            DEVICES_FALLBACK_ONLY.roomActivityTitle,
            DEVICES_FALLBACK_ONLY.roomActivityBody,
            <History />,
            ACTIVITY_ROUTE,
            DEVICES_FALLBACK_ONLY.openActivityLog,
          )}
        </div>
      </section>

      {actionsSlot ? createPortal(actions, actionsSlot) : null}
    </form>
  )
}
