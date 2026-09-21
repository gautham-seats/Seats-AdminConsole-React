'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import Link from 'next/link'
import { ENGAGEMENT_GROUP, ENGAGEMENT_ROUTE } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import {
  Checkbox,
  DelayedLoading,
  ErrorState,
  Pagination,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
  type CheckboxState,
} from '@/shared/ui'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import type { EngagementModelSort } from '@/types/engagement'
import {
  ENGAGEMENT_ADD,
  ENGAGEMENT_RECALCULATE,
  engagementFailureText,
  EngagementGate,
  EngagementNoticeBar,
  clearEngagementFlash,
  peekEngagementFlash,
  type EngagementNotice,
} from '../EngagementFrame'
import { ENGAGEMENT_FALLBACK_ONLY, useEngagementText } from '../engagement-text'
import { createEngagementModel, fetchEngagementModels, recalculateModels } from './engagement-api'
import { AddModelDialog, RecalculateDialog } from './EngagementDialogs'
import {
  formatLastRun,
  INITIAL_MODEL_SORT,
  MODEL_PAGE_SIZE,
  MODEL_PAGE_SIZES,
  nextModelSort,
  sortModels,
  toRecalculateBody,
} from './engagement-models'
import { EmptyState } from '@/shared/ui/EmptyState'
import { CountUp } from '@/shared/ui/CountUp'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'

const NO_IDS: ReadonlySet<number> = new Set()
const HEAD =
  'sticky top-0 z-10 h-10 bg-brand px-3 text-left align-middle text-xs font-medium tracking-[0.02em] whitespace-nowrap text-white'
export function EngagementConfigurationScreen() {
  return (
    <EngagementGate>
      <ConfigurationList />
    </EngagementGate>
  )
}

