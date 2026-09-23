'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ExternalLink,
  Filter,
  Fingerprint,
  Lock,
  Network,
  Layers,
  Save,
  SearchX,
  Undo2,
} from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { ENGAGEMENT_ROUTE, legacyHref, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import { buttonVariants, Checkbox, DateRangeField, DelayedLoading, ErrorState, Input } from '@/shared/ui'
import { ButtonSpinner } from '@/shared/ui/Button'
import { cn } from '@/shared/ui/cn'
import {
  engagementFailureText,
  EngagementGate,
  EngagementNoticeBar,
  EngagementWorkspace,
  setEngagementFlash,
  type EngagementNotice,
} from '../EngagementFrame'
import { formatDate } from '../configuration/engagement-models'
import { ENGAGEMENT_FALLBACK_ONLY, useEngagementText } from '../engagement-text'
import {
  buildingRequestBody,
  NO_COUNTS,
  parseModelBuilding,
  type BuildingRequestBody,
  type ModelBuilding,
  type StudentCounts,
} from './building-model'
import { ConstraintRules } from './ConstraintRules'
import { DatasetBuilding } from './DatasetBuilding'
import {
  countStudentsInModelBuilding,
  exportProfileSet,
  fetchModelDetails,
  runEngagementNode,
  saveEngagementModel,
} from './details-api'
import {
  hasConstraint,
  parseModelId,
  toDetailsForm,
  toSaveBody,
  validateDetails,
  type DetailsError,
  type DetailsForm,
  type EngagementNode,
  type EngagementModelView,
  type NodeFields,
} from './details-model'
import { NODE_FIELD_TEXT, nodeInputId, NodeTree } from './NodeTree'
import {
  ADD_BUTTON_CLASS,
  CANCEL_BUTTON_CLASS,
  EXPORT_BUTTON_CLASS,
  EXPORT_ICON_CLASS,
} from '@/shared/ui/add-button'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from '@/shared/ui/nav-band'

// Save needs Engagement + Edit (Details.cshtml:26-31, EngagementApiController.cs:841).
export const ENGAGEMENT_EDIT = { item: PermissionItem.Engagement, action: PermissionAction.Edit }

export function EngagementModelDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <EngagementGate>
      <ModelDetails idParam={idParam} />
    </EngagementGate>
  )
}

function ModelDetails({ idParam }: { idParam: string }) {
  const t = useEngagementText()
  const id = parseModelId(idParam)
  const load = useCallback(
    (signal: AbortSignal) => (id === null ? Promise.resolve(null) : fetchModelDetails(id, signal)),
    [id],
  )
  const read = useApiRead(id === null ? null : `engagement-model:${id}`, load)
  const notFound = id === null || (read.status === 'success' && read.data === null)

  if (read.status === 'success' && read.data)
    return <ModelEditor key={read.data.applied.id} view={read.data} />

  let content: ReactNode
  if (notFound) {
    content = (
      <div className="flex animate-rise-in flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <SearchX aria-hidden className="size-5" />
        </span>
        <p className="text-[15px] font-semibold text-foreground">{ENGAGEMENT_FALLBACK_ONLY.notFound}</p>
        <Link
          href={ENGAGEMENT_ROUTE}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-white')}
        >
          <ArrowLeft aria-hidden className="size-4" />
          {t('Back')}
        </Link>
      </div>
    )
  } else if (read.status === 'error') {
    content = (
      <ErrorState
        message={t('AlertGeneralErrorDefault')}
        retryLabel={t('Refresh')}
        onRetry={read.reload}
        error={read.error}
        className="border-0"
      />
    )
  } else {
    content = <DelayedLoading active variant="page" label={t('Loading')} />
  }

  return (
    <EngagementWorkspace activeId="engagement-configuration" title={ENGAGEMENT_FALLBACK_ONLY.model}>
      <div className="grid flex-1 place-items-center rounded-lg border border-border bg-white p-8 shadow-sm">
        {content}
      </div>
    </EngagementWorkspace>
  )
}

