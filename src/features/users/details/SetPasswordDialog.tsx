'use client'

import { KeyRound, Save } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, Input, Label } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { UsersTextKey } from '../index/users-text'
import { isGeneralError } from '../index/general-error'
import { saveErrorText } from '../save-error'
import { useChangeCommit } from './use-change-commit'
import { setUserPassword } from './user-details-api'
import { PASSWORD_POLICY_TEXT, validateNewPassword, type FieldError } from './user-form'

export type SetPasswordDialogProps = {
  userId: number
  userName: string
  t: (key: UsersTextKey) => string
  onSaved: () => void
  onFailed: (message: string) => void
  onClose: () => void
}

type Touched = { password: boolean; confirm: boolean }

// Views/User/_PasswordConfirmation.cshtml with setPasswordViewModel (userDetailsController.js:297-369).
export function SetPasswordDialog({
  userId,
  userName,
  t,
  onSaved,
  onFailed,
  onClose,
}: SetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  // ko.validation shows a message once its field is modified on change, or all after Save (showAllMessages).
  const [touched, setTouched] = useState<Touched>({ password: false, confirm: false })
  // Messages follow the values as of the last change event (knockout value binding).
  const [committed, setCommitted] = useState({ password: '', confirm: '' })
  const [showAll, setShowAll] = useState(false)
  const [saving, setSaving] = useState(false)
  const commit = useChangeCommit()

  const errors = validateNewPassword(password, confirm, userName)
  const shownErrors = validateNewPassword(committed.password, committed.confirm, userName)
  // A shown message clears as soon as the current value is valid; after Save it follows the current value.
  const shown = (live: FieldError | undefined, last: FieldError | undefined, fieldTouched: boolean) =>
    !live ? undefined : showAll ? live : fieldTouched ? last : undefined
  const passwordError = shown(errors.password, shownErrors.password, touched.password)
  const confirmError = shown(errors.confirm, shownErrors.confirm, touched.confirm)
  const mismatch = confirmError === 'passwordConfirmation'

  const message = (error: FieldError | undefined) =>
    error === 'required' || error === 'passwordRequired' || error === 'confirmRequired'
      ? t('Required')
      : error === 'passwordPolicy'
        ? PASSWORD_POLICY_TEXT
        : error === 'passwordConfirmation'
          ? t('TheConfirmationDoesNotMatchThePassword')
          : null

  const save = async () => {
    setCommitted({ password, confirm })
    if (errors.password || errors.confirm) {
      setShowAll(true)
      return
    }
    setSaving(true)
    try {
      await setUserPassword(userId, password)
      onSaved()
    } catch (error) {
      // userDetailsController.js:339-352: page alert for 10 s, the dialog stays open; swapp.js:204 overrides other statuses.
      onFailed(
        isGeneralError(error)
          ? t('AlertGeneralErrorDefault')
          : saveErrorText(error, t('AlertSaveErrorDefault')),
      )
      setSaving(false)
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    onCommit: () => void,
    error: FieldError | undefined,
    relatedErrorId?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700">
        {label}
      </Label>
      <div className="relative">
        <KeyRound
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          type="password"
          autoComplete="new-password"
          value={value}
          aria-invalid={Boolean(error || relatedErrorId)}
          aria-describedby={error ? `${id}-error` : relatedErrorId}
          onChange={event => onChange(event.target.value)}
          {...commit(onCommit)}
          className={cn('h-9 bg-white pl-9', (error || relatedErrorId) && 'border-destructive')}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="animate-rise-in text-xs font-medium text-destructive">
          {message(error)}
        </p>
      ) : null}
    </div>
  )

  return (
    <Dialog
      open
      onOpenChange={open => (open || saving ? undefined : onClose())}
      title={t('SetPassword')}
      closeLabel={t('Cancel')}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            {t('Cancel')}
          </Button>
          <Button size="sm" type="button" loading={saving} onClick={() => (saving ? undefined : void save())}>
            <Save aria-hidden className={cn('size-4', saving && 'animate-soft-pulse')} />
            {t('Save')}
          </Button>
        </>
      }
    >
      {/* _PasswordConfirmation.cshtml has no form; Save is a click binding, so Enter does nothing. */}
      <div className="flex flex-col gap-4">
        {field(
          'set-password',
          t('Password'),
          password,
          setPassword,
          () => {
            setCommitted({ password, confirm })
            setTouched(current => ({ ...current, password: true }))
          },
          passwordError,
          mismatch ? 'set-password-confirm-error' : undefined,
        )}
        {field(
          'set-password-confirm',
          t('ConfirmPassword'),
          confirm,
          setConfirm,
          () => {
            setCommitted({ password, confirm })
            setTouched(current => ({ ...current, confirm: true }))
          },
          confirmError,
        )}
      </div>
    </Dialog>
  )
}
