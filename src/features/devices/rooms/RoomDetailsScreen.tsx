'use client'

import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useApiRead } from '@/shared/api'
import { ROOMS_ROUTE } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { buttonVariants, DelayedLoading, ErrorState } from '@/shared/ui'
import { DevicesGate, ROOMS_ACCESS } from '../DevicesGate'
import { DEVICES_FALLBACK_ONLY, useDevicesText } from '../index/devices-text'
import { useDevicesSections } from '../use-devices-sections'
import { fetchRoomDetails } from './room-details-api'
import { NEW_ROOM_PARAM, parseRoomIdParam } from './room-form'
import { RoomDetailsForm } from './RoomDetailsForm'

export function RoomDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <DevicesGate permission={ROOMS_ACCESS} noAccessText={DEVICES_FALLBACK_ONLY.noRoomAccess}>
      <RoomDetailsWorkspace idParam={idParam} />
    </DevicesGate>
  )
}

function RoomDetailsWorkspace({ idParam }: { idParam: string }) {
  const t = useDevicesText()
  const sections = useDevicesSections()
  // The form renders Save and Cancel into the page header through this slot.
  const [actionsSlot, setActionsSlot] = useState<HTMLDivElement | null>(null)
  const id = parseRoomIdParam(idParam)
  const load = useCallback(
    (signal: AbortSignal) => fetchRoomDetails(id === 'invalid' ? null : id, signal),
    [id],
  )
  const read = useApiRead(id === 'invalid' ? null : `room-details:${id ?? NEW_ROOM_PARAM}`, load)
  const view = read.data
  const notFound = id === 'invalid' || (read.status === 'error' && read.error?.status === 404)

  const title = view
    ? view.detail.id === 0
      ? DEVICES_FALLBACK_ONLY.newRoom
      : view.detail.name || view.detail.externalCode || t('Room')
    : t('Room')

  let body
  if (notFound) {
    body = (
      <div role="alert" className="grid flex-1 place-items-center">
        <div className="flex animate-rise-in flex-col items-center gap-3 text-center motion-reduce:animate-none">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-5" />
          </span>
          <p className="text-[15px] font-semibold text-foreground">{DEVICES_FALLBACK_ONLY.roomNotFound}</p>
          <Link href={ROOMS_ROUTE} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft aria-hidden className="size-4" />
            {t('Room')}
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
    body = <RoomDetailsForm key={view.detail.id} view={view} t={t} actionsSlot={actionsSlot} />
  }

  return (
    <AreaWorkspace
      areaLabel={t('Devices')}
      sections={sections}
      activeId="room"
      title={title}
      collapseLabel={t('Collapse')}
      expandLabel={DEVICES_FALLBACK_ONLY.expand}
      actions={<div ref={setActionsSlot} className="contents" />}
    >
      {body}
    </AreaWorkspace>
  )
}
