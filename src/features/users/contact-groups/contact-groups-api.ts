import { api } from '@/shared/api'
import type { ContactGroupDto } from '@/types/contact-groups'
import { deleteIdsPath } from '../list/client-list'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const int = (value: unknown): number | null => (typeof value === 'number' ? value : null)

function parseContactGroups(raw: unknown): ContactGroupDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const r = entry as Record<string, unknown>
    if (typeof r.id !== 'number') return []
    return [
      {
        id: r.id,
        name: text(r.name),
        description: text(r.description),
        groupEmailAddress: text(r.groupEmailAddress),
        sendEmailsToTypeId: int(r.sendEmailsToTypeId),
        sendEmailsToTypeDescription: text(r.sendEmailsToTypeDescription),
        functionId: int(r.functionId),
        functionName: text(r.functionName),
        associatedTo: int(r.associatedTo),
        associatedToDescription: text(r.associatedToDescription),
        facultyId: int(r.facultyId),
        schoolId: int(r.schoolId),
        programmeId: int(r.programmeId),
        courseId: int(r.courseId),
        moduleId: int(r.moduleId),
        userIdsInContactGroup: Array.isArray(r.userIdsInContactGroup)
          ? r.userIdsInContactGroup.filter((id): id is number => typeof id === 'number')
          : null,
        globalId: text(r.globalId),
        visible: r.visible === true,
      },
    ]
  })
}

// GET api/ContactGroupApi returns every group; paging is client-side (ContactGroupApiController.cs:69-74).
export async function fetchContactGroups(signal: AbortSignal): Promise<ContactGroupDto[]> {
  return parseContactGroups(await api.get<unknown>('ContactGroupApi', { signal }))
}

// DELETE api/ContactGroupApi?ids=… (ContactGroupApiController.cs:185-194).
export function deleteContactGroups(ids: readonly number[]): Promise<void> {
  return api.delete<void>(deleteIdsPath('ContactGroupApi', ids))
}
