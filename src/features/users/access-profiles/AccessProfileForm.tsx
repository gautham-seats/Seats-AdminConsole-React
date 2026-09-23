'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Info, KeyRound, Save, ShieldCheck, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useApiRead } from '@/shared/api'
import { useResources } from '@/shared/resources'
import { ACCESS_PROFILES_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace, type WorkspaceSection } from '@/shared/shell/AreaWorkspace'
import { SettingsCard } from '@/features/settings/shared/SettingsCard'
import { useProfile } from '@/shared/shell/profile'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import {
  Button,
  buttonVariants,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type {
  AccessProfileContainerViewModel,
  AccessProfileViewModel,
  EventTypeInAccessProfileDto,
} from '@/types/access-profiles'
import { GENERAL_ERROR_DURATION, isGeneralError } from '../index/general-error'
import { StatusNotice, type Notice } from '../index/StatusNotice'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from '../index/users-text'
import { saveErrorText } from '../save-error'
import { setFlash } from '../users-flash'
import {
  buildPermissionLookup,
  copyProfile,
  isLandingPageEnabled,
  isUnknownLandingPage,
  landingPageValid,
  toggleId,
  togglePermission,
  toSaveBody,
  validateAccessProfile,
  type AccessProfileErrors,
  type AccessProfileField,
} from './access-profile-form'
import {
  fetchCaseVisibility,
  fetchEventTypes,
  fetchLandingPages,
  fetchWorkflowVisibility,
  saveAccessProfile,
} from './access-profile-details-api'
import { PermissionStudio } from './PermissionStudio'
import { BRIEFING_EN } from './briefing-text'
import { countActions, flattenPermissionGroups } from './permission-studio'
import { ProfilePreview } from './ProfilePreview'
import { EventVisibilityPanel, VisibilityListPanel } from './VisibilityPanels'
import { VisibilityPreview } from './VisibilityPreview'
import { buildVisibilityLens, type VisibilityCatalogue, type VisibilityTab } from './visibility-lens'
import { TabIndicator } from '@/shared/ui/TabIndicator'
import { ADD_BUTTON_CLASS, CANCEL_BUTTON_CLASS } from '@/shared/ui/add-button'

const ADD = { item: PermissionItem.AccessProfiles, action: PermissionAction.Add }
const EDIT = { item: PermissionItem.AccessProfiles, action: PermissionAction.Edit }
const NOT_SET = 'not-set'

// swapp.js:547-563 and accessProfileDetailsController.js:316 alert timings.
const DURATION = { invalid: 4000, saveError: 10000, saveSuccess: 3500 } as const

// Resource keys outside the Users text set, with the legacy English fallbacks.
const EN = {
  // _Layout.cshtml:216 read by swapp.js:574.
  FieldsWithInputValidations: 'There are fields with input validation errors.',
  // accessProfileDetailsController.js:32 falls back to 'Activity', not the nav label.
  Activity: 'Activity',
} as const
const EXTRA_KEYS = Object.keys(EN)

// accessProfileDetailsController.js:27-34 names landing pages by id.
const LANDING_PAGE_TEXT: Record<number, UsersTextKey | 'Activity'> = {
  1: 'HomeMenu',
  2: 'Lectures',
  3: 'Reports',
  4: 'CfcAttendanceTitle',
  5: 'Activity',
  6: 'MyProfile',
}

const NO_FIELDS: ReadonlySet<AccessProfileField> = new Set()

type Tab = 'site' | 'events' | 'cases' | 'workflows'

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: ReactNode
  error?: string | null
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="animate-rise-in text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export type AccessProfileFormProps = {
  view: AccessProfileContainerViewModel
  t: (key: UsersTextKey) => string
  frame: {
    areaLabel: string
    sections: readonly WorkspaceSection[]
    title: string
    collapseLabel: string
    expandLabel: string
  }
}

