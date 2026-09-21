import { api } from '@/shared/api'

export type Person = { id: number; name: string; detail: string | null }

export const PEOPLE_MIN_CHARS = 2
export const PEOPLE_LIMIT = 5
export const PEOPLE_DELAY_MS = 300

// GET api/UserApi with the list's own paging parameters (UserApiController.GetUsers), first page only.
export async function searchPeople(term: string, signal: AbortSignal): Promise<Person[]> {
  const raw = await api.get<unknown>('UserApi', {
    query: {
      currentPageIndex: 0,
      pageSize: PEOPLE_LIMIT,
      sortCol: 'fullName',
      sortDir: 'asc',
      searchFilter: term,
    },
    signal,
  })
  const items =
    raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : []
  return items.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const { id, fullName, userName, emailAddress } = item as Record<string, unknown>
    if (typeof id !== 'number') return []
    const name =
      typeof fullName === 'string' && fullName.trim()
        ? fullName
        : typeof userName === 'string'
          ? userName
          : ''
    if (!name) return []
    const detail =
      typeof emailAddress === 'string' && emailAddress
        ? emailAddress
        : typeof userName === 'string'
          ? userName
          : null
    return [{ id, name, detail: detail === name ? null : detail }]
  })
}
