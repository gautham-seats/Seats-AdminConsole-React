import { api } from '@/shared/api'
import { pageTotal } from '@/shared/api/page-total'
import type { UsersPageDto } from '@/types/users'
import { deleteUsersPath, parseUsersPage, toParams, type UsersQuery } from './users-query'

// GET api/UserApi with the paging parameters that select UserApiController.GetUsers (swgrid.js:655-668).
export async function fetchUsersPage(query: UsersQuery, signal: AbortSignal): Promise<UsersPageDto> {
  const raw = await api.get<unknown>('UserApi', { query: toParams(query), signal })
  const page = parseUsersPage(raw)
  return {
    ...page,
    totalRowCount: pageTotal(page.totalRowCount, query.pageIndex, query.pageSize, page.items.length),
  }
}

// DELETE api/UserApi?ids=… (UserApiController.cs:440-441).
export function deleteUsers(ids: readonly number[]): Promise<void> {
  return api.delete<void>(deleteUsersPath(ids))
}
