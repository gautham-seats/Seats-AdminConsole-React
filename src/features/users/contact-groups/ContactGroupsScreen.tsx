'use client'

import { useMemo } from 'react'
import { CONTACT_GROUPS_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import type { ContactGroupDto } from '@/types/contact-groups'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import type { SortValue } from '../list/client-list'
import type { ListColumn, RowAction } from '../list/ListTable'
import { ListWorkspace } from '../list/ListWorkspace'
import { useClientList } from '../list/use-client-list'
import { AreaGate } from '../UsersGate'
import { deleteContactGroups, fetchContactGroups } from './contact-groups-api'

type SortKey =
  'name' | 'groupEmailAddress' | 'sendEmailsToTypeDescription' | 'functionName' | 'associatedToDescription'

const ACCESS = { item: PermissionItem.ContactGroup, action: PermissionAction.Access }
const ADD = { item: PermissionItem.ContactGroup, action: PermissionAction.Add }
// Legacy gates the button with Devices + Delete (ContactGroup/Index.cshtml:39, LB-017); the API needs ContactGroup + Delete.
const DELETE = { item: PermissionItem.ContactGroup, action: PermissionAction.Delete }
const FUNCTIONS = { item: PermissionItem.ContactGroup, action: PermissionAction.ContactGroupFunctions }

const INITIAL_SORT = { col: 'name', dir: 'asc' } as const
// swgrid.js:120-135 searches every text and number field except the key, whatever the columns show.
const SEARCH_FIELDS = [
  'name',
  'description',
  'groupEmailAddress',
  'sendEmailsToTypeId',
  'sendEmailsToTypeDescription',
  'functionId',
  'functionName',
  'associatedTo',
  'associatedToDescription',
  'facultyId',
  'schoolId',
  'programmeId',
  'courseId',
  'moduleId',
  'globalId',
] as const satisfies readonly (keyof ContactGroupDto)[]
const valueOf = (item: ContactGroupDto, col: SortKey): SortValue => item[col]
const rowName = (item: ContactGroupDto) => item.name ?? ''

// ContactGroup/Index.cshtml:80 row click opens the details screen.
const rowAction = (item: ContactGroupDto): RowAction => ({
  kind: 'react',
  href: `${CONTACT_GROUPS_ROUTE}/${item.id}`,
})

export function ContactGroupsScreen() {
  return (
    <AreaGate permissions={[ACCESS]} deniedMessage={USERS_FALLBACK_ONLY.noPageAccess}>
      <ContactGroupsWorkspace />
    </AreaGate>
  )
}

function ContactGroupsWorkspace() {
  const t = useUsersText()
  const profile = useProfile()
  const canSeeFunctions = profile.can(FUNCTIONS)
  const list = useClientList<ContactGroupDto, SortKey>({
    key: 'contact-groups',
    load: fetchContactGroups,
    initialSort: INITIAL_SORT,
    searchFields: SEARCH_FIELDS,
    valueOf,
  })

  const columns = useMemo<ListColumn<ContactGroupDto, SortKey>[]>(() => {
    const base: ListColumn<ContactGroupDto, SortKey>[] = [
      { key: 'name', label: t('Name'), className: 'font-medium text-foreground', render: item => item.name },
      {
        key: 'groupEmailAddress',
        label: t('GroupEmailAddress'),
        className: 'text-slate-600',
        render: item => item.groupEmailAddress,
      },
      {
        key: 'sendEmailsToTypeDescription',
        label: t('SendEmailsTo'),
        className: 'text-slate-700',
        render: item => item.sendEmailsToTypeDescription,
      },
    ]
    if (!canSeeFunctions) return base
    return [
      ...base,
      {
        key: 'functionName',
        label: t('Function'),
        className: 'text-slate-700',
        render: item => item.functionName,
      },
      {
        key: 'associatedToDescription',
        label: t('AssociatedTo'),
        className: 'text-slate-700',
        render: item => item.associatedToDescription,
      },
    ]
  }, [canSeeFunctions, t])

  return (
    <ListWorkspace
      id="contact-groups"
      activeId="contact-group"
      title={t('ContactGroup')}
      list={list}
      columns={columns}
      rowName={rowName}
      rowAction={rowAction}
      add={profile.can(ADD) ? { kind: 'react', href: `${CONTACT_GROUPS_ROUTE}/new` } : null}
      canDelete={profile.can(DELETE)}
      alwaysSelectable
      remove={deleteContactGroups}
    />
  )
}