export function AccessProfileForm({ view, t, frame }: AccessProfileFormProps) {
  const router = useRouter()
  const profile = useProfile()
  const loadedId = view.details.id
  const [details, setDetails] = useState<AccessProfileViewModel>(view.details)
  const [baseline, setBaseline] = useState<AccessProfileViewModel>(view.details)
  // ko.validation messagesOnModified: a field shows its message once edited, or every field after a failed Save.
  const [touched, setTouched] = useState<ReadonlySet<AccessProfileField>>(NO_FIELDS)
  const [showAll, setShowAll] = useState(false)
  const [checkSpecialCharacters, setCheckSpecialCharacters] = useState(false)
  const [focusValue, setFocusValue] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [tab, setTab] = useState<Tab>('site')
  const [focusId, setFocusId] = useState<number | null>(null)
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const dismissNotice = useCallback(() => setNotice(null), [])
  const extra = useResources(EXTRA_KEYS)
  const extraText = (key: keyof typeof EN) => {
    const value = extra.text(key)
    return !value.trim() || value === key ? EN[key] : value
  }

  const creating = details.id === 0
  const canSave = profile.can(creating ? ADD : EDIT)
  const dirty = JSON.stringify(details) !== JSON.stringify(baseline)
  useLeaveGuard(canSave && dirty && !saving, LEAVE_EN.message)
  const lookup = useMemo(() => buildPermissionLookup(view.nodes), [view.nodes])
  const groups = useMemo(() => flattenPermissionGroups(view.nodes), [view.nodes])
  const totalActions = useMemo(() => countActions(groups.flatMap(group => group.permissions)), [groups])
  const landingPages = useApiRead('access-profile-landing-pages', fetchLandingPages)
  const pages = landingPages.data ?? []
  const landingPagesSettled = landingPages.status === 'success' || landingPages.status === 'error'
  // The landing page check cannot run until the options exist.
  const landingPagePending = !landingPagesSettled && details.defaultLandingPage !== null
  if (landingPagesSettled && isUnknownLandingPage(details.defaultLandingPage, pages)) {
    setDetails({ ...details, defaultLandingPage: null })
  }
  // swapp.js:168-206: the global ajax handler reports a failed landing page load.
  const [landingErrorShown, setLandingErrorShown] = useState(false)
  if (landingPages.status === 'error' && !landingErrorShown) {
    setLandingErrorShown(true)
    if (isGeneralError(landingPages.error))
      setNotice({
        id: -1,
        tone: 'error',
        message: t('AlertGeneralErrorDefault'),
        duration: GENERAL_ERROR_DURATION,
      })
  }

  const allErrors = validateAccessProfile(details, checkSpecialCharacters)
  const visible = (field: AccessProfileField) =>
    showAll || touched.has(field) ? allErrors[field] : undefined
  const errors: AccessProfileErrors = { name: visible('name'), externalKey: visible('externalKey') }

  const touch = (field: AccessProfileField) =>
    setTouched(current => (current.has(field) ? current : new Set([...current, field])))

  // knockout value binding writes on change, so a text field counts as edited when it blurs with a new value.
  const textEvents = (field: AccessProfileField) => ({
    onFocus: () => setFocusValue(details[field] ?? ''),
    onBlur: () => {
      if ((details[field] ?? '') !== focusValue) touch(field)
    },
  })

  const commit = (next: AccessProfileViewModel) => setDetails(next)

  const showLandingPageError = () =>
    setNotice({ id: Date.now(), tone: 'error', message: USERS_FALLBACK_ONLY.landingPageNotAllowed })

  const loadEvents = useCallback((signal: AbortSignal) => fetchEventTypes(loadedId, signal), [loadedId])
  const loadCases = useCallback((signal: AbortSignal) => fetchCaseVisibility(loadedId, signal), [loadedId])
  const loadWorkflows = useCallback(
    (signal: AbortSignal) => fetchWorkflowVisibility(loadedId, signal),
    [loadedId],
  )
  const eventsLoaded = useCallback((selected: EventTypeInAccessProfileDto[]) => {
    setDetails(current => ({ ...current, selectedEvents: selected }))
    setBaseline(current => ({ ...current, selectedEvents: selected }))
  }, [])
  const casesLoaded = useCallback((selected: number[]) => {
    setDetails(current => ({ ...current, selectedCases: selected }))
    setBaseline(current => ({ ...current, selectedCases: selected }))
  }, [])
  const [catalogue, setCatalogue] = useState<VisibilityCatalogue>({
    events: [],
    cases: [],
    workflows: [],
  })
  const eventsCatalogue = useCallback(
    (rows: VisibilityCatalogue['events']) => setCatalogue(current => ({ ...current, events: rows })),
    [],
  )
  const casesCatalogue = useCallback(
    (items: VisibilityCatalogue['cases']) => setCatalogue(current => ({ ...current, cases: items })),
    [],
  )
  const workflowsCatalogue = useCallback(
    (items: VisibilityCatalogue['workflows']) => setCatalogue(current => ({ ...current, workflows: items })),
    [],
  )
  const workflowsLoaded = useCallback((selected: number[]) => {
    setDetails(current => ({ ...current, selectedWorkflows: selected }))
    setBaseline(current => ({ ...current, selectedWorkflows: selected }))
  }, [])

  // A row the preview pointed at; the panel scrolls to it and rings it, then clears.
  const [rowFlash, setRowFlash] = useState<{ area: VisibilityTab; id: number } | null>(null)
  const clearRowFlash = useCallback(() => setRowFlash(null), [setRowFlash])
  const flashFor = (area: VisibilityTab) => (rowFlash && rowFlash.area === area ? rowFlash.id : null)

  // Tapping a line in the preview toggles the same list the panel does.
  const toggleFromPreview = (area: 'cases' | 'workflows', id: number) =>
    commit(
      area === 'cases'
        ? { ...details, selectedCases: toggleId(details.selectedCases ?? [], id) }
        : { ...details, selectedWorkflows: toggleId(details.selectedWorkflows ?? [], id) },
    )

  // accessProfileDetailsController.js:305-312: the landing page check runs before swapp.handleSaveEvent validates.
  const submit = async () => {
    if (landingPagePending) return
    if (!landingPageValid(details.defaultLandingPage, pages, lookup, details.selectedPermissions)) {
      showLandingPageError()
      return
    }
    setCheckSpecialCharacters(true)
    if (Object.keys(validateAccessProfile(details, true)).length > 0) {
      setShowAll(true)
      setNotice({
        id: Date.now(),
        tone: 'gray',
        message: extraText('FieldsWithInputValidations'),
        duration: DURATION.invalid,
      })
      return
    }
    setSaving(true)
    try {
      await saveAccessProfile(toSaveBody(details))
      setFlash({ tone: 'success', message: t('AlertSaveSucceededDefault'), duration: DURATION.saveSuccess })
      router.push(ACCESS_PROFILES_ROUTE)
    } catch (error) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        // swapp.js:168-206 replaces the text with the general error for unhandled statuses.
        message: isGeneralError(error)
          ? t('AlertGeneralErrorDefault')
          : saveErrorText(error, t('AlertSaveErrorDefault')),
        duration: DURATION.saveError,
      })
      setSaving(false)
    }
  }

  // AccessProfile/Details.cshtml:67-74: the extra tabs follow the visibility flags; each link's title is its label.
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'site', label: t('SiteAccess') },
    ...(details.isEventTypeVisible
      ? [{ id: 'events' as const, label: t('EventVisibility'), count: (details.selectedEvents ?? []).length }]
      : []),
    ...(details.isCaseVisible
      ? [{ id: 'cases' as const, label: t('CaseVisibility'), count: (details.selectedCases ?? []).length }]
      : []),
    ...(details.isWorkflowVisible
      ? [
          {
            id: 'workflows' as const,
            label: t('WorkflowVisibility'),
            count: (details.selectedWorkflows ?? []).length,
          },
        ]
      : []),
  ]

  // APG tabs: arrow keys, Home and End move focus and select (automatic activation).
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1
    if (next < 0) return
    event.preventDefault()
    setTab(tabs[next].id)
    tabRefs.current[tabs[next].id]?.focus()
  }

  const landingPageText = (id: number) => {
    const key = LANDING_PAGE_TEXT[id]
    if (!key) return ''
    return key === 'Activity' ? extraText('Activity') : t(key)
  }

  const landing =
    details.defaultLandingPage === null
      ? null
      : {
          label: landingPageText(details.defaultLandingPage),
          valid: landingPageValid(details.defaultLandingPage, pages, lookup, details.selectedPermissions),
        }

  const message = (error: AccessProfileErrors[keyof AccessProfileErrors]) =>
    error === 'required'
      ? t('Required')
      : error === 'specialCharacters'
        ? USERS_FALLBACK_ONLY.specialCharacters
        : null

  // AccessProfile/Details.cshtml:7-32 keeps Save, Cancel and Copy profile together; they ride the
  // page header here so they stay visible and never share a bar with the granted counter.
  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {details.id > 0 ? (
        <Button
          type="button"
          variant="outline"
          title={t('CopyProfile')}
          className={CANCEL_BUTTON_CLASS}
          onClick={() => {
            commit(copyProfile(details))
            touch('name')
          }}
        >
          <Copy aria-hidden className="size-[18px]" />
          {t('CopyProfile')}
        </Button>
      ) : null}
      <Link
        href={ACCESS_PROFILES_ROUTE}
        title={t('Cancel')}
        // Sized to the Save button beside it (add-button.ts): same height, minimum width and radius.
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'min-h-10 min-w-[8.5rem] gap-2.5 rounded-lg border-slate-300 bg-white px-7 text-sm font-semibold tracking-wide text-slate-700 shadow-sm hover:bg-slate-50',
        )}
      >
        <X aria-hidden className="size-[18px]" />
        {t('Cancel')}
      </Link>
      {canSave ? (
        <Button
          type="button"
          title={t('Save')}
          onClick={() => void submit()}
          loading={saving}
          disabled={landingPagePending}
          className={ADD_BUTTON_CLASS}
        >
          <Save aria-hidden className={cn('size-[18px]', saving && 'animate-soft-pulse')} />
          {t('Save')}
        </Button>
      ) : null}
    </div>
  )

  return (
    <AreaWorkspace
      areaLabel={frame.areaLabel}
      sections={frame.sections}
      activeId="access-profile"
      title={frame.title}
      collapseLabel={frame.collapseLabel}
      expandLabel={frame.expandLabel}
      navigation="admin"
      actions={actions}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />

        <div className="grid w-full max-w-[96rem] items-start gap-4 pb-2 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
          <div className="flex min-w-0 flex-col gap-4">
            <SettingsCard
              icon={ShieldCheck}
              title={USERS_FALLBACK_ONLY.accessProfileDetails}
              hint={USERS_FALLBACK_ONLY.accessProfileDetailsHint}
              bodyClassName="divide-y-0"
            >
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 lg:grid-cols-3">
                <Field id="access-profile-name" label={t('Name')} error={message(errors.name)}>
                  <Input
                    id="access-profile-name"
                    value={details.name ?? ''}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'access-profile-name-error' : undefined}
                    title={t('Name')}
                    onChange={event => commit({ ...details, name: event.target.value })}
                    {...textEvents('name')}
                    className="h-9 bg-white"
                  />
                </Field>
                <Field id="access-profile-key" label={t('ExternalKey')} error={message(errors.externalKey)}>
                  <Input
                    id="access-profile-key"
                    value={details.externalKey ?? ''}
                    aria-invalid={Boolean(errors.externalKey)}
                    aria-describedby={errors.externalKey ? 'access-profile-key-error' : undefined}
                    title={t('ExternalKey')}
                    onChange={event => commit({ ...details, externalKey: event.target.value })}
                    {...textEvents('externalKey')}
                    className="h-9 bg-white"
                  />
                </Field>
                <Field id="access-profile-landing" label={t('DefaultLandingPage')}>
                  <Select
                    value={details.defaultLandingPage === null ? NOT_SET : String(details.defaultLandingPage)}
                    onValueChange={value => {
                      const next = value === NOT_SET ? null : Number(value)
                      commit({ ...details, defaultLandingPage: next })
                      if (!landingPageValid(next, pages, lookup, details.selectedPermissions))
                        showLandingPageError()
                    }}
                  >
                    <SelectTrigger
                      id="access-profile-landing"
                      title={t('DefaultLandingPage')}
                      className="bg-white"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NOT_SET}>{t('NotSet')}</SelectItem>
                      {pages.map(page => (
                        <SelectItem
                          key={page.id}
                          value={String(page.id)}
                          disabled={!isLandingPageEnabled(page, lookup, details.selectedPermissions)}
                        >
                          {landingPageText(page.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="border-t border-border px-5 py-3.5">
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-[background-color,border-color] duration-300 ease-premium',
                    details.isRestricted ? 'border-brand/25 bg-brand/[0.05]' : 'border-border bg-page',
                  )}
                >
                  <Checkbox
                    id="access-profile-restricted"
                    checked={details.isRestricted}
                    onCheckedChange={() => commit({ ...details, isRestricted: !details.isRestricted })}
                    label={t('Restricted')}
                    title={t('Restricted')}
                  />
                  <label htmlFor="access-profile-restricted" className="min-w-0 flex-1 cursor-pointer">
                    <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-foreground">
                      <ShieldCheck
                        aria-hidden
                        className={cn(
                          'size-4 transition-colors duration-300',
                          details.isRestricted ? 'text-brand' : 'text-slate-500',
                        )}
                      />
                      {t('Restricted')}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {t('RestrictedAccessProfilesLegend')}
                    </span>
                  </label>
                  {/* The legend is already visible text inside the checkbox label; this icon only repeats it on hover. */}
                  <span
                    aria-hidden
                    title={t('RestrictedAccessProfilesLegend')}
                    className="inline-flex shrink-0"
                  >
                    <Info className="size-4 text-brand/70" />
                  </span>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={KeyRound}
              title={t('SiteAccess')}
              hint={USERS_FALLBACK_ONLY.siteAccessHint}
              bodyClassName="divide-y-0"
              action={
                <p className="flex items-center gap-2 text-[11.5px] font-medium text-white/95 tabular-nums">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-emerald-300 ring-3 ring-emerald-300/25"
                  />
                  {BRIEFING_EN.grantedOf(details.selectedPermissions.length, totalActions)}
                </p>
              }
            >
              <div
                role="tablist"
                aria-label={t('AccessProfile')}
                className="relative flex flex-wrap gap-1 border-b border-border px-3"
              >
                <TabIndicator activeKey={tab} />
                {tabs.map((item, index) => {
                  const active = tab === item.id
                  return (
                    <button
                      key={item.id}
                      ref={element => {
                        tabRefs.current[item.id] = element
                      }}
                      type="button"
                      role="tab"
                      id={`access-profile-tab-${item.id}`}
                      aria-selected={active}
                      aria-controls={`access-profile-panel-${item.id}`}
                      tabIndex={active ? 0 : -1}
                      title={item.label}
                      onClick={() => setTab(item.id)}
                      onKeyDown={event => onTabKeyDown(event, index)}
                      className={cn(
                        'relative px-3 py-3 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {item.label}
                      {/* Every tab carries what is on inside it, so the shape of a profile reads from the strip. */}
                      <span
                        aria-hidden
                        className={cn(
                          'ml-2 rounded-full px-1.5 text-[11px] font-semibold tabular-nums transition-colors duration-200',
                          active ? 'bg-brand text-white' : 'bg-slate-900/[.06] text-slate-600',
                        )}
                      >
                        {item.id === 'site' ? details.selectedPermissions.length : (item.count ?? 0)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div>
                <div
                  role="tabpanel"
                  id="access-profile-panel-site"
                  aria-labelledby="access-profile-tab-site"
                  hidden={tab !== 'site'}
                >
                  <PermissionStudio
                    groups={groups}
                    selected={details.selectedPermissions}
                    label={t('SiteAccess')}
                    text={{
                      search: USERS_FALLBACK_ONLY.searchPermissions,
                      levels: {
                        none: USERS_FALLBACK_ONLY.levelNone,
                        view: USERS_FALLBACK_ONLY.levelView,
                        edit: USERS_FALLBACK_ONLY.levelEdit,
                        full: USERS_FALLBACK_ONLY.levelFull,
                      },
                      noMatches: USERS_FALLBACK_ONLY.noPermissionMatches,
                    }}
                    onChange={selectedPermissions => commit({ ...details, selectedPermissions })}
                    onFocus={setFocusId}
                  />
                </div>
                {/* Details.cshtml:103-142: every visibility component loads even while its tab is hidden. */}
                <div
                  role="tabpanel"
                  id="access-profile-panel-events"
                  aria-labelledby="access-profile-tab-events"
                  className="px-5 py-4"
                  hidden={tab !== 'events' || !details.isEventTypeVisible}
                >
                  <EventVisibilityPanel
                    accessProfileId={loadedId}
                    selected={details.selectedEvents ?? []}
                    load={loadEvents}
                    t={t}
                    onLoaded={eventsLoaded}
                    onCatalogue={eventsCatalogue}
                    onChange={selected => commit({ ...details, selectedEvents: selected })}
                    flashId={flashFor('events')}
                    onFlashDone={clearRowFlash}
                  />
                </div>
                <div
                  role="tabpanel"
                  id="access-profile-panel-cases"
                  aria-labelledby="access-profile-tab-cases"
                  className="px-5 py-4"
                  hidden={tab !== 'cases' || !details.isCaseVisible}
                >
                  <VisibilityListPanel
                    id="case-visibility-search"
                    cacheKey={`access-profile-cases:${loadedId}`}
                    selected={details.selectedCases ?? []}
                    load={loadCases}
                    t={t}
                    onLoaded={casesLoaded}
                    onCatalogue={casesCatalogue}
                    description={USERS_FALLBACK_ONLY.caseVisibilityHint}
                    emptyTitle={USERS_FALLBACK_ONLY.noCaseTypes}
                    flashId={flashFor('cases')}
                    onFlashDone={clearRowFlash}
                    onSetAll={ids => commit({ ...details, selectedCases: ids })}
                    onToggle={id =>
                      commit({ ...details, selectedCases: toggleId(details.selectedCases ?? [], id) })
                    }
                  />
                </div>
                <div
                  role="tabpanel"
                  id="access-profile-panel-workflows"
                  aria-labelledby="access-profile-tab-workflows"
                  className="px-5 py-4"
                  hidden={tab !== 'workflows' || !details.isWorkflowVisible}
                >
                  <VisibilityListPanel
                    id="workflow-visibility-search"
                    cacheKey={`access-profile-workflows:${loadedId}`}
                    selected={details.selectedWorkflows ?? []}
                    load={loadWorkflows}
                    t={t}
                    onLoaded={workflowsLoaded}
                    onCatalogue={workflowsCatalogue}
                    description={USERS_FALLBACK_ONLY.workflowVisibilityHint}
                    emptyTitle={USERS_FALLBACK_ONLY.noWorkflows}
                    flashId={flashFor('workflows')}
                    onFlashDone={clearRowFlash}
                    onSetAll={ids => commit({ ...details, selectedWorkflows: ids })}
                    onToggle={id =>
                      commit({ ...details, selectedWorkflows: toggleId(details.selectedWorkflows ?? [], id) })
                    }
                  />
                </div>
              </div>
            </SettingsCard>
          </div>
          {/* dvh, not vh: inside a scrolling shell a vh height ignores the scrollbar and makes the panel wobble. */}
          {/* Sticky below the page header, so the preview fills its column without a gap under it. */}
          <div className="xl:sticky xl:top-20 xl:h-[calc(100dvh-9.5rem)]">
            {tab === 'site' ? null : (
              <VisibilityPreview
                title={USERS_FALLBACK_ONLY.livePreview}
                lens={buildVisibilityLens({
                  tab,
                  catalogue,
                  selectedEvents: details.selectedEvents ?? [],
                  selectedCases: details.selectedCases ?? [],
                  selectedWorkflows: details.selectedWorkflows ?? [],
                })}
                landing={null}
                onToggle={
                  tab === 'events'
                    ? id => setRowFlash({ area: 'events', id })
                    : id => toggleFromPreview(tab, id)
                }
              />
            )}
            <ProfilePreview
              hidden={tab !== 'site'}
              groups={groups}
              selected={details.selectedPermissions}
              focusId={focusId}
              landing={landing}
              onToggle={actionId =>
                commit({
                  ...details,
                  selectedPermissions: togglePermission(details.selectedPermissions, actionId),
                })
              }
              text={{
                title: USERS_FALLBACK_ONLY.livePreview,
                hint: USERS_FALLBACK_ONLY.livePreviewHint,
                empty: USERS_FALLBACK_ONLY.livePreviewEmpty,
                pages: USERS_FALLBACK_ONLY.previewPages,
                landingNone: USERS_FALLBACK_ONLY.previewLandingNone,
                landingOk: USERS_FALLBACK_ONLY.previewLandingOk,
                landingBlocked: USERS_FALLBACK_ONLY.previewLandingBlocked,
              }}
            />
          </div>
        </div>
      </div>
    </AreaWorkspace>
  )
}
