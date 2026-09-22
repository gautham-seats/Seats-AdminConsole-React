'use client'

import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog } from '@/shared/ui'
import type { DeviceListItemDto } from '@/types/devices'
import { datePattern, formatDate, parseDate } from './date-input'
import { DateField } from './DateField'
import { DEVICES_FALLBACK_ONLY, invalidDateText, type DevicesText } from './devices-text'

type ReprocessDialogProps = {
  device: DeviceListItemDto | null
  pending: boolean
  onClose: () => void
  onConfirm: (device: DeviceListItemDto, date: string) => void
  t: DevicesText
}

// Index.cshtml:168-196; a fresh form per open, as legacy rebuilds its view model (deviceIndexController.js:304-318).
export function ReprocessDialog({ device, pending, onClose, onConfirm, t }: ReprocessDialogProps) {
  return (
    <Dialog
      open={device !== null}
      onOpenChange={open => {
        if (!open && !pending) onClose()
      }}
      title={t('ReprocessCardSwipes')}
      description={device?.description ?? undefined}
      closeLabel={t('Close')}
      className="max-w-md"
    >
      {device ? (
        <ReprocessForm
          key={device.id}
          device={device}
          pending={pending}
          onClose={onClose}
          onConfirm={onConfirm}
          t={t}
        />
      ) : null}
    </Dialog>
  )
}

function ReprocessForm({
  device,
  pending,
  onClose,
  onConfirm,
  t,
}: Omit<ReprocessDialogProps, 'device'> & { device: DeviceListItemDto }) {
  const [date, setDate] = useState(() => formatDate(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const check = (value: string): string | null => {
    if (!value.trim()) return t('Required')
    if (!parseDate(value)) return invalidDateText(datePattern())
    return null
  }

  const submit = () => {
    if (pending) return
    setSubmitted(true)
    const problem = check(date)
    setError(problem)
    if (!problem) onConfirm(device, date.trim())
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{DEVICES_FALLBACK_ONLY.reprocessHelp}</p>
      <DateField
        id="devices-reprocess-date"
        value={date}
        onChange={next => {
          setDate(next)
          // After a Save attempt the message follows the current value instead of waiting for the next click.
          if (submitted) setError(check(next))
        }}
        onSubmit={submit}
        error={error}
        disabled={pending}
        labels={{
          label: t('Date'),
          chooseDate: DEVICES_FALLBACK_ONLY.chooseDate,
          previousMonth: t('Previous'),
          nextMonth: t('Next'),
          today: t('Today'),
        }}
      />
      {/* Tab order follows the DOM (Cancel, Confirm); narrow screens only stack Confirm on top visually. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          {t('Cancel')}
        </Button>
        <Button onClick={submit} loading={pending}>
          <RefreshCw
            aria-hidden
            className={pending ? 'size-4 animate-spin motion-reduce:animate-none' : 'size-4'}
          />
          {t('Confirm')}
        </Button>
      </div>
    </>
  )
}
