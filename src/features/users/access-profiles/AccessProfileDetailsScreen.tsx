'use client'

import { useCallback } from 'react'
import { useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { NotAuthorisedScreen } from '@/features/errors/ErrorPages'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import { useUsersSections } from '../use-users-sections'
import { AreaGate } from '../UsersGate'
import { fetchAccessProfile } from './access-profile-details-api'
import { AccessProfileForm } from './AccessProfileForm'

const ACCESS = { item: PermissionItem.AccessProfiles, action: PermissionAction.Access }

// swapp.js:466-482: anything but a positive whole number opens a blank new profile (id 0).
export function accessProfileRequestId(idParam: string): number {
  return /^[1-9]\d*$/.test(idParam) ? Number(idParam) : 0
}

// /users/access-profiles/new and /users/access-profiles/{id} (AccessProfileController.cs:28-35).
export function AccessProfileDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <AreaGate permissions={[ACCESS]} deniedMessage={USERS_FALLBACK_ONLY.noPageAccess}>
      <AccessProfileDetailsWorkspace idParam={idParam} />
    </AreaGate>
  )
}

function AccessProfileDetailsWorkspace({ idParam }: { idParam: string }) {
  const t = useUsersText()
  const sections = useUsersSections()
  const id = accessProfileRequestId(idParam)
  const load = useCallback((signal: AbortSignal) => fetchAccessProfile(id, signal), [id])
  const read = useApiRead(`access-profile:${id}`, load)
  const view = read.data
  // AccessProfileApiController.cs:183-187 answers 401 for a restricted profile the user does not hold.
  const notAuthorised = read.status === 'error' && read.error?.status === 401
  // AccessProfileApiController.cs:179-182 returns an empty profile for an unknown id, shown as a new one.
  const title =
    view && view.details.id > 0
      ? (view.details.name ?? t('AccessProfile'))
      : view || id === 0
        ? USERS_FALLBACK_ONLY.newAccessProfile
        : t('AccessProfile')

  const frame = {
    areaLabel: t('Users'),
    sections,
    title,
    collapseLabel: t('Collapse'),
    expandLabel: USERS_FALLBACK_ONLY.expand,
  }

  // The loaded form owns the frame so Copy profile, Cancel and Save sit in the page header (D-018).
  if (view && !notAuthorised && read.status !== 'error') {
    return <AccessProfileForm key={view.details.id} view={view} t={t} frame={frame} />
  }

  let body
  if (notAuthorised) {
    body = <NotAuthorisedScreen />
  } else if (read.status === 'error') {
    body = (
      <div className="grid flex-1 place-items-center">
        <ErrorState
          variant="page"
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={read.reload}
          error={read.error}
        />
      </div>
    )
  } else if (!view) {
    body = (
      <div className="grid flex-1 place-items-center">
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  } else {
    body = null
  }

  return (
    <AreaWorkspace
      areaLabel={t('Users')}
      sections={sections}
      activeId="access-profile"
      title={title}
      collapseLabel={t('Collapse')}
      expandLabel={USERS_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {body}
    </AreaWorkspace>
  )
}
