'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toApiError } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import {
  ConfirmDialog,
  Pagination,
  SearchField,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
} from '@/shared/ui'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { clearFlash, peekFlash } from '../users-flash'
import { UsersGate } from '../UsersGate'
import { useUsersSections } from '../use-users-sections'
import { GENERAL_ERROR_DURATION, isGeneralError } from './general-error'
import { StatusNotice, type Notice } from './StatusNotice'
import { NEW_USER_ROUTE, UsersTable } from './UsersTable'
import { useUsersList } from './use-users-list'
import { deleteUsers } from './users-api'
import { PAGE_SIZES, PAGER_MIN_ROWS } from './users-query'
import { USERS_FALLBACK_ONLY, useUsersText } from './users-text'
import { CountUp } from '@/shared/ui/CountUp'

const USERS_ADD = { item: PermissionItem.Users, action: PermissionAction.Add }
const USERS_DELETE = { item: PermissionItem.Users, action: PermissionAction.Delete }

export function UsersIndexScreen() {
  return (
    <UsersGate>
      <UsersWorkspace />
    </UsersGate>
  )
}

function UsersWorkspace() {
  const profile = useProfile()
  const canAdd = profile.can(USERS_ADD)
  const canDelete = profile.can(USERS_DELETE)
  const t = useUsersText()
  const list = useUsersList()
  const sections = useUsersSections()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(() => {
    const flash = peekFlash()
    // userDetailsController.js:189 showSaveSuccess(3500) survives the redirect to the list.
    return flash ? { id: 1, duration: 3500, ...flash } : null
  })
  const dismissNotice = useCallback(() => setNotice(null), [])

  useEffect(() => clearFlash(), [])

  const page = list.read.data
  // swgrid.js:828 keeps the pager while the grid reloads.
  const pagerPage = list.lastPage
  const selectedCount = canDelete ? list.selectedItems.length : 0

  const confirmDelete = async () => {
    const ids = list.selectedItems.map(item => item.id)
    setDeleting(true)
    try {
      await deleteUsers(ids)
      // swgrid.js:434-440: the empty 200 body lands in the error handler, which shows the success for 2.5 s.
      setNotice({ id: Date.now(), tone: 'success', duration: 2500, message: t('AlertDeleteSuccessDefault') })
      list.afterDelete()
    } catch (error) {
      const failure = toApiError(error)
      // swgrid.js:444-450 then swapp.js:204: 400 warns, other statuses end on the general error, no status the delete error.
      if (failure.kind === 'http' && failure.status === 400)
        setNotice({
          id: Date.now(),
          tone: 'warning',
          duration: 5000,
          message: failure.serverMessage || t('AlertDeleteErrorDefault'),
        })
      else if (isGeneralError(error))
        setNotice({
          id: Date.now(),
          tone: 'error',
          duration: GENERAL_ERROR_DURATION,
          message: t('AlertGeneralErrorDefault'),
        })
      else setNotice({ id: Date.now(), tone: 'error', duration: 5000, message: t('AlertDeleteErrorDefault') })
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const total = list.read.status === 'success' && page ? page.totalRowCount : null
  const totalText = total === null ? '' : `${t('Total')} ${total}`
  const selectedText = `${selectedCount} ${t('Selected')}`

  return (
    <AreaWorkspace
      areaLabel={t('Users')}
      sections={sections}
      activeId="user"
      title={t('User')}
      collapseLabel={t('Collapse')}
      expandLabel={USERS_FALLBACK_ONLY.expand}
      navigation="admin"
      meta={
        total === null ? null : (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        )
      }
      actions={
        canAdd ? (
          <Link href={NEW_USER_ROUTE} className={ADD_BUTTON_CLASS}>
            <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
            {t('Add')}
          </Link>
        ) : null
      }
    >
      <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <SearchField
            id="users-search"
            value={list.draft}
            onValueChange={list.setDraft}
            onSubmit={list.submitSearch}
            onClear={list.clearSearch}
            placeholder={`${t('Search')}...`}
            submitLabel={t('Search')}
            clearLabel={USERS_FALLBACK_ONLY.clearSearch}
            showClear={Boolean(list.draft || list.query.search)}
          />
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
        <UsersTable list={list} t={t} />
        {list.read.status !== 'error' && pagerPage && pagerPage.totalRowCount >= PAGER_MIN_ROWS ? (
          <Pagination
            id="users-page-size"
            pageIndex={list.query.pageIndex}
            pageSize={list.query.pageSize}
            total={pagerPage.totalRowCount}
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
