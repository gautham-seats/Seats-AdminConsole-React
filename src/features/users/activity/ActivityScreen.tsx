'use client'

import { Download, FileText, LogIn, SquareArrowOutUpRight, UserRound } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toApiError } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import {
  Button,
  DateRangeField,
  FilterPanel,
  Pagination,
  type FilterChip,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { AuditItemDto } from '@/types/audit'
import { StatusNotice, type Notice } from '../index/StatusNotice'
import { USERS_FALLBACK_ONLY, useUsersText, type UsersTextKey } from '../index/users-text'
import { LookupTypeahead } from '../details/LookupTypeahead'
import { ListTable, type ListColumn } from '../list/ListTable'
import { AreaGate } from '../UsersGate'
import { useUsersSections } from '../use-users-sections'
import { exportAudit, searchAuditUsers } from './activity-api'
import {
  AUDIT_PAGE_SIZES,
  auditDetailLink,
  auditItemKey,
  describeAuditDetail,
  formatDisplayDate,
  showAuditPager,
  SITE_OPTIONS,
  TYPE_OPTIONS,
} from './activity-log'
import { ExportDialog } from './ExportDialog'
import { useAuditList, type AuditHeader } from './use-audit-list'
import { CountUp } from '@/shared/ui/CountUp'

const ACTIVITY = { item: PermissionItem.Users, action: PermissionAction.Activity }
// Radix Select cannot hold an empty value, so "All" uses a stand-in.
const ALL = 'all'
// seats-toast closes after its default 3000 ms (seats-admin-audit.html:138,629-632; seats-toast.html:103).
const TOAST_MS = 3000
const USER_RESULTS = 10

const F = USERS_FALLBACK_ONLY

export function ActivityScreen() {
  return (
    <AreaGate permissions={[ACTIVITY]} deniedMessage={USERS_FALLBACK_ONLY.noPageAccess}>
      <ActivityWorkspace />
    </AreaGate>
  )
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function ActivityWorkspace() {
  const t = useUsersText()
  const sections = useUsersSections()
  const list = useAuditList()
  const { query } = list
  const [userText, setUserText] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const detailLabels = useMemo(
    () => ({ AdminSite: t('AdminSite'), WebSite: t('WebSite'), DefaultPage: t('DefaultPage') }),
    [t],
  )

  const columns = useMemo<ListColumn<AuditItemDto, AuditHeader>[]>(
    () => [
      {
        key: 'auditType',
        label: t('Item'),
        className: 'w-48 whitespace-nowrap font-medium text-foreground',
        render: item => t(auditItemKey(item.auditType)),
      },
      {
        key: 'icon',
        label: '',
        headerName: t('Type'),
        className: 'w-12',
        render: item => {
          const Icon = item.auditType === 'Page' ? FileText : LogIn
          return (
            <span className="grid size-7 place-items-center rounded-md border border-border bg-page text-slate-600 transition-colors group-hover:border-slate-300 group-hover:text-foreground">
              <Icon aria-hidden className="size-3.5" />
            </span>
          )
        },
      },
      {
        key: 'detail',
        label: t('Detail'),
        className: 'max-w-[28rem]',
        render: item => {
          const text = describeAuditDetail(item.detail, detailLabels)
          const href = auditDetailLink(item.detail)
          if (!href)
            return (
              <span className="block truncate text-slate-700" title={text}>
                {text}
              </span>
            )
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={text}
              className="group/link inline-flex max-w-full items-center gap-1.5 rounded-sm text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{text}</span>
              <SquareArrowOutUpRight
                aria-hidden
                className="size-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-70 group-focus-visible/link:opacity-70"
              />
            </a>
          )
        },
      },
      {
        key: 'accessDate',
        label: t('Date'),
        className: 'whitespace-nowrap tabular-nums text-slate-700',
        render: item => item.accessDate,
      },
      {
        key: 'userName',
        label: USERS_FALLBACK_ONLY.userNameColumn,
        className: 'whitespace-nowrap font-medium text-foreground',
        render: item => item.userName,
      },
      {
        key: 'userFullName',
        label: USERS_FALLBACK_ONLY.userFullNameColumn,
        className: 'whitespace-nowrap text-foreground',
        render: item => item.userFullName,
      },
    ],
    [t, detailLabels],
  )

  const runExport = async (exportTo: 0 | 1) => {
    setExporting(true)
    try {
      await exportAudit(query, exportTo)
      setNotice({
        id: Date.now(),
        tone: 'gray',
        message: t('ReportProcessing'),
        duration: TOAST_MS,
      })
    } catch (error) {
      const failure = toApiError(error)
      const message =
        failure.kind === 'blocked'
          ? USERS_FALLBACK_ONLY.exportBlocked
          : failure.kind === 'http' && failure.status === 400 && failure.serverMessage
            ? failure.serverMessage
            : t('AlertGeneralErrorDefault')
      setNotice({ id: Date.now(), tone: 'error', message, duration: TOAST_MS })
    } finally {
      setExporting(false)
      setExportOpen(false)
    }
  }

  // seats-admin-audit.html:129-136,479-482: userRequest errors open the error toast.
  const onUserSearchError = useCallback(
    () =>
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: t('AlertGeneralErrorDefault'),
        duration: TOAST_MS,
      }),
    [t],
  )

  const clean = () => {
    setUserText('')
    list.clean()
  }

  const totalText = `${t('Total')} ${list.total}`
  const hasRows = list.status === 'success' && list.rows.length > 0
  const optionText = (options: readonly { value: string; key: UsersTextKey }[], value: string) =>
    t(options.find(option => option.value === value)?.key ?? 'All')
  const chips: FilterChip[] = [
    ...(query.site
      ? [
          {
            id: 'site',
            label: t('Site'),
            value: optionText(SITE_OPTIONS, query.site),
            onRemove: () => list.setSite(''),
          },
        ]
      : []),
    ...(query.type
      ? [
          {
            id: 'type',
            label: t('Type'),
            value: optionText(TYPE_OPTIONS, query.type),
            onRemove: () => list.setType(''),
          },
        ]
      : []),
    ...(query.user
      ? [
          {
            id: 'user',
            label: t('User'),
            value: query.user.name,
            onRemove: () => {
              setUserText('')
              list.setUser(null)
            },
          },
        ]
      : []),
    {
      id: 'range',
      label: t('DateRange'),
      value: `${formatDisplayDate(query.range.from)} → ${formatDisplayDate(query.range.to)}`,
    },
  ]

  const selectFilter = (
    id: string,
    label: string,
    value: string,
    options: readonly { value: string; key: UsersTextKey }[],
    onChange: (value: string) => void,
  ) => (
    <FilterField label={label} htmlFor={id}>
      <Select value={value || ALL} onValueChange={next => onChange(next === ALL ? '' : next)}>
        <SelectTrigger
          id={id}
          className={cn(
            'h-10 bg-white transition-[border-color,box-shadow] duration-200 hover:border-slate-300',
            value && 'border-slate-400 font-medium',
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.key} value={option.value || ALL}>
              {t(option.key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterField>
  )

  return (
    <AreaWorkspace
      areaLabel={t('Users')}
      sections={sections}
      activeId="activity"
      title={t('Activity')}
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
        <Button
          variant="outline"
          size="sm"
          disabled={!hasRows}
          onClick={() => setExportOpen(true)}
          className="bg-white shadow-sm"
        >
          <Download aria-hidden className="size-4" />
          {t('Export')}
        </Button>
      }
    >
      <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />

      {/* seats-admin-audit.html:187-189: the Clean button is always enabled. */}
      <FilterPanel
        labels={{
          title: F.activityFilters,
          views: F.views,
          reset: F.clean,
          expand: F.expand,
          collapse: t('Collapse'),
          activeFilters: F.activeFilters,
          remove: label => `${F.remove} ${label}`,
        }}
        chips={chips}
        canReset
        onReset={clean}
        gridClassName="@[40rem]:grid-cols-3 @[72rem]:grid-cols-[minmax(9rem,12rem)_minmax(9rem,12rem)_minmax(12rem,16rem)_minmax(0,1fr)]"
      >
        {selectFilter('activity-site', t('Site'), query.site, SITE_OPTIONS, list.setSite)}
        {selectFilter('activity-type', t('Type'), query.type, TYPE_OPTIONS, list.setType)}
        <FilterField label={t('User')} htmlFor="activity-user">
          <LookupTypeahead
            id="activity-user"
            label={t('User')}
            placeholder={t('All')}
            text={userText}
            icon={UserRound}
            cacheKey="audit-users"
            maxResults={USER_RESULTS}
            minLength={0}
            clientFilter={false}
            serverOrder
            searchOnFocus
            arrowOpens={false}
            search={searchAuditUsers}
            onError={onUserSearchError}
            onTextChange={value => {
              setUserText(value)
              if (!value && query.user) list.setUser(null)
            }}
            onSelect={item => {
              setUserText(item.description ?? '')
              list.setUser({ id: item.id, name: item.description ?? '' })
            }}
          />
        </FilterField>
        <DateRangeField
          id="activity-range"
          start={query.range.from}
          end={query.range.to}
          formatDate={formatDisplayDate}
          onChange={(from, to) => list.setRange({ from, to })}
          className="@[40rem]:col-span-3 @[72rem]:col-span-1"
          labels={{
            dateRange: t('DateRange'),
            startDate: F.startDate,
            endDate: F.endDate,
            close: t('Close'),
            cancel: t('Cancel'),
            selectRange: t('SelectRange'),
            chooseMonthYear: F.chooseMonthYear,
            previous: t('Previous'),
            next: t('Next'),
            today: t('Today'),
            last7Days: F.last7Days,
            last14Days: F.last14Days,
            last30Days: F.last30Days,
          }}
        />
      </FilterPanel>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        <ListTable
          list={list}
          columns={columns}
          selectable={false}
          rowName={item => item.userName ?? ''}
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
        {list.status === 'success' && showAuditPager(list.total, list.pageSize) ? (
          <Pagination
            id="activity-page-size"
            pageIndex={list.pageIndex}
            pageSize={list.pageSize}
            total={list.total}
            pageSizes={AUDIT_PAGE_SIZES}
            onPageChange={list.setPage}
            onPageSizeChange={list.setPageSize}
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

      <ExportDialog
        open={exportOpen}
        pending={exporting}
        onOpenChange={setExportOpen}
        onExport={exportTo => void runExport(exportTo)}
        labels={{
          title: t('Export'),
          exportAs: t('ExportAs'),
          pdf: t('Pdf'),
          csv: t('Csv'),
          save: t('Save'),
          cancel: t('Cancel'),
          close: t('Close'),
        }}
      />
    </AreaWorkspace>
  )
}
