'use client'

import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useCallback } from 'react'
import { useApiRead } from '@/shared/api'
import { CONTACT_GROUPS_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { buttonVariants, DelayedLoading, ErrorState } from '@/shared/ui'
import { parseUserIdParam } from '../details/UserDetailsScreen'
import { USERS_FALLBACK_ONLY, useUsersText } from '../index/users-text'
import { useUsersSections } from '../use-users-sections'
import { AreaGate } from '../UsersGate'
import { fetchContactGroup } from './contact-group-details-api'
import { ContactGroupForm } from './ContactGroupForm'

const ACCESS = { item: PermissionItem.ContactGroup, action: PermissionAction.Access }

// /users/contact-groups/new and /users/contact-groups/{id} (ContactGroupController.cs:27-35).
export function ContactGroupDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <AreaGate permissions={[ACCESS]} deniedMessage={USERS_FALLBACK_ONLY.noPageAccess}>
      <ContactGroupDetailsWorkspace idParam={idParam} />
    </AreaGate>
  )
}

function ContactGroupDetailsWorkspace({ idParam }: { idParam: string }) {
  const t = useUsersText()
  const sections = useUsersSections()
  const id = parseUserIdParam(idParam)
  const load = useCallback(
    (signal: AbortSignal) => fetchContactGroup(id === 'invalid' ? null : id, signal),
    [id],
  )
  const read = useApiRead(id === 'invalid' ? null : `contact-group:${id ?? 'new'}`, load)
  const view = read.data
  const notFound = id === 'invalid' || (read.status === 'error' && read.error?.status === 404)
  const title = view
    ? view.detail.id === 0
      ? USERS_FALLBACK_ONLY.newContactGroup
      : (view.detail.name ?? t('ContactGroup'))
    : t('ContactGroup')

  let body
  if (notFound) {
    body = (
      <div role="alert" className="grid flex-1 place-items-center">
        <div className="flex animate-rise-in flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-5" />
          </span>
          <p className="text-[15px] font-semibold text-foreground">
            {USERS_FALLBACK_ONLY.contactGroupNotFound}
          </p>
          <Link href={CONTACT_GROUPS_ROUTE} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft aria-hidden className="size-4" />
            {t('ContactGroup')}
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
  } else if (!view) {
    body = (
      <div className="grid flex-1 place-items-center">
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  } else {
    body = <ContactGroupForm key={view.detail.id} view={view} t={t} />
  }

  return (
    <AreaWorkspace
      areaLabel={t('Users')}
      sections={sections}
      activeId="contact-group"
      title={title}
      collapseLabel={t('Collapse')}
      expandLabel={USERS_FALLBACK_ONLY.expand}
      navigation="admin"
    >
      {body}
    </AreaWorkspace>
  )
}
