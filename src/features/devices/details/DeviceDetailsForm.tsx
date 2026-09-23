'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DoorOpen, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { EmptyState } from '@/shared/ui/EmptyState'
import { HEAD_FILL } from '@/shared/ui/HeadBackdrop'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/Table'
import { useRowWindow } from '@/shared/ui/use-row-window'
import { toApiError } from '@/shared/api'
import { DEVICES_ROUTE, legacyHref, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, Checkbox, GearworkLoader, Input, type CheckboxState, type LookupOption } from '@/shared/ui'
import { ADD_BUTTON_CLASS, CANCEL_BUTTON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import type { DeviceDetailsViewModel, DeviceRoomDto } from '@/types/devices'
import { setDevicesFlash } from '../devices-flash'
import { FormField } from '../FormField'
import { DevicesNotice, type DevicesNoticeState } from '../index/DevicesNotice'
import { TAB, TAB_BAR } from '../DetailHero'
import { DeviceHero } from './DeviceHero'
import { DEVICES_FALLBACK_ONLY, isSilentFailure, type DevicesText } from '../index/devices-text'
import { fetchRoom, saveDevice } from './device-details-api'
import {
  addRoom,
  ASSET_TAG_MAX,
  auditPath,
  IP_ADDRESS_MAX,
  removeRooms,
  toForm,
  toSaveBody,
  validateForm,
  type DeviceFieldError,
  type DeviceForm,
  type DeviceFormErrors,
  type DeviceTextField,
  type DeviceTouched,
} from './device-form'
import { RoomTypeahead } from './RoomTypeahead'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'

const DEVICES_ADD = { item: PermissionItem.Devices, action: PermissionAction.Add }
const DEVICES_EDIT = { item: PermissionItem.Devices, action: PermissionAction.Edit }
const ROOMS_EDIT = { item: PermissionItem.Rooms, action: PermissionAction.Edit }
const ROOMS_DELETE = { item: PermissionItem.Rooms, action: PermissionAction.Delete }

// swAlert timings: save success 3.5 s, save error 5 s (deviceDetailsController.js:97-101), validation 4 s (swapp.js:574).
const DURATION = { saved: 3500, saveFailed: 5000, invalid: 4000, roomFailed: 5000 } as const

const FIELD_IDS: Record<DeviceTextField, string> = {
  description: 'device-description',
  serialNumber: 'device-serial-number',
  macAddress: 'device-mac-address',
  assetTag: 'device-asset-tag',
  ipAddress: 'device-ip-address',
}

const FIELD_ORDER: readonly DeviceTextField[] = [
  'description',
  'serialNumber',
  'macAddress',
  'assetTag',
  'ipAddress',
]

const TABS = ['details', 'rooms'] as const
type TabId = (typeof TABS)[number]

const tabId = (id: TabId) => `device-tab-${id}`
const panelId = (id: TabId) => `device-panel-${id}`

const FORM_ID = 'device-details-form'

type DeviceDetailsFormProps = {
  view: DeviceDetailsViewModel
  t: DevicesText
  actionsSlot: HTMLElement | null
}

export function DeviceDetailsForm({ view, t, actionsSlot }: DeviceDetailsFormProps) {
  const router = useRouter()
  const profile = useProfile()
  const { detail } = view
  const creating = detail.id === 0
  const canSave = profile.can(creating ? DEVICES_ADD : DEVICES_EDIT)
  const canAddRoom = profile.can(ROOMS_EDIT)
  const canRemoveRooms = profile.can(ROOMS_DELETE)

  const [form, setForm] = useState<DeviceForm>(() => toForm(view))
  const [pristine] = useState(() => JSON.stringify(toForm(view)))
  const [errors, setErrors] = useState<DeviceFormErrors>({})
  const [touched, setTouched] = useState<DeviceTouched>(() => new Set<DeviceTextField>())
  const [saving, setSaving] = useState(false)
  useLeaveGuard(!saving && JSON.stringify(form) !== pristine, LEAVE_EN.message)
  const [roomPick, setRoomPick] = useState<LookupOption | null>(null)
  const roomToAdd = roomPick?.id ?? null
  const [addingRoom, setAddingRoom] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const [notice, setNotice] = useState<DevicesNoticeState | null>(null)
  const [tab, setTab] = useState<TabId>('details')
  const inFlight = useRef(false)
  const formRef = useRef(form)
  const submitted = useRef(false)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const noticeId = useRef(0)
  const notify = (tone: DevicesNoticeState['tone'], message: string, durationMs: number) => {
    noticeId.current += 1
    setNotice({ id: noticeId.current, tone, message, durationMs })
  }

  // Every mutation goes through commit so the ref, the state and the live validation stay in step.
  const commit = (next: DeviceForm) => {
    formRef.current = next
    setForm(next)
    if (submitted.current) setErrors(validateForm(next))
  }

  const setText = (field: DeviceTextField, value: string) => {
    setTouched(current => (current.has(field) ? current : new Set(current).add(field)))
    commit({ ...form, [field]: value })
  }

  const message = (error: DeviceFieldError | undefined): string | null => {
    if (error === 'required') return t('Required')
    if (error === 'specialCharacters') return DEVICES_FALLBACK_ONLY.specialCharacters
    return null
  }

  const submit = async () => {
    if (inFlight.current) return
    submitted.current = true
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    const firstInvalid = FIELD_ORDER.find(field => nextErrors[field])
    if (firstInvalid) {
      notify('info', t('FieldsWithInputValidations'), DURATION.invalid)
      // Every validated field lives on Details, so a save from the Rooms tab has to bring that tab back first.
      setTab('details')
      requestAnimationFrame(() => document.getElementById(FIELD_IDS[firstInvalid])?.focus())
      return
    }
    inFlight.current = true
    setSaving(true)
    try {
      const url = new URL(legacyHref(auditPath(detail.id)), window.location.origin).href
      await saveDevice(toSaveBody(detail, form, url, touched))
      setDevicesFlash({ message: t('AlertSaveSucceededDefault'), durationMs: DURATION.saved })
      router.push(DEVICES_ROUTE)
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

  const onAddRoom = async () => {
    if (roomToAdd === null || addingRoom) return
    setAddingRoom(true)
    try {
      const room = await fetchRoom(roomToAdd)
      if (room) commit({ ...formRef.current, rooms: addRoom(formRef.current.rooms, room) })
      else notify('error', DEVICES_FALLBACK_ONLY.roomLookupFailed, DURATION.roomFailed)
    } catch (error) {
      const failure = toApiError(error)
      if (!isSilentFailure(failure)) {
        const text =
          failure.kind === 'auth'
            ? DEVICES_FALLBACK_ONLY.notAuthorised
            : DEVICES_FALLBACK_ONLY.roomLookupFailed
        notify('error', text, DURATION.roomFailed)
      }
    } finally {
      setAddingRoom(false)
      setSelected(new Set())
    }
  }

  const onRemoveRooms = () => {
    commit({ ...form, rooms: removeRooms(form.rooms, selected) })
    setSelected(new Set())
  }

  const toggleRoom = (id: number) =>
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedOnList = form.rooms.filter(room => selected.has(room.id)).length
  const allState: CheckboxState =
    selectedOnList === 0 ? false : selectedOnList === form.rooms.length ? true : 'mixed'
  const toggleAll = () =>
    setSelected(allState === true ? new Set() : new Set(form.rooms.map(room => room.id)))

  // Ctrl+S saves from anywhere on the page, the same rule as the room form.
  const saveShortcut = useRef<() => void>(() => undefined)
  useEffect(() => {
    saveShortcut.current = () => {
      if (canSave && !saving) void submit()
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

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length] ?? tab
    setTab(next)
    requestAnimationFrame(() => document.getElementById(tabId(next))?.focus())
  }

  // Cancel and Save ride the page header, the same pair and the same sizes as every other detail page.
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link href={DEVICES_ROUTE} className={CANCEL_BUTTON_CLASS}>
        <X aria-hidden className="size-[18px]" />
        {t('Cancel')}
      </Link>
      {canSave ? (
        <button
          type="submit"
          form={FORM_ID}
          disabled={saving}
          aria-busy={saving}
          aria-keyshortcuts="Control+S"
          className={ADD_BUTTON_CLASS}
        >
          {saving ? (
            <LoaderCircle aria-hidden className="size-[18px] animate-spin motion-reduce:animate-none" />
          ) : (
            <Save
              aria-hidden
              className="size-[18px] transition-transform duration-500 ease-premium group-hover:-translate-y-px"
            />
          )}
          {t('Save')}
        </button>
      ) : null}
    </div>
  )

  const textField = (
    field: DeviceTextField,
    label: string,
    options: { required?: boolean; maxLength?: number } = {},
  ) => {
    const id = FIELD_IDS[field]
    const error = message(errors[field])
    return (
      <FormField id={id} label={label} error={error} required={options.required}>
        <Input
          id={id}
          value={form[field]}
          maxLength={options.maxLength}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-required={options.required || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={event => setText(field, event.target.value)}
          className="h-9 bg-white"
        />
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
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <DevicesNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Close')} />

      {/* Scroll padding keeps a focused field clear of the sticky device header. */}
      <div className="min-h-0 flex-1 scroll-pt-20 overflow-y-auto pr-1">
        <div className="flex flex-col gap-4 pb-2">
          {/* The blue band carries the whole device identity; nothing under it repeats those values. */}
          <DeviceHero
            serialNumber={form.serialNumber}
            description={form.description}
            assetTag={form.assetTag}
            macAddress={form.macAddress}
            ipAddress={form.ipAddress}
            isBeacon={form.isBeacon}
            isActive={form.isActive}
            roomCount={form.rooms.length}
            isNew={creating}
            t={t}
          />

          <section className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            {/* Tab order: visual — the tabs, then whatever the open panel holds. */}
            <div role="tablist" aria-label={t('Device')} className={TAB_BAR}>
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
                  {id === 'details' ? DEVICES_FALLBACK_ONLY.details : DEVICES_FALLBACK_ONLY.rooms}
                  {id === 'rooms' ? (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                        tab === id ? TAB.badgeActive : TAB.badgeIdle,
                      )}
                    >
                      {form.rooms.length}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Both panels stay mounted so switching tabs never discards an edit. */}
            <div
              role="tabpanel"
              id={panelId('details')}
              aria-labelledby={tabId('details')}
              tabIndex={0}
              hidden={tab !== 'details'}
              className="flex flex-col gap-6 rounded-b-lg px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {/* Identity first, then the two network addresses, so the five fields read as two ideas. */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:col-span-2">
                  {DEVICES_FALLBACK_ONLY.identification}
                </p>
                {textField('serialNumber', t('SerialNumber'), { required: true })}
                {textField('assetTag', t('AssetTag'), { maxLength: ASSET_TAG_MAX })}
                <div className="md:col-span-2">{textField('description', t('Description'))}</div>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 md:grid-cols-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase md:col-span-2">
                  {DEVICES_FALLBACK_ONLY.network}
                </p>
                {textField('macAddress', t('MacAddress'))}
                {textField('ipAddress', t('IPAddress'), { maxLength: IP_ADDRESS_MAX })}
              </div>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5">
                <CheckField
                  id="device-is-beacon"
                  label={t('IsBeacon')}
                  checked={form.isBeacon}
                  onToggle={() => commit({ ...form, isBeacon: !form.isBeacon })}
                />
                <CheckField
                  id="device-is-active"
                  label={t('IsActive')}
                  checked={form.isActive}
                  onToggle={() => commit({ ...form, isActive: !form.isActive })}
                />
              </div>
            </div>

            <div
              role="tabpanel"
              id={panelId('rooms')}
              aria-labelledby={tabId('rooms')}
              tabIndex={0}
              hidden={tab !== 'rooms'}
              className="flex flex-col gap-4 rounded-b-lg px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex max-w-xl flex-1 items-center gap-2">
                  <RoomTypeahead
                    id="device-search-room"
                    label={t('AddRooms')}
                    placeholder={t('SearchRoom')}
                    clearLabel={t('Clear')}
                    selected={roomPick}
                    onSelect={setRoomPick}
                  />
                  {canAddRoom ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10"
                      disabled={roomToAdd === null || addingRoom}
                      aria-busy={addingRoom}
                      onClick={() => void onAddRoom()}
                    >
                      {addingRoom ? (
                        <GearworkLoader className="h-4 w-5" />
                      ) : (
                        <Plus aria-hidden className="size-4" />
                      )}
                      {t('Add')}
                    </Button>
                  ) : null}
                </div>
                {canRemoveRooms && selected.size > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onRemoveRooms}
                    className="animate-fade-in motion-reduce:animate-none"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    {t('Delete')}
                  </Button>
                ) : null}
              </div>
              <RoomsTable
                rooms={form.rooms}
                selected={selected}
                allState={allState}
                onToggle={toggleRoom}
                onToggleAll={toggleAll}
                t={t}
              />
            </div>
          </section>
        </div>
      </div>

      {actionsSlot ? createPortal(actions, actionsSlot) : null}
    </form>
  )
}

function CheckField({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} label={label} />
      <label htmlFor={id} className="cursor-pointer text-sm text-slate-700">
        {label}
      </label>
    </div>
  )
}

