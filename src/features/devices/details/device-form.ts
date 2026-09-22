import type { DeviceDetailDto, DeviceDetailsViewModel, DeviceRoomDto, DeviceSaveBody } from '@/types/devices'

export const NEW_DEVICE_PARAM = 'new'
// Details.cshtml:53 and :59.
export const ASSET_TAG_MAX = 30
export const IP_ADDRESS_MAX = 30

export type DeviceForm = {
  description: string
  serialNumber: string
  macAddress: string
  assetTag: string
  ipAddress: string
  isBeacon: boolean
  isActive: boolean
  rooms: DeviceRoomDto[]
}

export type DeviceTextField = 'description' | 'serialNumber' | 'macAddress' | 'assetTag' | 'ipAddress'
export type DeviceFieldError = 'required' | 'specialCharacters'
export type DeviceFormErrors = Partial<Record<DeviceTextField, DeviceFieldError>>

const TEXT_FIELDS: readonly DeviceTextField[] = [
  'description',
  'serialNumber',
  'macAddress',
  'assetTag',
  'ipAddress',
]

// /resources/devices/new and /resources/devices/{id} (device-details.md Route table).
// DeviceApiController.cs:121 treats id 0 as a new device, so '0' opens the blank Add form.
export function parseDeviceIdParam(param: string): number | null | 'invalid' {
  if (param === NEW_DEVICE_PARAM || param === '0') return null
  return /^[1-9]\d*$/.test(param) ? Number(param) : 'invalid'
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null
const record = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null

export function parseRoom(raw: unknown): DeviceRoomDto | null {
  const item = record(raw)
  const id = item ? integer(item.id) : null
  if (!item || id === null) return null
  return {
    id,
    name: text(item.name),
    description: text(item.description),
    externalCode: text(item.externalCode),
    capacity: integer(item.capacity),
  }
}

export function parseRooms(raw: unknown): DeviceRoomDto[] {
  if (!Array.isArray(raw)) return []
  return raw.map(parseRoom).filter((room): room is DeviceRoomDto => room !== null)
}

const KNOWN_DETAIL_KEYS = new Set([
  'id',
  'description',
  'serialNumber',
  'macAddress',
  'ipAddress',
  'assetTag',
  'isBeacon',
  'isActive',
  'roomIdsInDevice',
])

function parseDetail(raw: unknown): DeviceDetailDto {
  const item = record(raw)
  if (!item) throw new Error('Device detail missing')
  const id = integer(item.id)
  if (id === null) throw new Error('Device id missing')
  const extra = Object.fromEntries(Object.entries(item).filter(([key]) => !KNOWN_DETAIL_KEYS.has(key)))
  return {
    id,
    description: text(item.description),
    serialNumber: text(item.serialNumber),
    macAddress: text(item.macAddress),
    ipAddress: text(item.ipAddress),
    assetTag: text(item.assetTag),
    isBeacon: item.isBeacon === true,
    isActive: item.isActive === true,
    roomIdsInDevice: Array.isArray(item.roomIdsInDevice)
      ? item.roomIdsInDevice.map(integer).filter((value): value is number => value !== null)
      : null,
    extra,
  }
}

// GET api/DeviceApi/{id} returns { detail, rooms, distancesAvailables } (DeviceApiController.cs:116-152).
export function parseDeviceDetails(raw: unknown): DeviceDetailsViewModel {
  const view = record(raw)
  if (!view) throw new Error('Device view missing')
  return { detail: parseDetail(view.detail), rooms: parseRooms(view.rooms) }
}

export function toForm(view: DeviceDetailsViewModel): DeviceForm {
  const { detail } = view
  return {
    description: detail.description ?? '',
    serialNumber: detail.serialNumber ?? '',
    macAddress: detail.macAddress ?? '',
    assetTag: detail.assetTag ?? '',
    ipAddress: detail.ipAddress ?? '',
    isBeacon: detail.isBeacon,
    isActive: detail.isActive,
    rooms: view.rooms,
  }
}

const SPECIAL_CHARACTERS = /[<>]/

// deviceDetailsController.js:118-123 required serial; swapp.js:506-526 and :2642-2647 block < and > in every text.
export function validateForm(form: DeviceForm): DeviceFormErrors {
  const errors: DeviceFormErrors = {}
  for (const field of TEXT_FIELDS) {
    if (SPECIAL_CHARACTERS.test(form[field])) errors[field] = 'specialCharacters'
  }
  if (!form.serialNumber.trim()) errors.serialNumber = 'required'
  return errors
}

// deviceDetailsController.js:27-51 adds a room only once.
export function addRoom(rooms: readonly DeviceRoomDto[], room: DeviceRoomDto): DeviceRoomDto[] {
  return rooms.some(item => item.id === room.id) ? [...rooms] : [...rooms, room]
}

// deviceDetailsController.js:53-73 removes selected rooms locally until Save.
export function removeRooms(rooms: readonly DeviceRoomDto[], ids: ReadonlySet<number>): DeviceRoomDto[] {
  return rooms.filter(room => !ids.has(room.id))
}

export type DeviceTouched = ReadonlySet<DeviceTextField>
const UNTOUCHED: DeviceTouched = new Set<DeviceTextField>()

// Knockout keeps a null the user never typed in; a field that was edited and cleared posts "".
const keepNull = (original: string | null, value: string, touched: boolean): string | null =>
  original === null && value === '' && !touched ? null : value

// deviceDetailsController.js:84-95: the loaded detail with edits, room ids and the page url, posted as JSON.
export function toSaveBody(
  detail: DeviceDetailDto,
  form: DeviceForm,
  url: string,
  touched: DeviceTouched = UNTOUCHED,
): DeviceSaveBody {
  return {
    ...detail.extra,
    id: detail.id,
    description: keepNull(detail.description, form.description, touched.has('description')),
    serialNumber: form.serialNumber,
    macAddress: keepNull(detail.macAddress, form.macAddress, touched.has('macAddress')),
    ipAddress: keepNull(detail.ipAddress, form.ipAddress, touched.has('ipAddress')),
    assetTag: keepNull(detail.assetTag, form.assetTag, touched.has('assetTag')),
    isBeacon: form.isBeacon,
    isActive: form.isActive,
    roomIdsInDevice: form.rooms.map(room => room.id),
    url,
  }
}

// The audit url keeps the legacy hash route; the server appends the new id (DeviceApiController.cs:183-184).
export function auditPath(id: number): string {
  return id === 0 ? '#/Device/Details' : `#/Device/Details/${id}`
}
