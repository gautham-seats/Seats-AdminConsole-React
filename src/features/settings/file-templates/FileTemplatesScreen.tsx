'use client'

import { useRouter } from 'next/navigation'
import { api, useApiRead } from '@/shared/api'
import { FILE_TEMPLATES_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import type { FileTemplateDto } from '@/types/file-templates'
import { ClientListScreen, idsQuery } from '../shared/ClientListScreen'
import { formatDateTime } from '../shared/format'
import { SettingsGate } from '../shared/SettingsFrame'
import type { TableColumn } from '../shared/SettingsTable'
import { useClientList } from '../shared/use-client-list'
import { useScreenText } from '../shared/use-screen-text'

const ACCESS = { item: PermissionItem.FileTemplate, action: PermissionAction.Access }
const ADD = { item: PermissionItem.FileTemplate, action: PermissionAction.Add }
const DELETE = { item: PermissionItem.FileTemplate, action: PermissionAction.Delete }

// Column keys from Views/FileTemplate/Index.cshtml:76-104.
const TEXT = {
  FileTemplate: 'File Template',
  Name: 'Name',
  FileName: 'File Name',
  Subject: 'Subject',
  Comment: 'Comment',
  FileTemplateType: 'File Template Type',
  DateCreated: 'Date Created',
} as const

const loadTemplates = (signal: AbortSignal) =>
  api.get<FileTemplateDto[] | null>('FileTemplateApi', { signal })
const deleteTemplates = (ids: readonly number[]) => api.delete<void>(idsQuery('FileTemplateApi', ids))

export function FileTemplatesScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <FileTemplatesWorkspace />
    </SettingsGate>
  )
}

function FileTemplatesWorkspace() {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const router = useRouter()
  const read = useApiRead('settings-file-templates', loadTemplates)
  const list = useClientList(read.data ?? undefined, { column: 'name', direction: 'asc' })

  const columns: TableColumn<FileTemplateDto>[] = [
    { key: 'name', label: t('Name'), sortable: true, render: row => row.name },
    {
      key: 'fileName',
      label: t('FileName'),
      sortable: true,
      className: 'text-slate-600',
      render: row => row.fileName,
    },
    {
      key: 'subject',
      label: t('Subject'),
      sortable: true,
      render: row => (
        <span className="block max-w-72 truncate" title={row.subject ?? undefined}>
          {row.subject}
        </span>
      ),
    },
    {
      key: 'comment',
      label: t('Comment'),
      sortable: true,
      render: row => (
        <span className="block max-w-64 truncate" title={row.comment ?? undefined}>
          {row.comment}
        </span>
      ),
    },
    {
      key: 'fileTemplateTypeDescription',
      label: t('FileTemplateType'),
      sortable: true,
      render: row =>
        row.fileTemplateTypeDescription ? (
          <span className="rounded-full bg-brand/[0.07] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand">
            {row.fileTemplateTypeDescription}
          </span>
        ) : null,
    },
    {
      key: 'dateCreated',
      label: t('DateCreated'),
      sortable: true,
      className: 'whitespace-nowrap text-slate-600 tabular-nums',
      render: row => formatDateTime(row.dateCreated),
    },
  ]

  return (
    <ClientListScreen
      sectionId="file-template"
      title={t('FileTemplate')}
      read={read}
      list={list}
      columns={columns}
      rowLabel={row => row.name ?? ''}
      addHref={profile.can(ADD) ? `${FILE_TEMPLATES_ROUTE}/new` : null}
      onOpen={row => router.push(`${FILE_TEMPLATES_ROUTE}/${row.id}`)}
      canDelete={profile.can(DELETE)}
      deleteRows={deleteTemplates}
    />
  )
}
