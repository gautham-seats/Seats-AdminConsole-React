'use client'

import { useMemo } from 'react'
import { CASES_GROUP } from '@/shared/shell/admin-menu'
import type { WorkspaceArea } from '@/features/settings/shared/SettingsFrame'
import { useScreenText } from '@/features/settings/shared/use-screen-text'

const TEXT = { WorkflowAdmin: 'Workflow Admin', StudentWorkflow: 'Student Workflow' } as const

export function useCaseArea(): { area: WorkspaceArea; t: (key: keyof typeof TEXT) => string } {
  const t = useScreenText(TEXT)
  const area = useMemo<WorkspaceArea>(
    () => ({
      label: 'Cases',
      sections: CASES_GROUP,
      labels: {
        'workflow-admin': t('WorkflowAdmin'),
        'student-workflow': t('StudentWorkflow'),
      },
    }),
    [t],
  )
  return { area, t }
}
