'use client'

import type { ReactNode } from 'react'
import type { ApiError, ReadStatus } from '@/shared/api'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { EmptyState } from '@/shared/ui/EmptyState'
import { useScreenText } from '@/features/settings/shared/use-screen-text'

const TEXT = {
  Loading: 'Loading',
  Refresh: 'Refresh',
  Error: 'There was an error while processing your request.',
  Empty: 'There are no items to show.',
} as const

export function NodePanelState({
  status,
  empty = false,
  onRetry,
  error = null,
  children,
}: {
  status: ReadStatus
  empty?: boolean
  onRetry: () => void
  error?: ApiError | null
  children: ReactNode
}) {
  const t = useScreenText(TEXT)
  if (status === 'idle' || status === 'loading') return <DelayedLoading active label={t('Loading')} />
  if (status === 'error')
    return <ErrorState message={t('Error')} retryLabel={t('Refresh')} onRetry={onRetry} error={error} />
  if (empty) return <EmptyState title={t('Empty')} />
  return children
}
