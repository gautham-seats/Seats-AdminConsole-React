'use client'

import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useCallback } from 'react'
import { useApiRead } from '@/shared/api'
import { USERS_ROUTE } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { buttonVariants, DelayedLoading, ErrorState } from '@/shared/ui'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import { UsersGate } from '../UsersGate'
import { useUsersSections } from '../use-users-sections'
import { fetchUserDetails } from './user-details-api'
import { UserDetailsForm } from './UserDetailsForm'

export const NEW_USER_PARAM = 'new'

// /users/new and /users/{id} (spec user-details.md Route table).
export function parseUserIdParam(param: string): number | null | 'invalid' {
  if (param === NEW_USER_PARAM) return null
  return /^[1-9]\d*$/.test(param) ? Number(param) : 'invalid'
}

export function UserDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <UsersGate>
      <UserDetailsWorkspace idParam={idParam} />
    </UsersGate>
  )
}

function UserDetailsWorkspace({ idParam }: { idParam: string }) {
  const t = useUsersText()
  const sections = useUsersSections()
  const id = parseUserIdParam(idParam)
  const load = useCallback(
    (signal: AbortSignal) => fetchUserDetails(id === 'invalid' ? null : id, signal),
    [id],
  )
  const read = useApiRead(id === 'invalid' ? null : `user-details:${id ?? NEW_USER_PARAM}`, load)
  const view = read.data
  const notFound = id === 'invalid' || (read.status === 'error' && read.error?.status === 404)

  const title = view
    ? view.detail.id === 0
      ? USERS_FALLBACK_ONLY.newUser
      : (view.detail.userName ?? t('User'))
    : t('User')

  const frame = {
    areaLabel: t('Users'),
    sections,
    title,
    collapseLabel: t('Collapse'),
    expandLabel: USERS_FALLBACK_ONLY.expand,
  }

  // The loaded form owns the frame so Save, Discard and Cancel sit in the page header (D-018).
  if (view && !notFound && read.status !== 'error') {
    return <UserDetailsForm key={`${view.detail.id}:${read.status}`} view={view} t={t} frame={frame} />
  }

  let body
  if (notFound) {
    body = (
      <div role="alert" className="grid flex-1 place-items-center">
        <div className="flex animate-rise-in flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-5" />
          </span>
          <p className="text-[15px] font-semibold text-foreground">{USERS_FALLBACK_ONLY.notFound}</p>
          <Link href={USERS_ROUTE} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft aria-hidden className="size-4" />
            {t('Users')}
          </Link>
        </div>
      </div>
    )
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
  } else {
    body = (
      <div className="grid flex-1 place-items-center">
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  }

  return (
    <AreaWorkspace
      areaLabel={frame.areaLabel}
      sections={frame.sections}
      activeId="user"
      title={frame.title}
      collapseLabel={frame.collapseLabel}
      expandLabel={frame.expandLabel}
      navigation="admin"
    >
      {body}
    </AreaWorkspace>
  )
}
