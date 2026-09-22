'use client'

import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { clearDevicesFlash, peekDevicesFlash } from '../devices-flash'
import { DevicesGate, ROOMS_ACCESS } from '../DevicesGate'
import { PAGE_SIZES, PAGER_MIN_ROWS } from '../index/device-query'
import { DevicesNotice, type DevicesNoticeState } from '../index/DevicesNotice'
import { DEVICES_FALLBACK_ONLY, isSilentFailure, useDevicesText } from '../index/devices-text'
import { useDevicesSections } from '../use-devices-sections'
import { deleteRooms } from './rooms-api'
import { NEW_ROOM_HREF, RoomsTable } from './RoomsTable'
import { useRoomsList } from './use-rooms-list'
import { CountUp } from '@/shared/ui/CountUp'

const ROOMS_ADD = { item: PermissionItem.Rooms, action: PermissionAction.Add }
const ROOMS_DELETE = { item: PermissionItem.Rooms, action: PermissionAction.Delete }

// swAlert timings for delete: 2.5 s success, 5 s error (swgrid.js:440-450).
const DURATION = { deleted: 2500, deleteFailed: 5000 } as const

export function RoomsIndexScreen() {
  return (
    <DevicesGate permission={ROOMS_ACCESS} noAccessText={DEVICES_FALLBACK_ONLY.noRoomAccess}>
      <RoomsWorkspace />
    </DevicesGate>
  )
}

function RoomsWorkspace() {
  const profile = useProfile()
  const canAdd = profile.can(ROOMS_ADD)
  const canDelete = profile.can(ROOMS_DELETE)
  const t = useDevicesText()
  const sections = useDevicesSections()
  const list = useRoomsList()

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<DevicesNoticeState | null>(() => {
    const flash = peekDevicesFlash()
    return flash
      ? { id: Date.now(), tone: 'success', message: flash.message, durationMs: flash.durationMs }
      : null
  })
  useEffect(clearDevicesFlash, [])
  const inFlight = useRef(false)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const confirmDelete = async () => {
    if (inFlight.current || list.selectedIds.length === 0) return
    inFlight.current = true
    setDeleting(true)
    try {
      await deleteRooms(list.selectedIds)
      setNotice({
        id: Date.now(),
        tone: 'success',
        message: t('AlertDeleteSuccessDefault'),
        durationMs: DURATION.deleted,
      })
      list.afterDelete()
    } catch (error) {
      const failure = toApiError(error)
      if (!isSilentFailure(failure)) {
        // A 400 shows the server's own reason, like the save path (swgrid.js:444-448).
        const message =
          failure.kind === 'auth'
            ? DEVICES_FALLBACK_ONLY.notAuthorised
            : failure.kind === 'blocked'
              ? DEVICES_FALLBACK_ONLY.safeMode
              : failure.kind === 'http' && failure.status === 400 && failure.serverMessage
                ? failure.serverMessage
                : t('AlertDeleteErrorDefault')
        setNotice({ id: Date.now(), tone: 'error', message, durationMs: DURATION.deleteFailed })
      }
    } finally {
      inFlight.current = false
      setDeleting(false)
      setConfirming(false)
    }
  }

  const page = list.read.status === 'success' ? list.read.data : undefined
  const selectedCount = canDelete ? list.selectedIds.length : 0
  const totalText = page ? `${t('Total')} ${page.totalRowCount}` : ''
  const selectedText = `${selectedCount} ${t('Selected')}`

  return (
    <AreaWorkspace
      areaLabel={t('Devices')}
      sections={sections}
      activeId="room"
      title={t('Room')}
      collapseLabel={t('Collapse')}
      expandLabel={DEVICES_FALLBACK_ONLY.expand}
      meta={
        page ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        ) : null
      }
      actions={
        canAdd ? (
          <Link href={NEW_ROOM_HREF} className={ADD_BUTTON_CLASS}>
            <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
            {t('Add')}
          </Link>
        ) : null
      }
    >
      <DevicesNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Close')} />

      <section
        aria-label={t('Room')}
        className="flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        {/* Tab order is visual: search, selection count, then Delete and Clear. */}
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <SearchField
            id="rooms-search"
            value={list.searchDraft}
            onValueChange={list.setSearchDraft}
            onSubmit={list.submitSearch}
            onClear={list.clearSearch}
            placeholder={`${t('Search')}...`}
            submitLabel={t('Search')}
            clearLabel={DEVICES_FALLBACK_ONLY.clearSearch}
            showClear={Boolean(list.searchDraft || list.query.search)}
          />
          {canDelete ? <span aria-hidden className="hidden h-6 w-px bg-border sm:block" /> : null}
          {canDelete ? (
            <SelectionActions
              groupLabel={DEVICES_FALLBACK_ONLY.selectionActions}
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

        <RoomsTable list={list} selectable={canDelete} t={t} />

        {page && page.totalRowCount >= PAGER_MIN_ROWS ? (
          <Pagination
            id="rooms-page-size"
            pageIndex={list.query.pageIndex}
            pageSize={list.query.pageSize}
            total={page.totalRowCount}
            pageSizes={PAGE_SIZES}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
            pageLabel={pageNumber => `${DEVICES_FALLBACK_ONLY.page} ${pageNumber}`}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: DEVICES_FALLBACK_ONLY.first,
              previous: t('Previous'),
              next: t('Next'),
              last: DEVICES_FALLBACK_ONLY.last,
            }}
          />
        ) : null}
      </section>

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
    </AreaWorkspace>
  )
}
