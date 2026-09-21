'use client'

import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toApiError, type ApiRead } from '@/shared/api'
import {
  ConfirmDialog,
  Pagination,
  SearchField,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
} from '@/shared/ui'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { clearFlash, peekFlash } from './flash'
import { PAGE_SIZES, PAGER_MIN_ROWS } from './list-model'
import { SaveToast, type Notice } from './SaveToast'
import { FRAME_EN, SettingsLayout, type WorkspaceArea } from './SettingsFrame'
import { SettingsTable, type TableColumn } from './SettingsTable'
import type { ClientList } from './use-client-list'
import { useScreenText } from './use-screen-text'
import { CountUp } from '@/shared/ui/CountUp'

// Shared list text; keys as in swgrid.js and _DeleteConfirmationPartial.cshtml.
const LIST_TEXT = {
  Add: 'Add',
  Delete: 'Delete',
  Search: 'Search',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  Clear: 'Clear',
  Selected: 'Selected',
  SelectAll: 'Select All',
  Total: 'Total',
  Loading: 'Loading',
  Refresh: 'Refresh',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
} as const

const LIST_EN = {
  noItems: 'There are no items to show.',
  clearSearch: 'Clear search',
  first: 'First',
  last: 'Last',
  select: 'Select',
} as const

type ClientListScreenProps<T extends { id: number }> = {
  sectionId: string
  title: string
  read: ApiRead<T[] | null>
  list: ClientList<T>
  columns: readonly TableColumn<T>[]
  rowLabel: (row: T) => string
  addHref: string | null
  onOpen?: (row: T) => void
  canDelete: boolean
  deleteRows?: (ids: readonly number[]) => Promise<unknown>
  area?: WorkspaceArea
  searchable?: boolean
  children?: ReactNode
}

export function ClientListScreen<T extends { id: number }>({
  sectionId,
  title,
  read,
  list,
  columns,
  rowLabel,
  addHref,
  onOpen,
  canDelete,
  deleteRows,
  area,
  searchable = true,
  children,
}: ClientListScreenProps<T>) {
  const t = useScreenText(LIST_TEXT)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(peekFlash)
  useEffect(clearFlash, [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const confirmDelete = async () => {
    if (!deleteRows) return
    setDeleting(true)
    try {
      await deleteRows([...list.selected])
      list.resetAfterDelete()
      read.reload()
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertDeleteSuccessDefault') })
    } catch (caught) {
      const error = toApiError(caught)
      const message =
        error.kind === 'blocked'
          ? FRAME_EN.safeMode
          : error.kind === 'http' && error.status === 400 && error.serverMessage
            ? error.serverMessage
            : t('AlertDeleteErrorDefault')
      setNotice({ id: Date.now(), tone: 'error', message })
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const selectable = canDelete && deleteRows !== undefined
  const selectedCount = selectable ? list.selected.size : 0
  const total = read.status === 'success' ? list.filtered.length : null
  const totalLabel = `${t('Total')} ${total ?? 0}`
  const selectedLabel = `${selectedCount} ${t('Selected')}`

  return (
    <SettingsLayout
      sectionId={sectionId}
      title={title}
      area={area}
      meta={
        total === null ? null : (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
            <CountUp text={totalLabel} />
          </span>
        )
      }
      actions={
        addHref ? (
          <Link href={addHref} className={ADD_BUTTON_CLASS}>
            <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
            {t('Add')}
          </Link>
        ) : null
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      {children}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Tab order is visual: search, selection count, Delete, Clear, then the table. */}
        {searchable || selectable ? (
          <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
            {searchable ? (
              <SearchField
                id={`${sectionId}-search`}
                value={list.draft}
                onValueChange={list.setDraft}
                onSubmit={list.submitSearch}
                onClear={list.clearSearch}
                placeholder={`${t('Search')}...`}
                submitLabel={t('Search')}
                clearLabel={LIST_EN.clearSearch}
                showClear={Boolean(list.draft || list.search)}
              />
            ) : null}
            {searchable && selectable ? (
              <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />
            ) : null}
            {selectable ? (
              <SelectionActions
                count={selectedCount}
                selectedLabel={selectedLabel}
                clearLabel={t('Clear')}
                onClear={list.clearSelection}
                showClear={false}
              />
            ) : null}
            {selectable ? (
              <div className="mr-4 ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={selectedCount === 0}
                  className={selectionButtonClass(selectedCount > 0)}
                >
                  <Trash2 aria-hidden />
                  {t('Delete')}
                </button>
                <SelectionClear active={selectedCount > 0} label={t('Clear')} onClear={list.clearSelection} />
              </div>
            ) : null}
          </div>
        ) : null}
        <SettingsTable
          rows={list.visible}
          columns={columns}
          status={read.status}
          sort={list.sort}
          onSort={list.sortBy}
          selectable={selectable}
          selected={list.selected}
          onToggle={list.toggle}
          onTogglePage={list.togglePage}
          onOpen={onOpen}
          onRetry={read.reload}
          emptyText={LIST_EN.noItems}
          clearSearchLabel={LIST_EN.clearSearch}
          onClearSearch={list.search ? list.clearSearch : undefined}
          text={{
            loading: t('Loading'),
            error: t('AlertGeneralErrorDefault'),
            retry: t('Refresh'),
            selectAll: t('SelectAll'),
            select: row => `${LIST_EN.select} ${rowLabel(row)}`,
          }}
        />
        {read.status === 'success' && list.filtered.length >= PAGER_MIN_ROWS ? (
          <Pagination
            id={`${sectionId}-page-size`}
            pageIndex={list.pageIndex}
            pageSize={list.pageSize}
            total={list.filtered.length}
            pageSizes={PAGE_SIZES}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: LIST_EN.first,
              previous: t('Previous'),
              next: t('Next'),
              last: LIST_EN.last,
            }}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('Delete')}
        message={t('DeleteConfirmationMsg')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        onConfirm={() => void confirmDelete()}
        pending={deleting}
      />
    </SettingsLayout>
  )
}

export function idsQuery(controller: string, ids: readonly number[]): string {
  return `${controller}?${ids.map(id => `ids=${encodeURIComponent(String(id))}`).join('&')}`
}
