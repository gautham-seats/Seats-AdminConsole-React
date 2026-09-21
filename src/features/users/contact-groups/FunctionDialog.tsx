'use client'

import { Check, Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Dialog, Input, Label } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { FunctionDto } from '@/types/contact-groups'
import { toApiError } from '@/shared/api'
import { useChangeCommit } from '../details/use-change-commit'
import { isGeneralError } from '../index/general-error'
import { StatusNotice, type Notice } from '../index/StatusNotice'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from '../index/users-text'
import { saveErrorText } from '../save-error'
import { deleteFunction, saveFunction } from './contact-group-details-api'

const isBlocked = (error: unknown) => toApiError(error).kind === 'blocked'
// contactGroupDetailsController.js:417-419 save and :358 delete failure timings.
const SAVE_ERROR_MS = 10000
const DELETE_ERROR_MS = 3000

export type FunctionDialogProps = {
  current: FunctionDto | null
  t: (key: UsersTextKey) => string
  onSaved: (saved: FunctionDto) => void
  onDeleted: (id: number) => void
  onClose: () => void
}

// ContactGroup/Details.cshtml:241-281 with setFunctionViewModel (contactGroupDetailsController.js:336-431).
export function FunctionDialog({ current, t, onSaved, onDeleted, onClose }: FunctionDialogProps) {
  const id = current?.id ?? 0
  const [name, setName] = useState(current?.name ?? '')
  // Details.cshtml:259 and contactGroupDetailsController.js:339-345: Required shows once the name is changed.
  const [committedName, setCommittedName] = useState(name)
  const [modified, setModified] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const fail = (message: string, duration: number) =>
    setNotice({ id: Date.now(), tone: 'error', message, duration })
  const changeCommit = useChangeCommit()
  // Clears as soon as the typed name is valid; after Apply it follows the current value.
  const missing = !name.trim() && (submitted || (modified && !committedName.trim()))
  // swapp.js:168-206 replaces the text with the general error but keeps this alert's timer (swalert.js:77-87).
  const failureText = (error: unknown, text: string) =>
    isGeneralError(error) ? t('AlertGeneralErrorDefault') : text

  const apply = async () => {
    setSubmitted(true)
    setCommittedName(name)
    if (!name.trim()) return
    setPending(true)
    try {
      onSaved(await saveFunction(id, name))
    } catch (error) {
      fail(failureText(error, saveErrorText(error, t('AlertSaveErrorDefault'))), SAVE_ERROR_MS)
      setPending(false)
    }
  }

  // Details.cshtml:268-269 deletes at once, with no confirmation (contactGroupDetailsController.js:346).
  const remove = async () => {
    setPending(true)
    try {
      await deleteFunction(id)
      onDeleted(id)
    } catch (error) {
      // Legacy delete always shows the generic text (contactGroupDetailsController.js:352-359).
      fail(
        isBlocked(error) ? USERS_FALLBACK_ONLY.safeMode : failureText(error, t('AlertSaveErrorDefault')),
        DELETE_ERROR_MS,
      )
      setPending(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={open => (open || pending ? undefined : onClose())}
      title={id > 0 ? t('EditFunction') : t('CreateNewFunction')}
      closeLabel={t('Cancel')}
      footer={
        <>
          {id > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="sm:mr-auto"
              disabled={pending}
              onClick={() => void remove()}
            >
              <Trash2 aria-hidden className="size-4" />
              {t('Delete')}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" disabled={pending} onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            size="sm"
            type="button"
            loading={pending}
            onClick={() => {
              if (!pending) void apply()
            }}
          >
            <Check aria-hidden className="size-4" />
            {t('Apply')}
          </Button>
        </>
      }
    >
      {/* Details.cshtml:253-275 has no form, so Enter never applies. */}
      <div className="flex flex-col gap-3">
        {/* Portalled so the page toast floats above the modal while staying in its React tree. */}
        {notice && typeof document !== 'undefined'
          ? createPortal(
              <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />,
              document.body,
            )
          : null}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="function-name" className="text-[13px] font-medium text-slate-700">
            {t('Name')}
          </Label>
          <Input
            id="function-name"
            value={name}
            autoFocus
            aria-invalid={missing}
            aria-describedby={missing ? 'function-name-error' : undefined}
            onChange={event => setName(event.target.value)}
            {...changeCommit(() => {
              setCommittedName(name)
              setModified(true)
            })}
            className={cn('h-9 bg-white', missing && 'border-destructive')}
          />
          {missing ? (
            <p id="function-name-error" role="alert" className="text-xs font-medium text-destructive">
              {t('Required')}
            </p>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}
