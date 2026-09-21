'use client'

import { useMemo } from 'react'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import type { DeveloperKeysSortColumn, UserDeveloperKeyDto } from '@/types/developer-keys'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import type { ListColumn } from '../list/ListTable'
import { ListWorkspace } from '../list/ListWorkspace'
import { useServerList } from '../list/use-server-list'
import { AreaGate } from '../UsersGate'
import { deleteDeveloperKeys, fetchDeveloperKeysPage, formatExpiryDate } from './developer-keys-api'

const DASHBOARD = { item: PermissionItem.Users, action: PermissionAction.DeveloperKeyDashboard }
// DeveloperKeyController.cs:15 serves the page only with AdminUserMenu + DeveloperKey as well (D-027).
const PAGE = { item: PermissionItem.AdminUserMenu, action: PermissionAction.DeveloperKey }

const INITIAL_SORT = { col: 'expiryDate', dir: 'asc' } as const
const rowName = (item: UserDeveloperKeyDto) => item.userName ?? ''

export function DeveloperKeysScreen() {
  return (
    <AreaGate permissions={[DASHBOARD, PAGE]} deniedMessage={USERS_FALLBACK_ONLY.noPageAccess}>
      <DeveloperKeysWorkspace />
    </AreaGate>
  )
}

function DeveloperKeysWorkspace() {
  const t = useUsersText()
  const list = useServerList<UserDeveloperKeyDto, DeveloperKeysSortColumn>({
    name: 'developer-keys',
    initialSort: INITIAL_SORT,
    fetchPage: fetchDeveloperKeysPage,
  })

  const columns = useMemo<ListColumn<UserDeveloperKeyDto, DeveloperKeysSortColumn>[]>(
    () => [
      {
        key: 'expiryDate',
        label: t('ExpiryDate'),
        className: 'tabular-nums text-slate-700',
        render: item => formatExpiryDate(item.expiryDate),
      },
      {
        key: 'userName',
        label: t('UserName'),
        className: 'font-medium text-foreground',
        render: item => item.userName,
      },
      { key: 'fullName', label: t('FullName'), className: 'text-foreground', render: item => item.fullName },
    ],
    [t],
  )

  // DeveloperKey/Index.cshtml:32 and :75: delete needs the dashboard right the gate already checked; rows do not open.
  return (
    <ListWorkspace
      id="developer-keys"
      activeId="developer-key"
      title={t('DeveloperKey')}
      list={list}
      columns={columns}
      rowName={rowName}
      add={null}
      canDelete
      remove={deleteDeveloperKeys}
    />
  )
}
