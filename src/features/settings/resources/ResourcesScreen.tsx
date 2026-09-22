'use client'

import { KeyRound, Languages, Save, Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { pageEnvelope } from '@/shared/api/page-total'
import { clearResourceCache } from '@/shared/resources'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, FilterPanel, Input, Pagination, type FilterChip } from '@/shared/ui'
import { ADD_BUTTON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import type { ResourceTextDto, ResourceTypeDto } from '@/types/resource-texts'
import { FormDialog } from '../shared/FormDialog'
import { NativeSelect } from '../shared/NativeSelect'
import { SaveToast, type Notice } from '../shared/SaveToast'
import { SettingsField } from '../shared/SettingsCard'
import { FRAME_EN, SettingsGate, SettingsLayout } from '../shared/SettingsFrame'
import { SettingsTable, type TableColumn } from '../shared/SettingsTable'
import { saveFailureMessage } from '../shared/use-object-form'
import { useScreenText } from '../shared/use-screen-text'
import {
  INITIAL_RESOURCES_QUERY,
  KEY_MAX_LENGTH,
  nextResourceSort,
  RESOURCE_PAGE_SIZES,
  resourcesParams,
  suggestionValues,
  SUGGEST_MIN_LENGTH,
  type ResourceSortColumn,
  type ResourcesQuery,
} from './resources-query'
import { CountUp } from '@/shared/ui/CountUp'
import { Textarea } from '@/shared/ui/Textarea'

const ITEM = PermissionItem.Resources
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const EDIT = { item: ITEM, action: PermissionAction.Edit }

// Keys from seats-admin-resource.html:303-314.
const TEXT = {
  Save: 'Save',
  Cancel: 'Cancel',
  Search: 'Search',
  Text: 'Text',
  Key: 'Key',
  Type: 'Type',
  Types: 'Types',
  Resources: 'Resources',
  Resource: 'Resource',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  Loading: 'Loading',
  Refresh: 'Refresh',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  Filters: 'Filters',
  Collapse: 'Collapse',
  Clear: 'Clear',
} as const

const EN = {
  // Hard-coded in legacy (:325-328 and :548-566).
  saved: 'Actions updated successfully',
  all: 'All',
  noItems: 'There are no items to show.',
  clearSearch: 'Clear search',
  editHint: 'Change the text people see for this key',
  keyHint: 'The key cannot be changed.',
  textHint: 'Leave empty to show nothing.',
  viewOnly: 'You can view this text but not change it.',
  first: 'First',
  last: 'Last',
  views: 'Views',
  resetFilters: 'Reset filters',
  expand: 'Expand',
  activeFilters: 'Active filters',
} as const

const loadTypes = (signal: AbortSignal) =>
  api.get<ResourceTypeDto[] | null>('ResourceApi/GetTypes', { signal })

const NO_SELECTION: ReadonlySet<number> = new Set()

export function ResourcesScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <ResourcesWorkspace />
    </SettingsGate>
  )
}

