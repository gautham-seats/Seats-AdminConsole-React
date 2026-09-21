'use client'

import { ExternalLink } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { SharedResourceKeys, useResources } from '@/shared/resources'
import {
  Button,
  Dialog,
  GearworkLoader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import {
  ACCOUNT_TEXT,
  changePassword,
  fetchCurrentCulture,
  fetchCustomStatement,
  LANGUAGE_OPTIONS,
  readAccessibility,
  saveAccessibility,
  saveCulture,
  SEATS_ACCESSIBILITY_STATEMENT_URL,
  validatePassword,
  type PasswordErrors,
  type PasswordForm,
} from './account-settings'

// GeneralResources keys used by _ConfigureAccessibility, _ChangePassword and _SelectLanguage.
const FALLBACK: Record<string, string> = {
  AccessibilitySettings: ACCOUNT_TEXT.accessibilitySettings,
  HighContrast: ACCOUNT_TEXT.highContrast,
  AutoCloseBannerMessages: ACCOUNT_TEXT.autoCloseBanner,
  SEAtSAccessibilityStatement: ACCOUNT_TEXT.seatsStatement,
  CustomAccessibilityStatementUrl: ACCOUNT_TEXT.customStatement,
  ChangePassword: ACCOUNT_TEXT.changePassword,
  OldPassword: ACCOUNT_TEXT.oldPassword,
  NewPassword: ACCOUNT_TEXT.newPassword,
  ConfirmPassword: ACCOUNT_TEXT.confirmPassword,
  ChangeLanguage: ACCOUNT_TEXT.changeLanguage,
  TitlePreferedLanguage: ACCOUNT_TEXT.preferredLanguage,
  Language: ACCOUNT_TEXT.language,
  OnlineHelp: ACCOUNT_TEXT.onlineHelp,
  Ok: ACCOUNT_TEXT.ok,
  Save: ACCOUNT_TEXT.save,
  PasswordWasChangedSuccessfully: ACCOUNT_TEXT.passwordChanged,
  [SharedResourceKeys.cancel]: 'Cancel',
  [SharedResourceKeys.close]: 'Close',
}

export function useAccountText() {
  const { text } = useResources(useMemo(() => Object.keys(FALLBACK), []))
  return useCallback(
    (key: string) => {
      const value = text(key)
      return !value.trim() || value === key ? (FALLBACK[key] ?? key) : value
    },
    [text],
  )
}

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void }
export type AccountNotice = { id: number; tone: 'success' | 'info'; message: string; durationMs: number }

const YES_NO = [
  { value: 'false', label: ACCOUNT_TEXT.no },
  { value: 'true', label: ACCOUNT_TEXT.yes },
] as const

function YesNoField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_7rem] items-center gap-4">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} title={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YES_NO.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

const LINK =
  'inline-flex items-center justify-center gap-1.5 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

// _ConfigureAccessibility.cshtml: two cookie choices, the SEAtS statement and the tenant's own statement.
export function AccessibilityDialog({ open, onOpenChange }: DialogProps) {
  return open ? <AccessibilityContent onOpenChange={onOpenChange} /> : null
}

function AccessibilityContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const t = useAccountText()
  const [choice, setChoice] = useState(() => readAccessibility())
  const custom = useApiRead('account-custom-statement', fetchCustomStatement)

  const save = () => {
    saveAccessibility(choice)
    onOpenChange(false)
  }

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={t('AccessibilitySettings')}
      closeLabel={t(SharedResourceKeys.close)}
      className="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(SharedResourceKeys.cancel)}
          </Button>
          <Button onClick={save}>{t('Save')}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <YesNoField
          id="high-contrast-calendar"
          label={t('HighContrast')}
          value={choice.highContrast}
          onChange={highContrast => setChoice(current => ({ ...current, highContrast }))}
        />
        <YesNoField
          id="auto-close-banner"
          label={t('AutoCloseBannerMessages')}
          value={choice.autoCloseBanner}
          onChange={autoCloseBanner => setChoice(current => ({ ...current, autoCloseBanner }))}
        />
        <div className="flex flex-col items-center gap-2 border-t border-border pt-4">
          <a href={SEATS_ACCESSIBILITY_STATEMENT_URL} className={LINK}>
            {t('SEAtSAccessibilityStatement')}
          </a>
          {custom.data ? (
            <a href={custom.data.url} target="_blank" rel="noreferrer" className={LINK}>
              {custom.data.name}
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">{t('CustomAccessibilityStatementUrl')}</span>
            </a>
          ) : null}
        </div>
      </div>
    </Dialog>
  )
}

const EMPTY_FORM: PasswordForm = { oldPassword: '', newPassword: '', confirmPassword: '' }
const PASSWORD_FIELDS = [
  { name: 'oldPassword', id: 'old-password', label: 'OldPassword' },
  { name: 'newPassword', id: 'new-password', label: 'NewPassword' },
  { name: 'confirmPassword', id: 'confirm-password', label: 'ConfirmPassword' },
] as const
// changePasswordController.js:71 shows success for 3 s and :75 the server message for 5 s.
const SUCCESS_MS = 3000
const ERROR_MS = 5000

