'use client'

import Link from 'next/link'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
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
import type { DeviceListItemDto, ExportTo } from '@/types/devices'
import { clearDevicesFlash, peekDevicesFlash } from '../devices-flash'
import { DevicesGate } from '../DevicesGate'
import { useDevicesSections } from '../use-devices-sections'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { activeFilterKeys } from './device-filters'
import { exportBody, PAGE_SIZES, PAGER_MIN_ROWS } from './device-query'
import { deleteDevices, exportDevices, reprocessSwipes } from './devices-api'
import { DevicesNotice, type DevicesNoticeState, type DevicesNoticeTone } from './DevicesNotice'
import { NEW_DEVICE_HREF, DevicesTable } from './DevicesTable'
import { DEVICES_FALLBACK_ONLY, isSilentFailure, useDevicesText } from './devices-text'
import { ExportMenu } from './ExportMenu'
import { DeviceFilterPanel } from './DeviceFilterPanel'
import { ReprocessDialog } from './ReprocessDialog'
import { useDevicesList } from './use-devices-list'
import { useBatteryColumn, useLocationOptions } from './use-devices-setup'
import { CountUp } from '@/shared/ui/CountUp'

const DEVICES_ADD = { item: PermissionItem.Devices, action: PermissionAction.Add }
const DEVICES_DELETE = { item: PermissionItem.Devices, action: PermissionAction.Delete }
const DEVICES_REPROCESS = { item: PermissionItem.Devices, action: PermissionAction.ReprocessDeviceSwipes }

// swAlert timings: delete 2.5 s / 5 s (swgrid.js:440-450), reprocess 3 s (deviceIndexController.js:24-28), export 6 s / 10 s.
const DURATION = {
  deleted: 2500,
  deleteFailed: 5000,
  reprocess: 3000,
  exportQueued: 6000,
  exportFailed: 10000,
} as const

export function DevicesIndexScreen() {
  return (
    <DevicesGate>
      <DevicesWorkspace />
    </DevicesGate>
  )
}

