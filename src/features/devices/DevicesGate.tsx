'use client'

import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { PermissionAction, PermissionItem, type Permission } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { DEVICES_FALLBACK_ONLY, useDevicesText } from './index/devices-text'

const DEVICES_ACCESS = { item: PermissionItem.Devices, action: PermissionAction.Access }
export const ROOMS_ACCESS = { item: PermissionItem.Rooms, action: PermissionAction.Access }

type DevicesGateProps = {
  children: ReactNode
  permission?: Permission
  noAccessText?: string
}

// Route gate equals the data gate (DeviceApiController.cs:50), so Rooms-only users no longer get an empty grid (LB-012).
export function DevicesGate({
  children,
  permission = DEVICES_ACCESS,
  noAccessText = DEVICES_FALLBACK_ONLY.noAccess,
}: DevicesGateProps) {
  const profile = useProfile()
  const t = useDevicesText()

  if (profile.status === 'error') {
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
  }
  if (profile.status !== 'success') {
    return (
      <div className="grid flex-1 place-items-center">
        <h1 className="sr-only">{t('Loading')}</h1>
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  }
  if (!profile.can(permission)) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div
          role="alert"
          className="flex max-w-md animate-rise-in flex-col items-center gap-3 rounded-lg border border-border bg-white p-8 text-center shadow-sm motion-reduce:animate-none"
        >
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <Lock aria-hidden className="size-5" />
          </span>
          <h1 className="text-[15px] font-semibold text-foreground">{noAccessText}</h1>
        </div>
      </div>
    )
  }
  return children
}
