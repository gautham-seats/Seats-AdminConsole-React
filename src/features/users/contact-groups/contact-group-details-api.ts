import { api } from '@/shared/api'
import { ENTITY_TYPE, type ContactGroupViewModel, type FunctionDto } from '@/types/contact-groups'
import type { SimpleListItemDto } from '@/types/users'
import {
  parseContactGroupView,
  parseMember,
  type ContactGroupPayload,
  type EntityType,
} from './contact-group-form'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

function toSimpleList(raw: unknown): SimpleListItemDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const r = item as Record<string, unknown>
    return typeof r.id === 'number' ? [{ id: r.id, description: text(r.description) }] : []
  })
}

// GET api/ContactGroupApi/{id}. A new group still sends a segment — legacy passes the hash tail 'Details'
// (contactGroupDetailsController.js:448-451), which binds id as null. With no segment the route picks
// ContactGroupApiController.cs:70 instead, a flat list of every group.
export async function fetchContactGroup(
  id: number | null,
  signal: AbortSignal,
): Promise<ContactGroupViewModel> {
  return parseContactGroupView(
    await api.get<unknown>(`ContactGroupApi/${id !== null && id > 0 ? id : 'Details'}`, { signal }),
  )
}

// POST api/ContactGroupApi (ContactGroupApiController.cs:162-181).
export function saveContactGroup(payload: ContactGroupPayload): Promise<void> {
  return api.post<void>('ContactGroupApi', { body: payload })
}

// GET api/UserApi/GetUsersByCriteria (ContactGroup/Details.cshtml:50-51); shown as user name and full name.
export async function searchContactGroupUsers(
  query: string,
  signal: AbortSignal,
): Promise<SimpleListItemDto[]> {
  const raw = await api.get<unknown>('UserApi/GetUsersByCriteria', { query: { query }, signal })
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    const member = parseMember(item)
    if (!member) return []
    const name = member.userName ?? ''
    return [{ id: member.id, description: member.fullName ? `${name} (${member.fullName})` : name }]
  })
}

const ENTITY_SEARCH: Record<EntityType, string> = {
  [ENTITY_TYPE.courses]: 'ContactGroupApi/GetCoursesByCriteria',
  [ENTITY_TYPE.faculties]: 'ContactGroupApi/GetFacultiesByCriteria',
  [ENTITY_TYPE.modules]: 'ContactGroupApi/GetModulesByCriteria',
  [ENTITY_TYPE.programmes]: 'ContactGroupApi/GetProgrammesByCriteria',
  [ENTITY_TYPE.schools]: 'ContactGroupApi/GetSchoolsByCriteria',
}

// ContactGroup/Details.cshtml:101-156 entity typeaheads.
export async function searchEntities(
  entity: EntityType,
  query: string,
  signal: AbortSignal,
): Promise<SimpleListItemDto[]> {
  return toSimpleList(await api.get<unknown>(ENTITY_SEARCH[entity], { query: { query }, signal }))
}

// POST api/contactGroupApi/createOrUpdateFunction { id, name } returns the saved FunctionDto.
export async function saveFunction(id: number, name: string): Promise<FunctionDto> {
  const raw = await api.post<unknown>('contactGroupApi/createOrUpdateFunction', { body: { id, name } })
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return { id: typeof r.id === 'number' ? r.id : id, name: text(r.name) ?? name }
}

// DELETE api/contactGroupApi/deletefunction?id= (contactGroupDetailsController.js:346-363).
export function deleteFunction(id: number): Promise<void> {
  return api.delete<void>('contactGroupApi/deletefunction', { query: { id } })
}
