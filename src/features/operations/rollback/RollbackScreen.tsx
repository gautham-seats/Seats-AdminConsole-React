'use client'

import { api, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import type { RollbackDto } from '@/types/operations'
import { ClientListScreen } from '@/features/settings/shared/ClientListScreen'
import { SettingsGate } from '@/features/settings/shared/SettingsFrame'
import type { TableColumn } from '@/features/settings/shared/SettingsTable'
import { useClientList } from '@/features/settings/shared/use-client-list'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { useOperationsArea } from '../operations-area'
import { parseRollbacks } from './rollback-list'

const ACCESS = { item: PermissionItem.Rollback, action: PermissionAction.Access }

// Column keys from Views/Rollback/Index.cshtml:14-17.
const TEXT = { BatchNumber: 'Batch Number', EntityType: 'Entity Type', Date: 'Date' } as const

const loadRollbacks = async (signal: AbortSignal) =>
  parseRollbacks(await api.get<unknown>('RollbackApi', { signal }))

export function RollbackScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <RollbackWorkspace />
    </SettingsGate>
  )
}

function RollbackWorkspace() {
  const t = useScreenText(TEXT)
  const { area, t: areaText } = useOperationsArea()
  const read = useApiRead('operations-rollback', loadRollbacks)
  const list = useClientList(read.data ?? undefined, { column: 'id', direction: 'asc' })

  const columns: TableColumn<RollbackDto>[] = [
    {
      key: 'id',
      label: t('BatchNumber'),
      sortable: true,
      render: row => <span className="font-semibold text-slate-800 tabular-nums">{row.id}</span>,
    },
    {
      key: 'entityType',
      label: t('EntityType'),
      sortable: true,
      render: row =>
        row.entityType ? (
          <span className="rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand">
            {row.entityType}
          </span>
        ) : null,
    },
    { key: 'date', label: t('Date'), sortable: true, render: row => row.displayDate },
  ]

  return (
    <ClientListScreen
      sectionId="rollback"
      title={areaText('Rollback')}
      area={area}
      searchable={false}
      read={read}
      list={list}
      columns={columns}
      rowLabel={row => String(row.id)}
      addHref={null}
      canDelete={false}
    />
  )
}
