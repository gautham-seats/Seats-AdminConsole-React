'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { useCallback, useEffect, useState } from 'react'
import { toApiError } from '@/shared/api'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import {
  ConfirmDialog,
  Pagination,
  SearchField,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
} from '@/shared/ui'
import { isGeneralError } from '../index/general-error'
import { StatusNotice, type Notice } from '../index/StatusNotice'
import { PAGE_SIZES, PAGER_MIN_ROWS } from '../index/users-query'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import { clearFlash, peekFlash } from '../users-flash'
import { useUsersSections } from '../use-users-sections'
import type { ListState } from './list-state'
import { ListTable, type ListColumn, type RowAction } from './ListTable'
import { CountUp } from '@/shared/ui/CountUp'

export type AddLink = { kind: 'react' | 'legacy'; href: string }

// swgrid.js:434-451: a refused delete (400) is a 5 s warning with the server text, anything else a 5 s error.
export function deleteFailureNotice(error: unknown, fallback: string, generalError: string): Notice {
  const failure = toApiError(error)
  const id = Date.now()
  if (failure.kind === 'blocked') return { id, tone: 'error', message: USERS_FALLBACK_ONLY.safeMode }
  if (failure.kind === 'http' && failure.status === 400)
    return { id, tone: 'warning', message: failure.serverMessage ?? fallback, duration: 5000 }
  // swapp.js:168-206 then swaps in the general error text but the alert keeps the 5 s timer (swalert.js:77-87).
  return { id, tone: 'error', message: isGeneralError(error) ? generalError : fallback, duration: 5000 }
}

type ListWorkspaceProps<T extends { id: number }, K extends string> = {
  id: string
  activeId: string
  title: string
  list: ListState<T, K>
  columns: readonly ListColumn<T, K>[]
  rowName: (item: T) => string
  rowAction?: (item: T) => RowAction
  messageDuration?: number
  // swgrid.js:887-890: row checkboxes show whatever the Delete right (genericIndexController.js:14-15).
  alwaysSelectable?: boolean
  add: AddLink | null
  canDelete: boolean
  remove: (ids: readonly number[]) => Promise<void>
}

// Users-area list frame: search, selection, delete, table and pager (swgrid.js grid behaviour).
export function ListWorkspace<T extends { id: number }, K extends string>({
  id,
  activeId,
  title,
  list,
  columns,
  rowName,
  rowAction,
  messageDuration,
  alwaysSelectable = false,
  add,
  canDelete,
  remove,
}: ListWorkspaceProps<T, K>) {
  const t = useUsersText()
  const sections = useUsersSections()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(() => {
    const flash = peekFlash()
    return flash ? { id: 1, ...flash } : null
  })
  const dismissNotice = useCallback(() => setNotice(null), [])

  useEffect(() => clearFlash(), [])
  const showMessage = useCallback(
    (message: string) => setNotice({ id: Date.now(), tone: 'error', message, duration: messageDuration }),
    [messageDuration],
  )

  const selectedIds = [...list.selected]
  const selectedCount = canDelete ? selectedIds.length : 0

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await remove(selectedIds)
      // Ok() has an empty body, so jQuery's json parse fails into the status-200 branch (swgrid.js:438-440).
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertDeleteSuccessDefault'), duration: 2500 })
      list.afterDelete()
    } catch (error) {
      setNotice(deleteFailureNotice(error, t('AlertDeleteErrorDefault'), t('AlertGeneralErrorDefault')))
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const totalText = `${t('Total')} ${list.total}`
  const hasSelection = selectedCount > 0
  const selectedText = `${selectedCount} ${t('Selected')}`
  const addClass = ADD_BUTTON_CLASS
  const addContent = (
    <>
      <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
      {t('Add')}
    </>
  )

  return (
    <AreaWorkspace
      areaLabel={t('Users')}
      sections={sections}
      activeId={activeId}
      title={title}
      collapseLabel={t('Collapse')}
      expandLabel={USERS_FALLBACK_ONLY.expand}
      navigation="admin"
      meta={
        list.status === 'success' ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        ) : null
      }
      actions={
        add === null ? null : add.kind === 'react' ? (
          <Link href={add.href} className={addClass}>
            {addContent}
          </Link>
        ) : (
          <a href={add.href} className={addClass}>
            {addContent}
          </a>
        )
      }
    >
      <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <div
            className="contents"
            onBlur={event => {
              if (event.target instanceof HTMLInputElement) list.commitDraft?.()
            }}
          >
            <SearchField
              id={`${id}-search`}
              value={list.draft}
              onValueChange={list.setDraft}
              onSubmit={list.submitSearch}
              onClear={list.clearSearch}
              placeholder={`${t('Search')}...`}
              submitLabel={t('Search')}
              clearLabel={USERS_FALLBACK_ONLY.clearSearch}
              showClear={Boolean(list.draft || list.search)}
            />
          </div>
          {canDelete ? <span aria-hidden className="hidden h-6 w-px bg-border sm:block" /> : null}
          {canDelete ? (
            <SelectionActions
              count={selectedCount}
              selectedLabel={selectedText}
              clearLabel={t('Clear')}
              onClear={list.clearSelection}
              showClear={false}
            />
          ) : null}
          {canDelete ? (
            <div className="mr-4 ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!hasSelection}
                className={selectionButtonClass(hasSelection)}
              >
                <Trash2 aria-hidden />
                {t('Delete')}
              </button>
              <SelectionClear active={hasSelection} label={t('Clear')} onClear={list.clearSelection} />
            </div>
          ) : null}
        </div>
        <ListTable
          list={list}
          columns={columns}
          selectable={canDelete || alwaysSelectable}
          rowName={rowName}
          rowAction={rowAction}
          onMessage={showMessage}
          text={{
            loading: t('Loading'),
            error: t('AlertGeneralErrorDefault'),
            retry: t('Refresh'),
            empty: USERS_FALLBACK_ONLY.noItems,
            clearSearch: USERS_FALLBACK_ONLY.clearSearch,
            selectAll: t('SelectAll'),
            select: USERS_FALLBACK_ONLY.select,
          }}
        />
        {list.status === 'success' && list.total >= PAGER_MIN_ROWS ? (
          <Pagination
            id={`${id}-page-size`}
            pageIndex={list.pageIndex}
            pageSize={list.pageSize}
            total={list.total}
            pageSizes={PAGE_SIZES}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            pageLabel={pageNumber => `${USERS_FALLBACK_ONLY.page} ${pageNumber}`}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: USERS_FALLBACK_ONLY.first,
              previous: t('Previous'),
              next: t('Next'),
              last: USERS_FALLBACK_ONLY.last,
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
        onConfirm={confirmDelete}
        pending={deleting}
      />
    </AreaWorkspace>
  )
}
