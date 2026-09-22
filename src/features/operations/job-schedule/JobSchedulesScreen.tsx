'use client'

import { CalendarClock, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { api, useApiRead } from '@/shared/api'
import { JOB_SCHEDULE_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import type { JobScheduleDto } from '@/types/operations'
import { ClientListScreen, idsQuery } from '@/features/settings/shared/ClientListScreen'
import { SettingsGate } from '@/features/settings/shared/SettingsFrame'
import type { TableColumn } from '@/features/settings/shared/SettingsTable'
import { useClientList } from '@/features/settings/shared/use-client-list'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { useOperationsArea } from '../operations-area'
import { describeCron } from './cron'

const ITEM = PermissionItem.JobSchedule
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const ADD = { item: ITEM, action: PermissionAction.Add }
const DELETE = { item: ITEM, action: PermissionAction.Delete }

// Column keys from Views/JobSchedule/Index.cshtml:40-52.
const TEXT = {
  Description: 'Description',
  When: 'When',
  Type: 'Type',
  Enabled: 'Enabled',
  Yes: 'Yes',
  No: 'No',
} as const

const loadJobs = (signal: AbortSignal) => api.get<JobScheduleDto[] | null>('JobScheduleApi', { signal })
const deleteJobs = (ids: readonly number[]) => api.delete<void>(idsQuery('JobScheduleApi', ids))

export function JobSchedulesScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <JobSchedulesWorkspace />
    </SettingsGate>
  )
}

function JobSchedulesWorkspace() {
  const t = useScreenText(TEXT)
  const { area, t: areaText } = useOperationsArea()
  const profile = useProfile()
  const router = useRouter()
  const read = useApiRead('operations-job-schedules', loadJobs)
  // Legacy initialSortColumn 'JobName' is not a row field, so rows keep the server order.
  const list = useClientList(read.data ?? undefined, { column: 'JobName', direction: 'asc' })

  const columns: TableColumn<JobScheduleDto>[] = [
    {
      key: 'description',
      label: t('Description'),
      sortable: true,
      render: row => <span className="font-medium text-slate-800">{row.description}</span>,
    },
    {
      key: 'cronExpression',
      label: t('When'),
      sortable: true,
      render: row => (
        <span className="inline-flex items-center gap-2" title={row.cronExpression ?? undefined}>
          <CalendarClock aria-hidden className="size-3.5 shrink-0 text-brand/80" />
          {describeCron(row.cronExpression)}
        </span>
      ),
    },
    {
      key: 'typeName',
      label: t('Type'),
      sortable: true,
      render: row =>
        row.typeName ? (
          <span className="rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-brand">
            {row.typeName}
          </span>
        ) : null,
    },
    {
      key: 'enabled',
      label: t('Enabled'),
      sortable: true,
      render: row => (
        <span className="inline-flex items-center gap-2">
          {row.enabled ? (
            <span className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <Check aria-hidden className="size-3.5" strokeWidth={3} />
            </span>
          ) : (
            <span className="inline-grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
              <X aria-hidden className="size-3.5" strokeWidth={3} />
            </span>
          )}
          <span className="text-xs font-medium text-slate-600">{row.enabled ? t('Yes') : t('No')}</span>
        </span>
      ),
    },
  ]

  return (
    <ClientListScreen
      sectionId="job-schedule"
      title={areaText('JobSchedule')}
      area={area}
      searchable={false}
      read={read}
      list={list}
      columns={columns}
      // Jobs can have a null description, which would leave every row checkbox with the same empty name.
      rowLabel={row =>
        row.description?.trim() || row.typeName?.trim() || describeCron(row.cronExpression) || String(row.id)
      }
      addHref={profile.can(ADD) ? `${JOB_SCHEDULE_ROUTE}/new` : null}
      onOpen={row => router.push(`${JOB_SCHEDULE_ROUTE}/${row.id}`)}
      canDelete={profile.can(DELETE)}
      deleteRows={deleteJobs}
    />
  )
}