function DevicesWorkspace() {
  const profile = useProfile()
  const canAdd = profile.can(DEVICES_ADD)
  const canDelete = profile.can(DEVICES_DELETE)
  const canReprocess = profile.can(DEVICES_REPROCESS)
  const t = useDevicesText()
  const sections = useDevicesSections()
  const list = useDevicesList()
  const locations = useLocationOptions(list.query.filters.siteId, list.query.filters.buildingId)
  const battery = useBatteryColumn()
  const batteryEnabled = battery.data === true

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reprocessTarget, setReprocessTarget] = useState<DeviceListItemDto | null>(null)
  const [reprocessing, setReprocessing] = useState(false)
  const [exporting, setExporting] = useState<ExportTo | null>(null)
  const [notice, setNotice] = useState<DevicesNoticeState | null>(() => {
    const flash = peekDevicesFlash()
    return flash
      ? { id: Date.now(), tone: 'success', message: flash.message, durationMs: flash.durationMs }
      : null
  })
  useEffect(clearDevicesFlash, [])
  const inFlight = useRef(false)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const notify = (tone: DevicesNoticeTone, message: string, durationMs: number) =>
    setNotice({ id: Date.now(), tone, message, durationMs })

  // Safe mode and session redirects explain themselves; a 400 may carry the server's validation message.
  const failure = (error: unknown, fallback: string, useServerMessage: boolean): string | null => {
    const problem = toApiError(error)
    if (isSilentFailure(problem)) return null
    if (problem.kind === 'auth') return DEVICES_FALLBACK_ONLY.notAuthorised
    if (problem.kind === 'blocked') return DEVICES_FALLBACK_ONLY.safeMode
    if (useServerMessage && problem.kind === 'http' && problem.status === 400 && problem.serverMessage) {
      return problem.serverMessage
    }
    return fallback
  }

  const runOnce = async (task: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      await task()
    } finally {
      inFlight.current = false
    }
  }

  const confirmDelete = () =>
    runOnce(async () => {
      const ids = list.selectedItems.map(item => item.id)
      if (ids.length === 0) return
      setDeleting(true)
      try {
        await deleteDevices(ids)
        notify('success', t('AlertDeleteSuccessDefault'), DURATION.deleted)
        list.afterDelete()
      } catch (error) {
        const message = failure(error, t('AlertDeleteErrorDefault'), true)
        if (message) notify('error', message, DURATION.deleteFailed)
      } finally {
        setDeleting(false)
        setConfirming(false)
      }
    })

  const confirmReprocess = (device: DeviceListItemDto, date: string) =>
    runOnce(async () => {
      setReprocessing(true)
      try {
        await reprocessSwipes(device.id, date)
        setReprocessTarget(null)
        notify('success', t('AlertSaveSucceededDefault'), DURATION.reprocess)
      } catch (error) {
        const message = failure(error, t('AlertSaveErrorDefault'), false)
        if (message) notify('error', message, DURATION.reprocess)
      } finally {
        setReprocessing(false)
      }
    })

  const startExport = (exportTo: ExportTo) =>
    runOnce(async () => {
      setExporting(exportTo)
      try {
        await exportDevices(exportBody(list.query, exportTo))
        notify('info', t('ReportProcessing'), DURATION.exportQueued)
      } catch (error) {
        const message = failure(error, t('AlertSaveErrorDefault'), true)
        if (message) notify('error', message, DURATION.exportFailed)
      } finally {
        setExporting(null)
      }
    })

  const page = list.read.status === 'success' ? list.read.data : undefined
  const selectable = canDelete || canReprocess
  const selectedCount = selectable ? list.selectedItems.length : 0
  // The Battery column flag is scraped from a legacy view. If that view cannot be read the column stays
  // hidden, but the device list still renders: an optional column must never hide the data itself.
  const setupStatus = battery.status === 'loading' || battery.status === 'idle' ? 'loading' : 'success'
  const hasFilters = Boolean(list.query.search) || activeFilterKeys(list.query.filters).length > 0
  const totalText = page ? `${t('Total')} ${page.totalRowCount}` : ''
  const selectedText = `${selectedCount} ${t('Selected')}`

  return (
    <AreaWorkspace
      areaLabel={t('Devices')}
      sections={sections}
      activeId="device"
      title={t('Device')}
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
        <div className="flex items-center gap-2">
          <ExportMenu pending={exporting} onExport={startExport} t={t} />
          {canAdd ? (
            <Link href={NEW_DEVICE_HREF} className={ADD_BUTTON_CLASS}>
              <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
              {t('Add')}
            </Link>
          ) : null}
        </div>
      }
    >
      <DevicesNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Close')} />

      <DeviceFilterPanel
        filters={list.query.filters}
        search={list.query.search}
        onChange={list.setFilters}
        onClearSearch={list.clearSearch}
        locations={locations}
        batteryEnabled={batteryEnabled}
        total={page?.totalRowCount}
        t={t}
      />
      <section
        aria-label={t('Devices')}
        className="flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        {/* Selection count and Clear sit beside search; Reprocess and Delete sit right. Tab order is visual. */}
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <SearchField
            id="devices-search"
            value={list.searchDraft}
            onValueChange={list.setSearchDraft}
            onSubmit={list.submitSearch}
            onClear={list.clearSearch}
            placeholder={`${t('Search')}...`}
            submitLabel={t('Search')}
            clearLabel={DEVICES_FALLBACK_ONLY.clearSearch}
            showClear={Boolean(list.searchDraft || list.query.search)}
          />
          {selectable ? <span aria-hidden className="hidden h-6 w-px bg-border sm:block" /> : null}
          {selectable ? (
            <SelectionActions
              groupLabel={DEVICES_FALLBACK_ONLY.selectionActions}
              count={selectedCount}
              selectedLabel={selectedText}
              clearLabel={t('Clear')}
              onClear={list.clearSelection}
              showClear={false}
            />
          ) : null}
          {selectable ? (
            <div className="mr-4 ml-auto flex flex-wrap items-center gap-2">
              {canReprocess ? (
                <button
                  type="button"
                  onClick={() => setReprocessTarget(list.selectedItems[0] ?? null)}
                  disabled={selectedCount !== 1}
                  className={selectionButtonClass(selectedCount === 1, 'outline')}
                >
                  <RefreshCw aria-hidden />
                  {t('ReprocessCardSwipes')}
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={selectedCount === 0}
                  className={selectionButtonClass(selectedCount > 0)}
                >
                  <Trash2 aria-hidden />
                  {t('Delete')}
                </button>
              ) : null}
              <SelectionClear active={selectedCount > 0} label={t('Clear')} onClear={list.clearSelection} />
            </div>
          ) : null}
        </div>
        <DevicesTable
          list={list}
          batteryEnabled={batteryEnabled}
          setupStatus={setupStatus}
          onSetupRetry={battery.reload}
          selectable={selectable}
          hasFilters={hasFilters}
          t={t}
        />

        {page && page.totalRowCount >= PAGER_MIN_ROWS ? (
          <Pagination
            id="devices-page-size"
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
        onConfirm={confirmDelete}
        pending={deleting}
      />

      <ReprocessDialog
        device={reprocessTarget}
        pending={reprocessing}
        onClose={() => setReprocessTarget(null)}
        onConfirm={confirmReprocess}
        t={t}
      />
    </AreaWorkspace>
  )
}