function Card({
  icon: Icon,
  title,
  hint,
  meta,
  delay = 0,
  children,
}: {
  icon: typeof Fingerprint
  title: string
  hint: string
  meta?: ReactNode
  delay?: number
  children: ReactNode
}) {
  return (
    <section
      aria-label={title}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-rise-in overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-[box-shadow,border-color] duration-300 focus-within:border-brand/30 focus-within:shadow-[0_10px_30px_-18px_rgba(21,102,162,.55)] motion-reduce:animate-none"
    >
      <header className={cn('flex items-center gap-3 px-5 py-3', NAV_BAND)}>
        <NavBandGlow />
        <span className={cn('grid size-8 shrink-0 place-items-center', NAV_ICON_BOX)}>
          <Icon aria-hidden className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] leading-5 font-semibold tracking-tight text-white">{title}</h2>
          <p className="text-xs text-white/85">{hint}</p>
        </div>
        {meta ? <div className="ml-auto">{meta}</div> : null}
      </header>
      {children}
    </section>
  )
}

function ModelEditor({ view }: { view: EngagementModelView }) {
  const t = useEngagementText()
  const router = useRouter()
  const profile = useProfile()
  const canEdit = profile.can(ENGAGEMENT_EDIT)
  const initial = useMemo(() => toDetailsForm(view), [view])
  const [form, setForm] = useState<DetailsForm>(initial)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<EngagementNotice | null>(null)
  // Dataset building: calculated and exported on its own, and saved with the model like legacy's modelDto.
  const initialBuilding = useMemo(() => parseModelBuilding(view.buildingDto), [view.buildingDto])
  const [building, setBuilding] = useState<ModelBuilding>(initialBuilding)
  const [withdrawalActive, setWithdrawalActive] = useState(false)
  const [assessmentActive, setAssessmentActive] = useState(false)
  const [counts, setCounts] = useState<StudentCounts>(NO_COUNTS)
  const [appliedRequest, setAppliedRequest] = useState<BuildingRequestBody | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [exporting, setExporting] = useState(false)
  // seats-admin-engagement-model.html:637-647: the events range starts at today and Run sends it.
  const [eventsRange, setEventsRange] = useState(() => {
    const today = new Date()
    return { start: today, end: today }
  })
  const [runningNodeId, setRunningNodeId] = useState<number | null>(null)
  const dismiss = useCallback(() => setNotice(null), [])
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) ||
    JSON.stringify(building) !== JSON.stringify(initialBuilding)
  // After the first Save attempt errors follow the current values, so each clears the moment it is fixed.
  const errors = useMemo<DetailsError[]>(
    () => (submitted ? validateDetails(view, form, field => t(NODE_FIELD_TEXT[field])) : []),
    [submitted, view, form, t],
  )
  const locked = !canEdit || saving

  const say = (tone: EngagementNotice['tone'], message: string) =>
    setNotice({ id: Date.now(), tone, message })

  useLeaveGuard(dirty && canEdit && !saving, ENGAGEMENT_FALLBACK_ONLY.leaveConfirm)

  const updateNode = useCallback((path: string, patch: Partial<NodeFields>) => {
    setForm(current => {
      const fields = current.nodes[path]
      return fields ? { ...current, nodes: { ...current.nodes, [path]: { ...fields, ...patch } } } : current
    })
  }, [])

  const calculate = async () => {
    if (calculating) return
    const request = buildingRequestBody(building, withdrawalActive, assessmentActive)
    setCalculating(true)
    const controller = new AbortController()
    try {
      setCounts(await countStudentsInModelBuilding(request, controller.signal))
      setAppliedRequest(request)
    } catch (error) {
      const problem = toApiError(error)
      if (problem.kind !== 'aborted') say('error', ENGAGEMENT_FALLBACK_ONLY.countsFailed)
    } finally {
      setCalculating(false)
    }
  }

  const exportProfiles = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await exportProfileSet(buildingRequestBody(building, withdrawalActive, assessmentActive))
      say('success', ENGAGEMENT_FALLBACK_ONLY.exportQueued)
    } catch (error) {
      const problem = toApiError(error)
      say(
        'error',
        problem.kind === 'blocked' ? ENGAGEMENT_FALLBACK_ONLY.safeMode : t('AlertGeneralErrorDefault'),
      )
    } finally {
      setExporting(false)
    }
  }

  const runNode = async (node: EngagementNode) => {
    if (runningNodeId !== null) return
    setRunningNodeId(node.id)
    try {
      const guid = await runEngagementNode({
        modelId: view.applied.id,
        nodeId: node.id,
        startDateTime: formatDate(eventsRange.start),
        endDateTime: formatDate(eventsRange.end),
      })
      say(
        'success',
        guid ? `${t('TheNodeHasRunSuccessfully')} - Guid: ${guid}` : t('TheNodeHasRunSuccessfully'),
      )
    } catch (error) {
      const problem = toApiError(error)
      say(
        'error',
        problem.kind === 'blocked' ? ENGAGEMENT_FALLBACK_ONLY.safeMode : t('AlertGeneralErrorDefault'),
      )
    } finally {
      setRunningNodeId(null)
    }
  }

  const discard = () => {
    setForm(initial)
    setBuilding(initialBuilding)
    setSubmitted(false)
  }

  const submit = async () => {
    const found = validateDetails(view, form, field => t(NODE_FIELD_TEXT[field]))
    setSubmitted(true)
    if (found.length > 0) {
      say('error', found[0].message)
      document.getElementById(nodeInputId(found[0].path, found[0].field))?.focus()
      return
    }
    setSaving(true)
    try {
      await saveEngagementModel(toSaveBody(view, form, building))
      setEngagementFlash({ id: Date.now(), tone: 'success', message: t('AlertSaveSucceededDefault') })
      router.push(ENGAGEMENT_ROUTE)
    } catch (error) {
      say('error', engagementFailureText(error, t('AlertSaveErrorDefault')))
      setSaving(false)
    }
  }

  const status = !canEdit ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      <Lock aria-hidden className="size-3" />
      {ENGAGEMENT_FALLBACK_ONLY.viewOnly}
    </span>
  ) : dirty ? (
    <StatusBadge tone="warning" pulse className="animate-fade-in">
      {ENGAGEMENT_FALLBACK_ONLY.unsaved}
    </StatusBadge>
  ) : null

  const rulesText = ENGAGEMENT_FALLBACK_ONLY.rulesCount(form.constraints.length)

  return (
    <EngagementWorkspace
      activeId="engagement-configuration"
      title={view.applied.modelName || ENGAGEMENT_FALLBACK_ONLY.model}
      meta={status}
      actions={
        // Back, the legacy link and Save ride the page header, as on every other detail page, so the
        // scrolling body below them is never covered by a floating bar.
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={ENGAGEMENT_ROUTE}
            aria-disabled={saving}
            className={cn(CANCEL_BUTTON_CLASS, saving && 'pointer-events-none opacity-60')}
          >
            <ArrowLeft aria-hidden className="size-[18px]" />
            {t('Back')}
          </Link>
          <a
            href={legacyHref(`#/Engagement/Details/${view.applied.id}`)}
            className={cn(buttonVariants({ variant: 'outline' }), EXPORT_BUTTON_CLASS)}
          >
            <ExternalLink aria-hidden className={EXPORT_ICON_CLASS} />
            {ENGAGEMENT_FALLBACK_ONLY.openLegacy}
          </a>
          {canEdit ? (
            <>
              {dirty ? (
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    'h-10 animate-slide-in rounded-lg text-muted-foreground motion-reduce:animate-none',
                  )}
                >
                  <Undo2 aria-hidden className="size-4" />
                  {ENGAGEMENT_FALLBACK_ONLY.discard}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void submit()}
                // Legacy keeps Save clickable (seats-admin-engagement-model.html:222-227); only the
                // in-flight request disables it, so it never looks dead on a page the user may edit.
                disabled={saving}
                aria-busy={saving}
                className={ADD_BUTTON_CLASS}
              >
                {saving ? <ButtonSpinner /> : <Save aria-hidden className="size-[18px]" />}
                {t('Save')}
              </button>
            </>
          ) : null}
        </div>
      }
    >
      <form
        noValidate
        // seats-admin-engagement-model.html:222-227: Save is a button, so Enter in a field never saved.
        onSubmit={event => event.preventDefault()}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <EngagementNoticeBar notice={notice} onDismiss={dismiss} />

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4 pb-2">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
              <Card
                icon={Fingerprint}
                title={ENGAGEMENT_FALLBACK_ONLY.modelDetails}
                hint={ENGAGEMENT_FALLBACK_ONLY.modelHelp}
              >
                <div className="flex flex-col gap-4 px-5 py-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="engagement-model-name" className="text-[13px] font-medium text-slate-700">
                      {t('ModelName')}
                    </label>
                    <Input
                      id="engagement-model-name"
                      maxLength={200}
                      value={form.modelName}
                      disabled={locked}
                      onChange={event => setForm(current => ({ ...current, modelName: event.target.value }))}
                      className="h-10 bg-white"
                    />
                  </div>
                  <label
                    htmlFor="engagement-model-active"
                    className={cn(
                      'flex items-center justify-between gap-4 rounded-md border px-3.5 py-3 transition-colors duration-200',
                      form.isActive ? 'border-emerald-200 bg-emerald-50/60' : 'border-border bg-white',
                      locked ? 'cursor-default' : 'cursor-pointer hover:border-slate-300',
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{t('IsActive')}</span>
                    <Checkbox
                      id="engagement-model-active"
                      checked={form.isActive}
                      label={t('IsActive')}
                      disabled={locked}
                      onCheckedChange={() =>
                        setForm(current => ({ ...current, isActive: !current.isActive }))
                      }
                    />
                  </label>
                </div>
              </Card>

              <Card
                icon={Filter}
                title={t('ModelAppliedTo')}
                hint={ENGAGEMENT_FALLBACK_ONLY.appliedHelp}
                delay={60}
                meta={
                  <span className="rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
                    {rulesText}
                  </span>
                }
              >
                <ConstraintRules
                  constraints={form.constraints}
                  disabled={locked}
                  t={t}
                  onInvalid={message => say('error', message)}
                  onAdd={constraint => {
                    if (hasConstraint(form.constraints, constraint)) {
                      say('info', ENGAGEMENT_FALLBACK_ONLY.ruleExists)
                      return
                    }
                    setForm(current => ({ ...current, constraints: [...current.constraints, constraint] }))
                  }}
                  onRemove={index =>
                    setForm(current => ({
                      ...current,
                      constraints: current.constraints.filter((_, position) => position !== index),
                    }))
                  }
                />
              </Card>
            </div>

            <Card
              icon={Layers}
              title={t('DatasetBuilding')}
              hint={ENGAGEMENT_FALLBACK_ONLY.buildingHelp}
              delay={100}
            >
              <DatasetBuilding
                building={building}
                withdrawalActive={withdrawalActive}
                assessmentActive={assessmentActive}
                counts={counts}
                appliedRequest={appliedRequest}
                calculating={calculating}
                exporting={exporting}
                disabled={saving}
                t={t}
                onChange={setBuilding}
                onToggleWithdrawal={setWithdrawalActive}
                onToggleAssessment={setAssessmentActive}
                onCalculate={() => void calculate()}
                onExport={() => void exportProfiles()}
                onInvalid={message => say('error', message)}
                onDuplicate={() => say('info', ENGAGEMENT_FALLBACK_ONLY.ruleExists)}
              />
            </Card>

            <Card
              icon={Network}
              title={t('Nodes')}
              hint={ENGAGEMENT_FALLBACK_ONLY.nodesHelp}
              delay={120}
              meta={
                <DateRangeField
                  id="engagement-events-range"
                  start={eventsRange.start}
                  end={eventsRange.end}
                  formatDate={formatDate}
                  onChange={(start, end) => setEventsRange({ start, end })}
                  labels={{
                    dateRange: t('EventsRange'),
                    startDate: t('From'),
                    endDate: t('To'),
                    selectRange: t('SelectRange'),
                    today: t('Today'),
                    chooseMonthYear: ENGAGEMENT_FALLBACK_ONLY.chooseMonthYear,
                    previous: t('Previous'),
                    next: t('Next'),
                    close: ENGAGEMENT_FALLBACK_ONLY.close,
                    cancel: t('Cancel'),
                    last7Days: ENGAGEMENT_FALLBACK_ONLY.last7Days,
                    last14Days: ENGAGEMENT_FALLBACK_ONLY.last14Days,
                    last30Days: ENGAGEMENT_FALLBACK_ONLY.last30Days,
                  }}
                />
              }
            >
              <NodeTree
                root={view.root}
                nodes={form.nodes}
                errors={errors}
                disabled={locked}
                t={t}
                onChange={updateNode}
                onRun={node => void runNode(node)}
                runningNodeId={runningNodeId}
              />
            </Card>

            <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
              {ENGAGEMENT_FALLBACK_ONLY.legacyOnly}
            </p>
          </div>
        </div>
      </form>
    </EngagementWorkspace>
  )
}
