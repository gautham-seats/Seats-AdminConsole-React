'use client'

import { useMemo } from 'react'
import { OPERATIONS_GROUP } from '@/shared/shell/admin-menu'
import type { WorkspaceArea } from '@/features/settings/shared/SettingsFrame'
import { useScreenText } from '@/features/settings/shared/use-screen-text'

const TEXT = { Rollback: 'Rollback', Jobs: 'Jobs', JobSchedule: 'Job Schedule' } as const

export function useOperationsArea(): { area: WorkspaceArea; t: (key: keyof typeof TEXT) => string } {
  const t = useScreenText(TEXT)
  const area = useMemo<WorkspaceArea>(
    () => ({
      label: 'Operations',
      sections: OPERATIONS_GROUP,
      labels: { rollback: t('Rollback'), 'job-schedule': t('Jobs') },
    }),
    [t],
  )
  return { area, t }
}
