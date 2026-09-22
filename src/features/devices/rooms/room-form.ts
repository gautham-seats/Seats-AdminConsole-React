import type {
  RoomBuildingOptionDto,
  RoomDetailDto,
  RoomDetailsViewModel,
  RoomSaveBody,
} from '@/types/devices'

export const NEW_ROOM_PARAM = 'new'

export type RoomForm = {
  buildingId: number | null
  externalCode: string
  name: string
  capacity: string
}

export type RoomTextField = 'externalCode' | 'name' | 'capacity'
export type RoomFieldError = 'required' | 'specialCharacters' | 'wholeNumber'
export type RoomFormErrors = Partial<Record<RoomTextField, RoomFieldError>>

// /resources/rooms/new and /resources/rooms/{id} (room-details.md Route table).
export function parseRoomIdParam(param: string): number | null | 'invalid' {
  if (param === NEW_ROOM_PARAM) return null
  return /^[1-9]\d*$/.test(param) ? Number(param) : 'invalid'
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null
const record = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null

const KNOWN_DETAIL_KEYS = new Set(['id', 'externalCode', 'name', 'capacity', 'buildingId'])

function parseDetail(raw: unknown): RoomDetailDto {
  const item = record(raw)
  const id = item ? integer(item.id) : null
  if (!item || id === null) throw new Error('Room detail missing')
  return {
    id,
    externalCode: text(item.externalCode),
    name: text(item.name),
    capacity: integer(item.capacity),
    buildingId: integer(item.buildingId),
    extra: Object.fromEntries(Object.entries(item).filter(([key]) => !KNOWN_DETAIL_KEYS.has(key))),
  }
}

function parseBuildings(raw: unknown): RoomBuildingOptionDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(entry => {
    const item = record(entry)
    const id = item ? integer(item.id) : null
    return item && id !== null ? [{ id, name: text(item.name) }] : []
  })
}

// GET api/RoomApi/{id} returns { detail, buildings } (RoomApiController.cs:70-92).
export function parseRoomDetails(raw: unknown): RoomDetailsViewModel {
  const view = record(raw)
  if (!view) throw new Error('Room view missing')
  return { detail: parseDetail(view.detail), buildings: parseBuildings(view.buildings) }
}

// The KO select has no caption, so an unset building takes the first option (Details.cshtml:38).
export function toRoomForm(view: RoomDetailsViewModel): RoomForm {
  const { detail, buildings } = view
  const known = buildings.some(building => building.id === detail.buildingId)
  return {
    buildingId: known ? detail.buildingId : (buildings[0]?.id ?? null),
    externalCode: detail.externalCode ?? '',
    name: detail.name ?? '',
    capacity: detail.capacity === null ? '' : String(detail.capacity),
  }
}

const SPECIAL_CHARACTERS = /[<>]/
const WHOLE_NUMBER = /^\d{1,9}$/

// roomDetailsController.js:40-52 required name and capacity; swapp.js:506-526 blocks < and >; RoomDto.Capacity is an int.
export function validateRoomForm(form: RoomForm): RoomFormErrors {
  const errors: RoomFormErrors = {}
  if (SPECIAL_CHARACTERS.test(form.externalCode)) errors.externalCode = 'specialCharacters'
  if (!form.name.trim()) errors.name = 'required'
  else if (SPECIAL_CHARACTERS.test(form.name)) errors.name = 'specialCharacters'
  const capacity = form.capacity.trim()
  if (!capacity) errors.capacity = 'required'
  else if (!WHOLE_NUMBER.test(capacity)) errors.capacity = 'wholeNumber'
  return errors
}

export type RoomTouched = ReadonlySet<RoomTextField>
const UNTOUCHED: RoomTouched = new Set<RoomTextField>()

// Knockout keeps a null the user never typed in; a field that was edited and cleared posts "" (as device-form.ts).
const keepNull = (original: string | null, value: string, touched: boolean): string | null =>
  original === null && value === '' && !touched ? null : value

// roomDetailsController.js:18-21 posts the loaded detail with the edits and the page url.
export function toRoomSaveBody(
  detail: RoomDetailDto,
  form: RoomForm,
  url: string,
  touched: RoomTouched = UNTOUCHED,
): RoomSaveBody {
  return {
    ...detail.extra,
    id: detail.id,
    externalCode: keepNull(detail.externalCode, form.externalCode, touched.has('externalCode')),
    name: form.name,
    capacity: Number(form.capacity.trim()),
    buildingId: form.buildingId,
    url,
  }
}

// The audit url keeps the legacy hash route; the server appends the new id (RoomApiController.cs:123-125).
export function roomAuditPath(id: number): string {
  return id === 0 ? '#/Room/Details' : `#/Room/Details/${id}`
}
