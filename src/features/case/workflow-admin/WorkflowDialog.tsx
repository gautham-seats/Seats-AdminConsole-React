'use client'

import { GitBranch, Save } from 'lucide-react'
import { useState } from 'react'
import { toApiError } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, Input } from '@/shared/ui'
import type { CfcWorkflowDto } from '@/types/case'
import { FormDialog } from '@/features/settings/shared/FormDialog'
import { SettingsField } from '@/features/settings/shared/SettingsCard'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { createWorkflow, updateWorkflow, type WorkflowNameBody } from '../case-api'

const ADD = { item: PermissionItem.Case, action: PermissionAction.Add }
const EDIT = { item: PermissionItem.Case, action: PermissionAction.Edit }
const NAME_MAX = 50

const TEXT = {
  Add: 'Add',
  Edit: 'Edit',
  Save: 'Save',
  Cancel: 'Cancel',
  Close: 'Close',
  Name: 'Name',
  NameIsRequired: 'The Name is required.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  InputManuallyValidated: 'Input manually validated',
} as const

const EN = {
  addTitle: 'Add workflow',
  editTitle: 'Edit workflow',
} as const

type WorkflowDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflow: CfcWorkflowDto | null
  onSaved: (message: string) => void
}

function toBody(workflow: CfcWorkflowDto | null, name: string): WorkflowNameBody {
  return { id: workflow?.id ?? null, name: name.trim() }
}

function WorkflowDialogForm({
  workflow,
  onClose,
  onSaved,
}: {
  workflow: CfcWorkflowDto | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const isEdit = workflow !== null
  const canSave = profile.can(isEdit ? EDIT : ADD)
  const [name, setName] = useState(workflow?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempted, setAttempted] = useState(false)
  // Requirement 8.1: shown after the first Save and cleared as soon as a name is typed.
  const nameError = attempted && !name.trim() ? t('NameIsRequired') : null

  const save = async () => {
    if (!canSave) return
    setAttempted(true)
    if (!name.trim()) {
      setError(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const body = toBody(workflow, name)
      if (isEdit) await updateWorkflow(body)
      else await createWorkflow(body)
      // seats-admin-workflow-creator.html:715-719 toasts AlertSaveSucceededDefault and reloads the grid.
      onSaved(t('AlertSaveSucceededDefault'))
      onClose()
    } catch (caught) {
      setError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setBusy(false)
    }
  }

  return (
    <FormDialog
      open
      onOpenChange={next => {
        if (!next && !busy) onClose()
      }}
      icon={GitBranch}
      title={isEdit ? EN.editTitle : EN.addTitle}
      closeLabel={t('Close')}
      busy={busy}
      error={error}
      onSubmit={() => void save()}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          {canSave ? (
            <Button type="submit" size="sm" disabled={busy}>
              <Save aria-hidden className="size-4" />
              {t('Save')}
            </Button>
          ) : null}
        </>
      }
    >
      <SettingsField
        htmlFor="workflow-name"
        label={t('Name')}
        hint={t('InputManuallyValidated')}
        error={nameError}
      >
        <Input
          id="workflow-name"
          maxLength={NAME_MAX}
          value={name}
          required
          aria-required
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? 'workflow-name-error' : undefined}
          onChange={event => setName(event.target.value)}
        />
      </SettingsField>
    </FormDialog>
  )
}

export function WorkflowDialog({ open, onOpenChange, workflow, onSaved }: WorkflowDialogProps) {
  if (!open) return null
  return (
    <WorkflowDialogForm
      key={workflow ? String(workflow.id) : 'create'}
      workflow={workflow}
      onClose={() => onOpenChange(false)}
      onSaved={onSaved}
    />
  )
}