// _ChangePassword.cshtml: old, new and confirm; the server checks the policy and the old password.
export function ChangePasswordDialog({
  open,
  onOpenChange,
  userName,
  onNotice,
}: DialogProps & { userName: string; onNotice: (notice: AccountNotice) => void }) {
  return open ? (
    <ChangePasswordContent onOpenChange={onOpenChange} userName={userName} onNotice={onNotice} />
  ) : null
}

function ChangePasswordContent({
  onOpenChange,
  userName,
  onNotice,
}: {
  onOpenChange: (open: boolean) => void
  userName: string
  onNotice: (notice: AccountNotice) => void
}) {
  const t = useAccountText()
  const [form, setForm] = useState<PasswordForm>(EMPTY_FORM)
  const [attempted, setAttempted] = useState(false)
  // Requirements 8.1: after the first Save, errors follow the current values, so they clear while typing.
  const errors: PasswordErrors = attempted ? validatePassword(form, userName) : {}
  const mismatch = errors.confirmPassword === ACCOUNT_TEXT.confirmMismatch
  const [pending, setPending] = useState(false)

  const save = async () => {
    if (pending) return
    const found = validatePassword(form, userName)
    setAttempted(true)
    if (Object.keys(found).length > 0) return
    setPending(true)
    try {
      await changePassword(form, userName)
      onOpenChange(false)
      onNotice({
        id: Date.now(),
        tone: 'success',
        message: t('PasswordWasChangedSuccessfully'),
        durationMs: SUCCESS_MS,
      })
    } catch (failure) {
      const problem = toApiError(failure)
      const message =
        problem.kind === 'blocked' ? ACCOUNT_TEXT.safeMode : (problem.serverMessage ?? ACCOUNT_TEXT.saveError)
      onNotice({ id: Date.now(), tone: 'info', message, durationMs: ERROR_MS })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={next => {
        if (!next && !pending) onOpenChange(false)
      }}
      title={t('ChangePassword')}
      closeLabel={t(SharedResourceKeys.close)}
      className="max-w-md"
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {t(SharedResourceKeys.cancel)}
          </Button>
          <Button loading={pending} onClick={() => void save()}>
            {t('Save')}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        autoComplete="off"
        onSubmit={event => {
          event.preventDefault()
          void save()
        }}
      >
        {PASSWORD_FIELDS.map(field => (
          <div key={field.name} className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:items-start sm:gap-4">
            <Label htmlFor={field.id} className="sm:pt-2.5">
              {t(field.label)}
            </Label>
            <div className="flex flex-col gap-1">
              <Input
                id={field.id}
                name={field.id}
                type="password"
                autoComplete={field.name === 'oldPassword' ? 'current-password' : 'new-password'}
                title={t(field.label)}
                value={form[field.name]}
                aria-invalid={
                  errors[field.name] || (mismatch && field.name === 'newPassword') ? true : undefined
                }
                aria-describedby={
                  errors[field.name]
                    ? `${field.id}-error`
                    : mismatch && field.name === 'newPassword'
                      ? 'confirm-password-error'
                      : undefined
                }
                onChange={event => {
                  const value = event.target.value
                  setForm(current => ({ ...current, [field.name]: value }))
                }}
              />
              {errors[field.name] ? (
                <p id={`${field.id}-error`} className="text-xs text-destructive">
                  {errors[field.name]}
                </p>
              ) : null}
            </div>
          </div>
        ))}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  )
}

// _SelectLanguage.cshtml: Ok writes the _cultureInfo cookie and reloads the page.
export function LanguageDialog({ open, onOpenChange, reload }: DialogProps & { reload?: () => void }) {
  return open ? <LanguageContent onOpenChange={onOpenChange} reload={reload} /> : null
}

function LanguageContent({
  onOpenChange,
  reload,
}: {
  onOpenChange: (open: boolean) => void
  reload?: () => void
}) {
  const t = useAccountText()
  const current = useApiRead('account-current-culture', fetchCurrentCulture)
  const [picked, setPicked] = useState<string | null>(null)
  const value = picked ?? current.data ?? ''

  const confirm = () => {
    // A blank culture (server setting missing, request failed) must not be written and reloaded into.
    if (!value) return
    saveCulture(value)
    ;(reload ?? (() => window.location.reload()))()
  }

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={t('TitlePreferedLanguage')}
      closeLabel={t(SharedResourceKeys.close)}
      className="max-w-sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t(SharedResourceKeys.cancel)}
          </Button>
          <Button disabled={current.status === 'loading' || !value} onClick={confirm}>
            {t('Ok')}
          </Button>
        </>
      }
    >
      {current.status === 'loading' ? (
        <div className="flex h-12 items-center justify-center">
          <GearworkLoader className="h-8 w-10" />
        </div>
      ) : (
        <div className="grid grid-cols-[6rem_1fr] items-center gap-4">
          <Label htmlFor="language-ctr">{t('Language')}</Label>
          <Select value={value} onValueChange={setPicked}>
            <SelectTrigger id="language-ctr" aria-label={t('Language')} title={t('Language')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </Dialog>
  )
}
