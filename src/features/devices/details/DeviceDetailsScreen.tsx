'use client'

import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'
import { useCallback } from 'react'
import { useApiRead } from '@/shared/api'
import { DEVICES_ROUTE } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { buttonVariants, DelayedLoading, ErrorState } from '@/shared/ui'
import { DevicesGate } from '../DevicesGate'
import { DEVICES_FALLBACK_ONLY, useDevicesText } from '../index/devices-text'
import { useDevicesSections } from '../use-devices-sections'
import { fetchDeviceDetails } from './device-details-api'
import { NEW_DEVICE_PARAM, parseDeviceIdParam } from './device-form'
import { DeviceDetailsForm } from './DeviceDetailsForm'

export function DeviceDetailsScreen({ idParam }: { idParam: string }) {
  return (
    <DevicesGate>
      <DeviceDetailsWorkspace idParam={idParam} />
    </DevicesGate>
  )
}

function DeviceDetailsWorkspace({ idParam }: { idParam: string }) {
  const t = useDevicesText()
  const sections = useDevicesSections()
  const id = parseDeviceIdParam(idParam)
  const load = useCallback(
    (signal: AbortSignal) => fetchDeviceDetails(id === 'invalid' ? null : id, signal),
    [id],
  )
  const read = useApiRead(id === 'invalid' ? null : `device-details:${id ?? NEW_DEVICE_PARAM}`, load)
  const view = read.data
  const notFound = id === 'invalid' || (read.status === 'error' && read.error?.status === 404)

  const title = view
    ? view.detail.id === 0
      ? DEVICES_FALLBACK_ONLY.newDevice
      : view.detail.description || view.detail.serialNumber || t('Device')
    : t('Device')

  let body
  if (notFound) {
    body = (
      <div role="alert" className="grid flex-1 place-items-center">
        <div className="flex animate-rise-in flex-col items-center gap-3 text-center motion-reduce:animate-none">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <SearchX aria-hidden className="size-5" />
          </span>
          <p className="text-[15px] font-semibold text-foreground">{DEVICES_FALLBACK_ONLY.notFound}</p>
          <Link href={DEVICES_ROUTE} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <ArrowLeft aria-hidden className="size-4" />
            {t('Devices')}
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
    body = <DeviceDetailsForm key={view.detail.id} view={view} t={t} />
  }

  return (
    <AreaWorkspace
      areaLabel={t('Devices')}
      sections={sections}
      activeId="device"
      title={title}
      collapseLabel={t('Collapse')}
      expandLabel={DEVICES_FALLBACK_ONLY.expand}
    >
      {body}
    </AreaWorkspace>
  )
}
