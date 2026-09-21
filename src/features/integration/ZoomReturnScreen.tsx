'use client'

import { ArrowLeft, Info, Lock } from 'lucide-react'
import Link from 'next/link'
import { INTEGRATIONS_ROUTE } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { INTEGRATION_FALLBACK_ONLY, useIntegrationText } from './integration-text'
import { INTEGRATION_ACCESS, INTEGRATIONS_SECTION, SETTINGS_ACCESS } from './IntegrationsScreen'

export function ZoomReturnScreen() {
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

  return <ZoomReturnNotice />
}

// IntegrationController.cs:29 builds redirect_uri on the legacy host and :52 redirects to the legacy hash
// route, so Zoom never returns here. Calling ZoomResponse would link the tenant's account from a GET, which
// safe mode does not guard, and a reload would repeat it — so this page only explains and links onward.
function ZoomReturnNotice() {
  return (
    <ZoomReturnLayout>
      <div
        role="status"
        className="flex animate-rise-in items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm text-foreground shadow-sm motion-reduce:animate-none"
      >
        <Info aria-hidden className="size-4 shrink-0 text-brand" />
        <span>{INTEGRATION_FALLBACK_ONLY.zoomReturnsToLegacy}</span>
      </div>
    </ZoomReturnLayout>
  )
}

function ZoomReturnLayout({ children }: { children: React.ReactNode }) {
  const t = useIntegrationText()

  return (
    <AreaWorkspace
      areaLabel={t('Integrations')}
      sections={[{ ...INTEGRATIONS_SECTION, label: t('Integrations') }]}
      activeId="integrations"
      title={t('Zoom')}
      collapseLabel={t('Collapse')}
      expandLabel={INTEGRATION_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {children}
      <Link
        href={INTEGRATIONS_ROUTE}
        className="inline-flex w-fit items-center gap-2 rounded-sm text-sm font-semibold text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {INTEGRATION_FALLBACK_ONLY.backToIntegrations}
      </Link>
    </AreaWorkspace>
  )
}
