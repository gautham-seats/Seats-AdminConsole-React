'use client'

import { Hand, Pencil, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '@/shared/api'
import { formatShortDate } from '@/shared/i18n/culture'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import {
  CfcWorkflowApprovalType,
  CfcWorkflowStatusType,
  WorkflowType,
  type CfcWorkflowDto,
} from '@/types/case'
import { FRAME_EN } from '@/features/settings/shared/SettingsFrame'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { updateWorkflowApprovalType, updateWorkflowStatusType } from '../case-api'

const EDIT = { item: PermissionItem.Case, action: PermissionAction.Edit }
const ADD = { item: PermissionItem.Case, action: PermissionAction.Add }
const MANUAL = { item: PermissionItem.AdminCfcStudentManualIntervention, action: PermissionAction.Access }

const TEXT = {
  Approved: 'Approved',
  NotApproved: 'Not Approved',
  AutoApproved: 'Auto Approved',
  Live: 'Live',
  Disabled: 'Disabled',
  Students: 'Students',
  Emails: 'Emails',
  StageChanges: 'Stage changes',
  FinalWarnings: 'Final warnings',
  NextCheck: 'Next check',
  Constraints: 'Constraints',
  ManualInterventions: 'Manual Interventions',
  Edit: 'Edit',
  ApprovalChanged: 'Approval changed successfully.',
  StatusChanged: 'Status changed successfully.',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  Status: 'Status',
  General: 'General',
  Engagement: 'Engagement',
} as const

function isBlankWorkflow(workflow: CfcWorkflowDto): boolean {
  return (
    workflow.cfcWorkflowTypeId === WorkflowType.General ||
    workflow.cfcWorkflowTypeId === WorkflowType.Engagement
  )
}

function showMetric(value: number | string | null | undefined): boolean {
  return value !== null && value !== undefined
}

// seats-admin-workflow-creator.html:655-657 formats nextCheckDate in the UI locale (D-076: short date per culture).
function formatAdminDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return formatShortDate(date)
}

type WorkflowHeaderProps = {
  workflow: CfcWorkflowDto
  onEdit: () => void
  onConstraints: () => void
  onManualInterventions: () => void
  onUpdated: () => void
  onNotice: (message: string, tone: 'success' | 'error') => void
}

export function WorkflowHeader({
  workflow,
  onEdit,
  onConstraints,
  onManualInterventions,
  onUpdated,
  onNotice,
}: WorkflowHeaderProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canEdit = profile.can(EDIT)
  // seats-admin-workflow-creator.html:218 shows Constraints with the 'create' (Add) permission.
  const canAddConstraints = profile.can(ADD)
  const canManual = profile.can(MANUAL)
  const blank = isBlankWorkflow(workflow)
  const [busy, setBusy] = useState<'approval' | 'status' | null>(null)

  const changeApproval = async (value: string) => {
    if (!canEdit) return
    setBusy('approval')
    try {
      await updateWorkflowApprovalType(workflow.id, Number(value))
      onNotice(t('ApprovalChanged'), 'success')
      onUpdated()
    } catch (caught) {
      const error = toApiError(caught)
      onNotice(error.kind === 'blocked' ? FRAME_EN.safeMode : t('AlertGeneralErrorDefault'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const changeStatus = async (value: string) => {
    if (!canEdit) return
    setBusy('status')
    try {
      await updateWorkflowStatusType(workflow.id, Number(value))
      onNotice(t('StatusChanged'), 'success')
      onUpdated()
    } catch (caught) {
      const error = toApiError(caught)
      onNotice(error.kind === 'blocked' ? FRAME_EN.safeMode : t('AlertGeneralErrorDefault'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const stats = blank
    ? []
    : [
        { label: t('Students'), value: workflow.totalStudentsInWorkflowCount },
        { label: t('Emails'), value: workflow.totalEmailCount },
        { label: t('StageChanges'), value: workflow.totalStageChange },
        { label: t('FinalWarnings'), value: workflow.finalWarningStageChange },
        { label: t('NextCheck'), value: formatAdminDate(workflow.nextCheckDate) },
      ].filter(stat => showMetric(stat.value) && stat.value !== '—')

  const typeLabel =
    workflow.cfcWorkflowTypeId === WorkflowType.General
      ? t('General')
      : workflow.cfcWorkflowTypeId === WorkflowType.Engagement
        ? t('Engagement')
        : null

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-3">
        {!blank && showMetric(workflow.cfcWorkflowApprovalTypeId) ? (
          <Select
            value={String(workflow.cfcWorkflowApprovalTypeId)}
            disabled={!canEdit || busy === 'approval'}
            onValueChange={value => void changeApproval(value)}
          >
            <SelectTrigger className="w-[180px]" aria-label={t('Approved')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(CfcWorkflowApprovalType.Approve)}>{t('Approved')}</SelectItem>
              <SelectItem value={String(CfcWorkflowApprovalType.NotApproved)}>{t('NotApproved')}</SelectItem>
              <SelectItem value={String(CfcWorkflowApprovalType.AutoApprove)}>{t('AutoApproved')}</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {!blank && showMetric(workflow.cfcWorkflowStatusTypeId) ? (
          <Select
            value={String(workflow.cfcWorkflowStatusTypeId)}
            disabled={!canEdit || busy === 'status'}
            onValueChange={value => void changeStatus(value)}
          >
            <SelectTrigger className="w-[140px]" aria-label={t('Status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(CfcWorkflowStatusType.Live)}>{t('Live')}</SelectItem>
              <SelectItem value={String(CfcWorkflowStatusType.Draft)}>{t('Disabled')}</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        {typeLabel ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {typeLabel}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {!blank && canAddConstraints ? (
            <Button type="button" variant="outline" size="sm" onClick={onConstraints}>
              <SlidersHorizontal aria-hidden className="size-4" />
              {t('Constraints')}
            </Button>
          ) : null}
          {canManual ? (
            <Button type="button" variant="outline" size="sm" onClick={onManualInterventions}>
              <Hand aria-hidden className="size-4" />
              {t('ManualInterventions')}
            </Button>
          ) : null}
          {canEdit ? (
            <Button type="button" size="sm" onClick={onEdit}>
              <Pencil aria-hidden className="size-4" />
              {t('Edit')}
            </Button>
          ) : null}
        </div>
      </div>
      {stats.length > 0 ? (
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground tabular-nums">
          {stats.map(stat => (
            <span key={stat.label}>
              <span className="font-medium text-foreground">{stat.label}</span> {stat.value}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}
