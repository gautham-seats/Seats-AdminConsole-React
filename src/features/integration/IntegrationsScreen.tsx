'use client'

import { CircleAlert, CircleCheck, ExternalLink, Lock, Video } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useApiRead } from '@/shared/api'
import {
  INTEGRATIONS_ROUTE,
  PermissionAction,
  PermissionItem,
  type MenuLink,
} from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { Button, DelayedLoading, ErrorState, GearworkLoader } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { zoomLinkState } from './integration'
import { fetchZoomAuthUrl, fetchZoomStatus } from './integration-api'
import { INTEGRATION_FALLBACK_ONLY, useIntegrationText } from './integration-text'

export const INTEGRATION_ACCESS = { item: PermissionItem.Integration, action: PermissionAction.Access }
// IntegrationController.cs:21 serves the page with Settings + Access.
export const SETTINGS_ACCESS = { item: PermissionItem.Settings, action: PermissionAction.Access }

export const INTEGRATIONS_SECTION: MenuLink = {
  id: 'integrations',
  labelKey: 'Integrations',
  fallback: 'Integrations',
  icon: 'plug',
  legacyRoute: '#/Integration',
  reactRoute: INTEGRATIONS_ROUTE,
  permission: INTEGRATION_ACCESS,
}

export function IntegrationsScreen() {
  const profile = useProfile()
  const t = useIntegrationText()
  if (profile.status === 'error')
    return (
      <div className="grid flex-1 place-items-center p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={profile.reload}
          error={profile.error}
        />
      </div>
    )
  if (profile.status !== 'success')
    return (
      <div className="grid flex-1 place-items-center">
        <h1 className="sr-only">{t('Loading')}</h1>
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  if (!profile.can(INTEGRATION_ACCESS) || !profile.can(SETTINGS_ACCESS))
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div
          role="alert"
          className="flex max-w-md animate-rise-in flex-col items-center gap-3 rounded-lg border border-border bg-white p-8 text-center shadow-sm"
        >
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <Lock aria-hidden className="size-5" />
          </span>
          <h1 className="text-[15px] font-semibold text-foreground">{INTEGRATION_FALLBACK_ONLY.noAccess}</h1>
        </div>
      </div>
    )
  return <IntegrationsList />
}

function IntegrationsList() {
  const t = useIntegrationText()
  const sections = useMemo(() => [{ ...INTEGRATIONS_SECTION, label: t('Integrations') }], [t])
  const loadStatus = useCallback((signal: AbortSignal) => fetchZoomStatus(signal), [])
  const loadUrl = useCallback((signal: AbortSignal) => fetchZoomAuthUrl(signal), [])
  const status = useApiRead('integration:zoom-status', loadStatus)
  const authUrl = useApiRead('integration:zoom-url', loadUrl)

  // A failed status call leaves Zoom not linked, as legacy does (seats-admin-integration.html:115, 145-148).
  const state = zoomLinkState(status.status === 'success' ? (status.data ?? null) : null)
  const linked = state !== 'notLinked'
  const summary =
    state === 'linkedByMe'
      ? INTEGRATION_FALLBACK_ONLY.zoomLinked
      : state === 'linkedByOther'
        ? INTEGRATION_FALLBACK_ONLY.zoomLinkedOther
        : INTEGRATION_FALLBACK_ONLY.zoomSummary
  const url = authUrl.status === 'success' ? (authUrl.data ?? null) : null
  const urlFailed = authUrl.status === 'error' || (authUrl.status === 'success' && !url)

  return (
    <AreaWorkspace
      areaLabel={t('Integrations')}
      sections={sections}
      activeId="integrations"
      title={t('Integrations')}
      collapseLabel={t('Collapse')}
      expandLabel={INTEGRATION_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {status.status === 'error' ? (
        <div
          role="alert"
          className="flex animate-rise-in items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 shadow-sm motion-reduce:animate-none"
        >
          <CircleAlert aria-hidden className="size-4 shrink-0 text-red-600" />
          <span className="flex-1">{t('AlertGeneralErrorDefault')}</span>
          <Button variant="outline" size="sm" onClick={status.reload}>
            {t('Refresh')}
          </Button>
        </div>
      ) : null}

      <ul className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {/* Below sm the action drops under the name so nothing overflows at 320px. */}
        <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 px-5 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] [&>:last-child]:col-span-2 [&>:last-child]:justify-self-start sm:[&>:last-child]:col-span-1 sm:[&>:last-child]:justify-self-auto">
          <span className="grid size-11 place-items-center rounded-xl bg-[linear-gradient(180deg,var(--color-primary),color-mix(in_srgb,var(--color-primary)_85%,black))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3)]">
            <Video aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">{t('Zoom')}</p>
            <p className="text-sm break-words text-muted-foreground">{summary}</p>
          </div>
          <span className="hidden sm:block">
            {status.status === 'loading' ? (
              <GearworkLoader className="h-6 w-7" />
            ) : (
              <span
                className={cn(
                  'inline-flex animate-fade-in items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                  linked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
                )}
              >
                {linked ? <CircleCheck aria-hidden className="size-3.5" /> : null}
                {linked
                  ? state === 'linkedByOther'
                    ? INTEGRATION_FALLBACK_ONLY.zoomLinkedOther
                    : INTEGRATION_FALLBACK_ONLY.zoomLinked
                  : INTEGRATION_FALLBACK_ONLY.notLinked}
              </span>
            )}
          </span>
          {linked ? (
            <Button variant="outline" size="sm" disabled>
              <CircleCheck aria-hidden className="size-4" />
              {INTEGRATION_FALLBACK_ONLY.connected}
            </Button>
          ) : url ? (
            <a
              href={url}
              className="group inline-flex h-9 items-center gap-2 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-brand)_85%,white)_0%,var(--color-brand)_55%,color-mix(in_srgb,var(--color-brand)_88%,black)_100%)] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_4px_12px_-4px_rgba(21,102,162,.45)] transition-[transform,filter] duration-300 hover:-translate-y-px hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 motion-reduce:transition-none"
            >
              {INTEGRATION_FALLBACK_ONLY.connect}
              <ExternalLink aria-hidden className="size-4" />
            </a>
          ) : (
            <Button
              size="sm"
              disabled
              title={urlFailed ? INTEGRATION_FALLBACK_ONLY.linkUnavailable : undefined}
            >
              {INTEGRATION_FALLBACK_ONLY.connect}
            </Button>
          )}
        </li>
      </ul>

      {urlFailed && !linked ? (
        <p role="alert" className="text-sm text-red-700">
          {INTEGRATION_FALLBACK_ONLY.linkUnavailable}
        </p>
      ) : null}
    </AreaWorkspace>
  )
}