type RoomsTableProps = {
  rooms: readonly DeviceRoomDto[]
  selected: ReadonlySet<number>
  allState: CheckboxState
  onToggle: (id: number) => void
  onToggleAll: () => void
  t: DevicesText
}

const ROOM_HEAD = `sticky top-0 z-20 h-10 ${HEAD_FILL} px-3 whitespace-nowrap transition-shadow duration-300`
const ROOM_CELL =
  'border-b border-border bg-white px-3 py-2 align-middle text-slate-700 transition-colors duration-150'

// Details.cshtml:107-137 linked rooms grid; legacy selects with the checkbox only, so the row has no click target.
// Tab order: visual — select-all first, then each row checkbox top to bottom.
function RoomsTable({ rooms, selected, allState, onToggle, onToggleAll, t }: RoomsTableProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(rooms.length, scroller)
  return (
    <div
      ref={scroller}
      onScroll={win.onScroll}
      className="@container relative max-h-96 scroll-pt-10 overflow-auto overscroll-contain rounded-md border border-border"
    >
      <ScrollEdges />
      <table className="w-full border-separate border-spacing-0 text-sm">
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead scope="col" className={cn(ROOM_HEAD, 'w-11 pl-4')}>
              {rooms.length > 0 ? (
                <Checkbox
                  checked={allState}
                  onCheckedChange={onToggleAll}
                  label={t('SelectAll')}
                  className="border-white bg-transparent aria-checked:bg-white aria-checked:text-brand"
                />
              ) : null}
            </TableHead>
            <TableHead scope="col" className={ROOM_HEAD}>
              {t('RoomCode')}
            </TableHead>
            <TableHead scope="col" className={ROOM_HEAD}>
              {t('RoomName')}
            </TableHead>
            <TableHead scope="col" className={ROOM_HEAD}>
              {t('RoomCapacity')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {win.padTop > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padTop }} /> : null}
          {rooms.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-0">
                <EmptyState title={DEVICES_FALLBACK_ONLY.noItems} icon={DoorOpen} className="min-h-48 py-8" />
              </td>
            </tr>
          ) : (
            rooms.slice(win.start, win.end).map((room, offset) => {
              const index = win.start + offset
              const checked = selected.has(room.id)
              const label = `${t('Select')} ${room.name ?? room.id}`
              const tint = checked ? 'bg-sky-50 group-hover:bg-sky-100/80' : 'group-hover:bg-slate-50'
              return (
                <TableRow
                  key={room.id}
                  style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
                  className="group animate-row-in border-0 hover:bg-transparent motion-reduce:animate-none"
                >
                  <TableCell className={cn(ROOM_CELL, tint, 'pl-4')}>
                    <Checkbox checked={checked} onCheckedChange={() => onToggle(room.id)} label={label} />
                  </TableCell>
                  <TableCell className={cn(ROOM_CELL, tint)}>{room.externalCode}</TableCell>
                  <TableCell className={cn(ROOM_CELL, tint)}>{room.name}</TableCell>
                  <TableCell className={cn(ROOM_CELL, tint, 'tabular-nums')}>{room.capacity}</TableCell>
                </TableRow>
              )
            })
          )}
          {win.padBottom > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padBottom }} /> : null}
        </TableBody>
      </table>
    </div>
  )
}
