'use client'

import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { PermissionAction, PermissionItem, type Permission } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { USERS_FALLBACK_ONLY, useUsersText } from './index/users-text'

export const USERS_ACCESS = { item: PermissionItem.Users, action: PermissionAction.Access }

type AreaGateProps = {
  permissions: readonly Permission[]
  deniedMessage: string
  children: ReactNode
}

// Shows the screen only when every listed permission is held; the backend still enforces each call.
export function AreaGate({ permissions, deniedMessage, children }: AreaGateProps) {
  const profile = useProfile()
  const t = useUsersText()

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
  if (!permissions.every(permission => profile.can(permission))) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <div
          role="alert"
          className="flex max-w-md animate-rise-in flex-col items-center gap-3 rounded-lg border border-border bg-white p-8 text-center shadow-sm"
        >
          <span className="grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
            <Lock aria-hidden className="size-5" />
          </span>
          <h1 className="text-[15px] font-semibold text-foreground">{deniedMessage}</h1>
        </div>
      </div>
    )
  }
  return children
}

// Every User route needs Users + Access (UserController.cs:17-18, 26-27).
export function UsersGate({ children }: { children: ReactNode }) {
  return (
    <AreaGate permissions={[USERS_ACCESS]} deniedMessage={USERS_FALLBACK_ONLY.noAccess}>
      {children}
    </AreaGate>
  )
}
