'use client'

import { Check, Minus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api, useApiRead } from '@/shared/api'
import { ACTIVITY_TYPES_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import type { ActivityTypeRowDto } from '@/types/activity-types'
import { ClientListScreen, idsQuery } from '../shared/ClientListScreen'
import { SettingsGate } from '../shared/SettingsFrame'
import type { TableColumn } from '../shared/SettingsTable'
import { useClientList } from '../shared/use-client-list'
import { useScreenText } from '../shared/use-screen-text'

const ITEM = PermissionItem.ScheduledActivityType
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const ADD = { item: ITEM, action: PermissionAction.Add }
const DELETE = { item: ITEM, action: PermissionAction.Delete }
// Views/ScheduledActivityType/Index.cshtml:6-7: ScheduledActivity (34) Access and action 141.
export const APPROVAL_COLUMN = { item: 34, action: PermissionAction.Access }
export const MANDATORY_ATTACHMENTS = { item: ITEM, action: 141 }

// Column keys from Views/ScheduledActivityType/Index.cshtml:62-122.
const TEXT = {
  ActivityTypes: 'Activity Types',
  Name: 'Name',
  Type: 'Type',
  NotificationType: 'Notification Type',
  ActAsClocking: 'Act as Attended',
  ActAsBlackout: 'Act as a Blackout',
  IsAppointment: 'Is Appointment',
  TriggerEmail: 'Trigger e-mail',
  RequiresApproval: 'Requires Approval',
  AccessLevel: 'Access Level',
  MandatoryComments: 'Mandatory Comments',
  MandatoryAttachments: 'Mandatory Attachments',
} as const

const EN = { yes: 'true', no: 'false' } as const

const loadTypes = (signal: AbortSignal) =>
  api.get<ActivityTypeRowDto[] | null>('ScheduledActivityTypeApi', { signal })
const deleteTypes = (ids: readonly number[]) => api.delete<void>(idsQuery('ScheduledActivityTypeApi', ids))

function Flag({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-grid size-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">
      <Check aria-hidden className="size-3.5" strokeWidth={3} />
      <span className="sr-only">{EN.yes}</span>
    </span>
  ) : (
    <span className="inline-grid size-6 place-items-center text-slate-500">
      <Minus aria-hidden className="size-3.5" />
      <span className="sr-only">{EN.no}</span>
    </span>
  )
}

export function ActivityTypesScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <ActivityTypesWorkspace />
    </SettingsGate>
  )
}

function ActivityTypesWorkspace() {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const router = useRouter()
  const read = useApiRead('settings-activity-types', loadTypes)
  const list = useClientList(read.data ?? undefined, { column: 'name', direction: 'asc' })

  const flag = (
    key: keyof ActivityTypeRowDto & string,
    label: keyof typeof TEXT,
  ): TableColumn<ActivityTypeRowDto> => ({
    key,
    label: t(label),
    sortable: true,
    className: 'text-center',
    render: row => <Flag on={Boolean(row[key])} />,
  })

  const columns: TableColumn<ActivityTypeRowDto>[] = [
    { key: 'name', label: t('Name'), sortable: true, render: row => row.name },
    {
      key: 'scheduledActivitySubTypeDescription',
      label: t('Type'),
      sortable: true,
      render: row => row.scheduledActivitySubTypeDescription,
    },
    {
      key: 'notificationTypeDescription',
      label: t('NotificationType'),
      sortable: true,
      render: row => row.notificationTypeDescription,
    },
    flag('actAsClocking', 'ActAsClocking'),
    flag('actAsBlackout', 'ActAsBlackout'),
    flag('isAppointment', 'IsAppointment'),
    flag('triggerEmail', 'TriggerEmail'),
    ...(profile.can(APPROVAL_COLUMN) ? [flag('requiresApproval', 'RequiresApproval')] : []),
    { key: 'accessLevel', label: t('AccessLevel'), render: row => row.accessLevel },
    { ...flag('mandatoryComment', 'MandatoryComments'), sortable: false },
    ...(profile.can(MANDATORY_ATTACHMENTS)
      ? [{ ...flag('mandatoryAttachments', 'MandatoryAttachments'), sortable: false }]
      : []),
  ]

  return (
    <ClientListScreen
      sectionId="activity-types"
      title={t('ActivityTypes')}
      read={read}
      list={list}
      columns={columns}
      rowLabel={row => row.name ?? ''}
      addHref={profile.can(ADD) ? `${ACTIVITY_TYPES_ROUTE}/new` : null}
      onOpen={row => router.push(`${ACTIVITY_TYPES_ROUTE}/${row.id}`)}
      canDelete={profile.can(DELETE)}
      deleteRows={deleteTypes}
    />
  )
}