function ConfigurationList() {
  const t = useEngagementText()
  const profile = useProfile()
  const canAdd = profile.can(ENGAGEMENT_ADD)
  const canRecalculate = profile.can(ENGAGEMENT_RECALCULATE)
  const load = useCallback((signal: AbortSignal) => fetchEngagementModels(signal), [])
  const read = useApiRead('engagement:models', load)
  const [selected, setSelected] = useState<ReadonlySet<number>>(NO_IDS)
  const [sort, setSort] = useState<EngagementModelSort>(INITIAL_MODEL_SORT)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(MODEL_PAGE_SIZE)
  const [dialog, setDialog] = useState<'add' | 'recalculate' | null>(null)
  const [pending, setPending] = useState(false)
  // The saved notice from the model editor (seats-admin-engagement-model.html:1561-1565 toasts, then goes back).
  const [notice, setNotice] = useState<EngagementNotice | null>(peekEngagementFlash)
  const dismiss = useCallback(() => setNotice(null), [])
  useEffect(() => clearEngagementFlash(), [])

  const models = useMemo(() => read.data ?? [], [read.data])
  const rows = useMemo(() => sortModels(models, sort), [models, sort])
  const pageRows = rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
  const selectedModels = models.filter(model => selected.has(model.id))
  const allState: CheckboxState =
    selected.size === 0 ? false : selected.size === models.length ? true : 'mixed'

  const say = (tone: EngagementNotice['tone'], message: string) =>
    setNotice({ id: Date.now(), tone, message })
  const failure = (error: unknown, fallback: string) => {
    const problem = toApiError(error)
    return problem.kind === 'blocked' ? ENGAGEMENT_FALLBACK_ONLY.safeMode : fallback
  }

  const toggle = (id: number) =>
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const sections = useMemo(
    () =>
      ENGAGEMENT_GROUP.map(link => ({
        ...link,
        label: link.id === 'engagement-history' ? t('History') : t('Configuration'),
      })),
    [t],
  )
  const totalText = `${t('Total')} ${models.length}`
  const selectedText = `${selected.size} ${t('Selected')}`
  const SortIcon = (column: EngagementModelSort['column']) =>
    sort.column !== column ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown

  const header = (column: EngagementModelSort['column'], label: string) => {
    const Icon = SortIcon(column)
    return (
      <th
        scope="col"
        aria-sort={sort.column === column ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={HEAD}
      >
        <button
          type="button"
          onClick={() => {
            setSort(current => nextModelSort(current, column))
            setPageIndex(0)
          }}
          className="inline-flex items-center gap-1.5 rounded-sm focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          {label}
          <Icon
            aria-hidden
            className={cn('size-3.5', sort.column === column ? 'opacity-100' : 'opacity-60')}
          />
        </button>
      </th>
    )
  }

  return (
    <AreaWorkspace
      areaLabel={t('Engagement')}
      sections={sections}
      activeId="engagement-configuration"
      title={t('Configuration')}
      collapseLabel={t('Collapse')}
      expandLabel={ENGAGEMENT_FALLBACK_ONLY.expand}
      navigation="admin"
      meta={
        read.status === 'success' ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        ) : null
      }
      actions={
        canAdd ? (
          <button type="button" onClick={() => setDialog('add')} className={ADD_BUTTON_CLASS}>
            <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
            {t('Add')}
          </button>
        ) : null
      }
    >
      <EngagementNoticeBar notice={notice} onDismiss={dismiss} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {/* Tab order is visual: selection count, then Re-calculate and Clear. */}
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <SelectionActions
            count={selected.size}
            selectedLabel={selectedText}
            clearLabel={t('Clear')}
            onClear={() => setSelected(NO_IDS)}
            showClear={!canRecalculate}
          />
          {canRecalculate ? (
            <div className="mr-4 ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setDialog('recalculate')}
                className={selectionButtonClass(selected.size > 0, 'outline')}
              >
                <RefreshCw aria-hidden />
                {t('ReCalculate')}
              </button>
              <SelectionClear
                active={selected.size > 0}
                label={t('Clear')}
                onClear={() => setSelected(NO_IDS)}
              />
            </div>
          ) : null}
        </div>
        {read.status === 'error' ? (
          <ErrorState
            message={t('AlertGeneralErrorDefault')}
            retryLabel={t('Refresh')}
            onRetry={read.reload}
            error={read.error}
            className="m-6"
          />
        ) : read.status !== 'success' ? (
          <div className="min-h-60">
            <DelayedLoading active label={t('Loading')} />
          </div>
        ) : models.length === 0 ? (
          <EmptyState title={ENGAGEMENT_FALLBACK_ONLY.noItems} className="min-h-60" />
        ) : (
          <div className="min-h-0 flex-1 scroll-pt-10 overflow-auto">
            <ScrollEdges />
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th scope="col" className={cn(HEAD, 'w-12 pl-4')}>
                    <Checkbox
                      checked={allState}
                      onCheckedChange={() =>
                        setSelected(allState === true ? NO_IDS : new Set(models.map(model => model.id)))
                      }
                      label={t('SelectAll')}
                      className="border-white bg-transparent aria-checked:bg-white aria-checked:text-brand"
                    />
                  </th>
                  {header('modelName', t('Name'))}
                  {header('isActive', t('IsActive'))}
                  <th scope="col" className={HEAD}>
                    {t('LastRun')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((model, index) => {
                  const lastRun = formatLastRun(model.lastRun)
                  return (
                    <tr
                      key={model.id}
                      style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
                      className={cn(
                        'group animate-row-in transition-colors motion-reduce:animate-none',
                        selected.has(model.id) ? 'bg-primary/[0.05]' : 'hover:bg-slate-50',
                      )}
                    >
                      <td className="border-b border-border py-2.5 pl-4">
                        <Checkbox
                          checked={selected.has(model.id)}
                          onCheckedChange={() => toggle(model.id)}
                          label={`${t('Select')} ${model.modelName ?? ''}`}
                        />
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <Link
                          href={`${ENGAGEMENT_ROUTE}/${model.id}`}
                          // An empty model name would leave this link with no accessible name.
                          aria-label={
                            model.modelName ? undefined : `${ENGAGEMENT_FALLBACK_ONLY.model} ${model.id}`
                          }
                          className="font-semibold text-foreground underline-offset-4 group-hover:text-brand hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {model.modelName}
                        </Link>
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            model.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {model.isActive
                            ? ENGAGEMENT_FALLBACK_ONLY.active
                            : ENGAGEMENT_FALLBACK_ONLY.inactive}
                        </span>
                      </td>
                      <td className="border-b border-border px-3 py-2.5 tabular-nums text-slate-700">
                        {lastRun ?? (
                          <span className="text-muted-foreground">{ENGAGEMENT_FALLBACK_ONLY.never}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {read.status === 'success' ? (
          <Pagination
            id="engagement-page-size"
            pageIndex={pageIndex}
            pageSize={pageSize}
            total={models.length}
            pageSizes={MODEL_PAGE_SIZES}
            onPageChange={setPageIndex}
            onPageSizeChange={size => {
              setPageSize(size)
              setPageIndex(0)
            }}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: ENGAGEMENT_FALLBACK_ONLY.first,
              previous: t('Previous'),
              next: t('Next'),
              last: ENGAGEMENT_FALLBACK_ONLY.last,
            }}
          />
        ) : null}
      </div>

      {dialog === 'add' ? (
        <AddModelDialog
          models={models}
          pending={pending}
          t={t}
          onClose={() => setDialog(null)}
          onSave={async form => {
            setPending(true)
            try {
              await createEngagementModel(form)
              setDialog(null)
              say('success', ENGAGEMENT_FALLBACK_ONLY.created)
              read.reload()
            } catch (error) {
              say('error', failure(error, t('AlertSaveErrorDefault')))
            } finally {
              setPending(false)
            }
          }}
        />
      ) : null}

      {dialog === 'recalculate' ? (
        <RecalculateDialog
          selected={selectedModels}
          pending={pending}
          t={t}
          onClose={() => setDialog(null)}
          onRun={async (selectAll, reSync, start, end) => {
            setPending(true)
            try {
              await recalculateModels(toRecalculateBody(selectedModels, selectAll, reSync, start, end))
              setDialog(null)
              say('success', ENGAGEMENT_FALLBACK_ONLY.recalculating)
            } catch (error) {
              say('error', engagementFailureText(error, t('AlertGeneralErrorDefault')))
            } finally {
              setPending(false)
            }
          }}
        />
      ) : null}
    </AreaWorkspace>
  )
}
