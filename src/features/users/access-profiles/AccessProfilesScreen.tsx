'use client'

import { useMemo } from 'react'
import { ACCESS_PROFILES_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import type { AccessProfileSimpleItemDto } from '@/types/access-profiles'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import type { SortValue } from '../list/client-list'
import type { ListColumn, RowAction } from '../list/ListTable'
import { ListWorkspace } from '../list/ListWorkspace'
import { useClientList } from '../list/use-client-list'
import { AreaGate } from '../UsersGate'
import { deleteAccessProfiles, fetchAccessProfiles } from './access-profiles-api'

type SortKey = 'description'

const ACCESS = { item: PermissionItem.AccessProfiles, action: PermissionAction.Access }
const ADD = { item: PermissionItem.AccessProfiles, action: PermissionAction.Add }
const DELETE = { item: PermissionItem.AccessProfiles, action: PermissionAction.Delete }

const INITIAL_SORT = { col: 'description', dir: 'asc' } as const
const NEW_ACCESS_PROFILE = ACCESS_PROFILES_ROUTE + '/new'
// swgrid.js:119-133 searches every text and number field except id.
const SEARCH_FIELDS = ['description', 'globalId'] as const
const valueOf = (item: AccessProfileSimpleItemDto, col: SortKey): SortValue => item[col]
const rowName = (item: AccessProfileSimpleItemDto) => item.description ?? ''

// AccessProfile/Index.cshtml:72-77: restricted profiles the user does not hold cannot be opened.
const rowAction = (item: AccessProfileSimpleItemDto): RowAction =>
  item.isEnabled
    ? { kind: 'react', href: `${ACCESS_PROFILES_ROUTE}/${item.id}` }
    : { kind: 'message', message: USERS_FALLBACK_ONLY.profileRestricted }

export function AccessProfilesScreen() {
  return (
    <AreaGate permissions={[ACCESS]} deniedMessage={USERS_FALLBACK_ONLY.noPageAccess}>
      <AccessProfilesWorkspace />
    </AreaGate>
  )
}

function AccessProfilesWorkspace() {
  const t = useUsersText()
  const profile = useProfile()
  const list = useClientList<AccessProfileSimpleItemDto, SortKey>({
    key: 'access-profiles',
    load: fetchAccessProfiles,
    initialSort: INITIAL_SORT,
    searchFields: SEARCH_FIELDS,
    valueOf,
  })

  const columns = useMemo<ListColumn<AccessProfileSimpleItemDto, SortKey>[]>(
    () => [
      {
        key: 'description',
        label: t('Name'),
        className: 'font-medium text-foreground',
        render: item => item.description,
      },
    ],
    [t],
  )

  return (
    <ListWorkspace
      id="access-profiles"
      activeId="access-profile"
      title={t('AccessProfile')}
      list={list}
      columns={columns}
      rowName={rowName}
      rowAction={rowAction}
      messageDuration={2000}
      alwaysSelectable
      add={profile.can(ADD) ? { kind: 'react', href: NEW_ACCESS_PROFILE } : null}
      canDelete={profile.can(DELETE)}
      remove={deleteAccessProfiles}
    />
  )
}