function ResourcesWorkspace() {
  const t = useScreenText(TEXT)
  const canEdit = useProfile().can(EDIT)
  const [query, setQuery] = useState<ResourcesQuery>(INITIAL_RESOURCES_QUERY)
  const [attempt, setAttempt] = useState(0)
  const [draftSearch, setDraftSearch] = useState('')
  const load = useCallback(
    async (signal: AbortSignal) =>
      pageEnvelope<ResourceTextDto>(
        await api.get<unknown>('ResourceApi/getResources', { query: resourcesParams(query), signal }),
        'ResourceApi/getResources',
      ),
    [query],
  )
  const read = useApiRead(`settings-resources:${JSON.stringify(query)}:${attempt}`, load)
  const types = useApiRead('settings-resource-types', loadTypes)

  const [suggestTerm, setSuggestTerm] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSuggestTerm(draftSearch.trim()), 250)
    return () => clearTimeout(timer)
  }, [draftSearch])
  const suggestKey =
    suggestTerm.length >= SUGGEST_MIN_LENGTH ? `settings-resource-suggest:${query.type}:${suggestTerm}` : null
  const loadSuggestions = useCallback(
    (signal: AbortSignal) =>
      api.get<ResourceTextDto[] | null>('ResourceApi/GetResourcesByString', {
        query: { query: suggestTerm, type: query.type },
        signal,
      }),
    [suggestTerm, query.type],
  )
  const suggestions = useApiRead(suggestKey, loadSuggestions)

  const [editing, setEditing] = useState<ResourceTextDto | null>(null)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const search = (value: string) => {
    setDraftSearch(value)
    setQuery(current => ({ ...current, value, pageNumber: 0 }))
  }

  const open = (row: ResourceTextDto) => {
    setDialogError(null)
    setEditing(row)
    setText(row.value ?? '')
  }

  const save = async () => {
    if (!editing || saving || !canEdit) return
    setSaving(true)
    try {
      await api.post<void>('ResourceApi/updateResource', {
        body: { key: editing.key, value: text, cultureName: editing.cultureName, type: editing.type },
      })
      setEditing(null)
      clearResourceCache()
      setNotice({ id: Date.now(), tone: 'success', message: EN.saved })
      setAttempt(value => value + 1)
    } catch (caught) {
      setDialogError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setSaving(false)
    }
  }

  const page = read.data
  const rows = page?.items ?? []
  const total = page?.totalRowCount ?? 0
  const sortable = (
    key: ResourceSortColumn,
    label: string,
    className?: string,
  ): TableColumn<ResourceTextDto> => ({
    key,
    label,
    sortable: true,
    className,
    render: row => row[key],
  })
  const columns: TableColumn<ResourceTextDto>[] = [
    {
      ...sortable('value', t('Text')),
      render: row => (
        <span className="block max-w-[32rem] truncate" title={row.value ?? undefined}>
          {row.value}
        </span>
      ),
    },
    {
      ...sortable('key', t('Key')),
      render: row => (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{row.key}</code>
      ),
    },
    {
      ...sortable('type', t('Type')),
      render: row =>
        row.type ? (
          <span className="rounded-full bg-brand/[0.07] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand">
            {row.type}
          </span>
        ) : null,
    },
  ]
  const countLabel = `${t('Resources')} ${total}`
  const chips: FilterChip[] = [
    ...(query.value
      ? [{ id: 'text', label: t('Text'), value: query.value, onRemove: () => search('') }]
      : []),
    ...(query.type
      ? [
          {
            id: 'type',
            label: t('Types'),
            value: query.type,
            onRemove: () => setQuery(current => ({ ...current, type: '', pageNumber: 0 })),
          },
        ]
      : []),
  ]
  const typeLabel = editing?.type ? `${t('Type')}: ${editing.type}` : ''
  const suggestionList = suggestionValues(suggestions.data ?? [])

  return (
    <SettingsLayout
      sectionId="resources"
      title={t('Resources')}
      meta={
        read.status === 'success' && rows.length > 0 ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
            <CountUp text={countLabel} />
          </span>
        ) : null
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />

      {/* Tab order is grouped by logic: filter panel (text, search, type), then the table and pager. */}
      <FilterPanel
        labels={{
          title: t('Filters'),
          views: EN.views,
          reset: EN.resetFilters,
          expand: EN.expand,
          collapse: t('Collapse'),
          activeFilters: EN.activeFilters,
          remove: label => `${t('Clear')} ${label}`,
        }}
        chips={chips}
        canReset={chips.length > 0 || Boolean(draftSearch)}
        onReset={() => {
          setDraftSearch('')
          setQuery(current => ({ ...current, value: '', type: '', pageNumber: 0 }))
        }}
        gridClassName="@[40rem]:grid-cols-[auto_minmax(12rem,16rem)]"
      >
        <form
          role="search"
          onSubmit={event => {
            event.preventDefault()
            search(draftSearch)
          }}
          className="contents"
        >
          <div className="flex min-w-0 items-end gap-2">
            {/* Same width as the shared SearchField on every list screen. */}
            <div className="w-72 max-w-full transition-[width] duration-300 ease-premium focus-within:w-96">
              <label htmlFor="resources-search" className="mb-1 block text-xs font-semibold text-slate-600">
                {t('Text')}
              </label>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
                />
                <Input
                  id="resources-search"
                  list="resources-suggestions"
                  value={draftSearch}
                  placeholder={EN.all}
                  autoComplete="off"
                  onChange={event => {
                    const value = event.target.value
                    if (suggestionList.includes(value)) search(value)
                    else setDraftSearch(value)
                  }}
                  className="h-9 w-full bg-white pr-9 pl-9"
                />
                {draftSearch || query.value ? (
                  <button
                    type="button"
                    aria-label={EN.clearSearch}
                    onClick={() => search('')}
                    className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                ) : null}
                <datalist id="resources-suggestions">
                  {suggestionList.map(value => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>
            </div>
            <button type="submit" className={cn(ADD_BUTTON_CLASS, 'min-h-9 min-w-0 px-5')}>
              <Search aria-hidden className="size-[18px]" />
              {t('Search')}
            </button>
          </div>
          <div className="min-w-0">
            <label htmlFor="resources-type" className="mb-1 block text-xs font-semibold text-slate-600">
              {t('Types')}
            </label>
            <NativeSelect
              id="resources-type"
              value={query.type}
              onChange={event => {
                const type = event.target.value
                setQuery(current => ({ ...current, type, pageNumber: 0 }))
              }}
            >
              <option value="">{EN.all}</option>
              {(types.data ?? []).map(option => (
                <option key={option.description} value={option.description}>
                  {option.description}
                </option>
              ))}
            </NativeSelect>
          </div>
        </form>
      </FilterPanel>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <SettingsTable
          rows={rows}
          columns={columns}
          status={read.status}
          sort={query.sortCol ? { column: query.sortCol, direction: query.sortDir || 'asc' } : undefined}
          onSort={column => setQuery(current => nextResourceSort(current, column as ResourceSortColumn))}
          selectable={false}
          selected={NO_SELECTION}
          onToggle={() => undefined}
          onTogglePage={() => undefined}
          onOpen={open}
          onRetry={read.reload}
          emptyText={EN.noItems}
          clearSearchLabel={EN.clearSearch}
          onClearSearch={query.value ? () => search('') : undefined}
          text={{
            loading: t('Loading'),
            error: t('AlertGeneralErrorDefault'),
            retry: t('Refresh'),
            selectAll: '',
            select: row => row.key,
          }}
        />
        {read.status === 'success' && total >= RESOURCE_PAGE_SIZES[0] ? (
          <Pagination
            id="resources-page-size"
            pageIndex={query.pageNumber}
            pageSize={query.pageSize}
            total={total}
            pageSizes={RESOURCE_PAGE_SIZES}
            onPageChange={pageNumber => setQuery(current => ({ ...current, pageNumber }))}
            onPageSizeChange={pageSize => setQuery(current => ({ ...current, pageSize, pageNumber: 0 }))}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: EN.first,
              previous: t('Previous'),
              next: t('Next'),
              last: EN.last,
            }}
          />
        ) : null}
      </div>

      <FormDialog
        open={editing !== null}
        onOpenChange={next => {
          if (!next) setEditing(null)
        }}
        icon={Languages}
        title={t('Resource')}
        hint={canEdit ? EN.editHint : EN.viewOnly}
        closeLabel={t('Cancel')}
        busy={saving}
        error={dialogError}
        onSubmit={() => void save()}
        className="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>
              {t('Cancel')}
            </Button>
            {canEdit ? (
              <Button type="submit" loading={saving} className="active:scale-[.98]">
                <Save aria-hidden className={cn('size-4', saving && 'animate-pulse')} />
                {t('Save')}
              </Button>
            ) : null}
          </>
        }
      >
        {editing ? (
          <>
            <SettingsField htmlFor="resource-key" label={t('Key')} hint={EN.keyHint}>
              <div className="relative">
                <KeyRound
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
                />
                <Input
                  id="resource-key"
                  value={editing.key}
                  maxLength={KEY_MAX_LENGTH}
                  readOnly
                  className="h-9 w-full bg-slate-50 pl-9 font-mono text-[13px] text-slate-600"
                />
              </div>
              {editing.type ? <p className="mt-2 text-xs text-slate-500">{typeLabel}</p> : null}
            </SettingsField>
            <SettingsField htmlFor="resource-text" label={t('Text')} hint={EN.textHint}>
              <Textarea
                id="resource-text"
                rows={5}
                value={text}
                autoFocus
                readOnly={!canEdit}
                disabled={saving}
                onChange={event => setText(event.target.value)}
                className="field-bloom w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm transition-[border-color,box-shadow] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 read-only:bg-slate-50"
              />
            </SettingsField>
          </>
        ) : null}
      </FormDialog>
    </SettingsLayout>
  )
}
