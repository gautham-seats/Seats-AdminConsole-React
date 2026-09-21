'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, LockKeyhole, Send, ShieldCheck, User, UserCog, Users, X } from 'lucide-react'
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { ApiError } from '@/shared/api'
import { PermissionAction, PermissionItem, USERS_ROUTE } from '@/shared/shell/admin-menu'
import { AreaWorkspace, type WorkspaceSection } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { Button, buttonVariants, Checkbox, Input, Label, Switch } from '@/shared/ui'
import { SettingsCard } from '@/features/settings/shared/SettingsCard'
import { SaveActions, useSaveShortcut } from '@/features/settings/shared/SettingsFrame'
import { cn } from '@/shared/ui/cn'
import type { SecurityLevel, UserDetailsViewModel } from '@/types/users'
import { GENERAL_ERROR_DURATION, isGeneralError } from '../index/general-error'
import { StatusNotice, type Notice } from '../index/StatusNotice'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from '../index/users-text'
import { saveErrorText } from '../save-error'
import { setFlash } from '../users-flash'
import { PasswordChecklist, passwordRules } from './PasswordChecklist'
import { PersonasEditor } from './PersonasEditor'
import { applyLevel, applyOwnClasses, findLevelEntry, summarizeLevel } from './security-levels'
import { SecurityLevelDialog } from './SecurityLevelDialog'
import { SecurityOverview } from './SecurityOverview'
import { SetPasswordDialog } from './SetPasswordDialog'
import { StudentTypeahead } from './StudentTypeahead'
import { UserPreviewCard } from './UserPreviewCard'
import { useChangeCommit } from './use-change-commit'
import { saveUser, sendResetPasswordLink } from './user-details-api'
import {
  addPersona,
  movePersona,
  PASSWORD_POLICY_TEXT,
  personaRowErrors,
  profileOptions,
  removePersona,
  toForm,
  toSavePayload,
  validateForm,
  validatePersonas,
  type FieldError,
  type FormErrors,
  type FormField,
  type UserForm,
} from './user-form'
import { TabIndicator } from '@/shared/ui/TabIndicator'

const USERS_ADD = { item: PermissionItem.Users, action: PermissionAction.Add }
const USERS_EDIT = { item: PermissionItem.Users, action: PermissionAction.Edit }
const USERS_DELETE = { item: PermissionItem.Users, action: PermissionAction.Delete }
const LECTURER_VISIBILITY = { item: PermissionItem.Users, action: PermissionAction.LecturerVisibility }

type Tab = 'personas' | 'security'

const NO_FIELDS: ReadonlySet<FormField> = new Set()

export type UserDetailsFormProps = {
  view: UserDetailsViewModel
  t: (key: UsersTextKey) => string
  frame: {
    areaLabel: string
    sections: readonly WorkspaceSection[]
    title: string
    collapseLabel: string
    expandLabel: string
  }
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error: string | null
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[13px] font-medium text-slate-700">
        {label}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function UserDetailsForm({ view, t, frame }: UserDetailsFormProps) {
  const router = useRouter()
  const profile = useProfile()
  const { detail } = view
  const creating = detail.id === 0
  const canSave = profile.can(creating ? USERS_ADD : USERS_EDIT)
  const passwordVisible = creating && detail.seatsAuthenticationByOurIdentityProvider
  // Details.cshtml:26-37: existing users signed in through our identity provider.
  const passwordActions = !creating && detail.seatsAuthenticationByOurIdentityProvider

  const [form, setForm] = useState<UserForm>(() => toForm(view))
  const [initialForm] = useState(form)
  // ko.validation messagesOnModified: a field shows its message once changed (on blur), or every field after a failed Save.
  const [touched, setTouched] = useState<ReadonlySet<FormField>>(NO_FIELDS)
  // Messages follow the values as of the last change event, since the value binding only writes then.
  const [committed, setCommitted] = useState<UserForm>(form)
  const [showAll, setShowAll] = useState(false)
  const [checkSpecialCharacters, setCheckSpecialCharacters] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  // Row messages appear after a failed Save and then follow the current rows.
  const [personasChecked, setPersonasChecked] = useState(false)
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>(detail.seatsAuthorisationByPersonas ? 'personas' : 'security')
  const [levelOpen, setLevelOpen] = useState<SecurityLevel | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const commit = useChangeCommit()
  const showGeneralError = useCallback(
    () =>
      setNotice({
        id: Date.now(),
        tone: 'error',
        duration: GENERAL_ERROR_DURATION,
        message: t('AlertGeneralErrorDefault'),
      }),
    [t],
  )
  const onSearchError = useCallback(
    (error: ApiError) => (isGeneralError(error) ? showGeneralError() : undefined),
    [showGeneralError],
  )

  // messages appear on the change event, as knockout does, but clear as soon as the typed value is valid
  const allErrors = validateForm(committed, detail, checkSpecialCharacters)
  const liveErrors = validateForm(form, detail, checkSpecialCharacters)
  const visible = (field: FormField) => {
    if (!liveErrors[field]) return undefined
    if (showAll) return liveErrors[field]
    return touched.has(field) ? allErrors[field] : undefined
  }
  const errors: FormErrors = {
    userName: visible('userName'),
    fullName: visible('fullName'),
    emailAddress: visible('emailAddress'),
    setPassword: visible('setPassword'),
    passwordConfirmation: visible('passwordConfirmation'),
    student: visible('student'),
  }

  const touch = (field: FormField, snapshot: UserForm = form) => {
    setCommitted(snapshot)
    setTouched(current => (current.has(field) ? current : new Set([...current, field])))
  }

  const update = <K extends keyof UserForm>(key: K, value: UserForm[K]) => setForm({ ...form, [key]: value })

  const fieldProps = (key: FormField & keyof UserForm) => ({
    onChange: (event: ChangeEvent<HTMLInputElement>) => update(key, event.target.value),
    ...commit(() => touch(key)),
  })

  const message = (error: FieldError | undefined): string | null => {
    switch (error) {
      // userDetailsController.js:300-304, 500-504: an empty password or confirmation says Required.
      case 'required':
      case 'passwordRequired':
      case 'confirmRequired':
        return t('Required')
      case 'specialCharacters':
        return USERS_FALLBACK_ONLY.specialCharacters
      case 'passwordPolicy':
        return PASSWORD_POLICY_TEXT
      case 'passwordConfirmation':
        return t('TheConfirmationDoesNotMatchThePassword')
      case 'studentNotSelected':
        return USERS_FALLBACK_ONLY.studentNotSelected
      default:
        return null
    }
  }

  const describedBy = (id: string, error: FieldError | undefined) => (error ? `${id}-error` : undefined)
  // Requirements 8.2: a mismatch flags the password box too.
  const mismatch = errors.passwordConfirmation === 'passwordConfirmation'

  // userDetailsController.js:177-201: personas are checked before swapp.handleSaveEvent validates the fields.
  const submit = async () => {
    setCommitted(form)
    const personasError = validatePersonas(form, detail)
    if (personasError) {
      setPersonasChecked(true)
      setNotice({
        id: Date.now(),
        tone: 'error',
        duration: 10000,
        message:
          personasError === 'accessProfileRequired'
            ? t('TheUserYouAreTryingToCreateMustHaveAtLeastOneAccessProfileAssociatedWithIt')
            : t('YouCantSaveUserWithAccessProfilesDuplicates'),
      })
      return
    }
    setCheckSpecialCharacters(true)
    if (Object.keys(validateForm(form, detail, true)).length > 0) {
      setShowAll(true)
      setNotice({ id: Date.now(), tone: 'gray', duration: 4000, message: t('FieldsWithInputValidations') })
      return
    }
    setSaving(true)
    try {
      await saveUser(toSavePayload(form, detail))
      setFlash({ tone: 'success', message: t('AlertSaveSucceededDefault'), duration: 3500 })
      router.push(USERS_ROUTE)
    } catch (error) {
      // showGray(responseJSON.message, 5000), then swapp.js:204 replaces it with the general error for other statuses.
      if (isGeneralError(error)) showGeneralError()
      else
        setNotice({
          id: Date.now(),
          tone: 'gray',
          duration: 5000,
          message: saveErrorText(error, t('AlertSaveErrorDefault')),
        })
      setSaving(false)
    }
  }
  useSaveShortcut(canSave && dirty && !saving, submit)

  // userDetailsController.js:145-175: the server message for 10 s, otherwise the fixed text for 4 s.
  const sendLink = async () => {
    setSendingLink(true)
    try {
      await sendResetPasswordLink(form.userName)
      setNotice({
        id: Date.now(),
        tone: 'success',
        message: USERS_FALLBACK_ONLY.resetLinkSent,
        duration: 4000,
      })
    } catch (error) {
      const serverText = saveErrorText(error, '')
      // swapp.js:204 replaces the local message for statuses the global handler does not skip.
      if (isGeneralError(error)) showGeneralError()
      else
        setNotice(
          serverText
            ? { id: Date.now(), tone: 'error', message: serverText, duration: 10000 }
            : { id: Date.now(), tone: 'error', message: USERS_FALLBACK_ONLY.resetLinkFailed, duration: 4000 },
        )
    } finally {
      setSendingLink(false)
    }
  }

  const applySecurityLevel = (level: SecurityLevel, items: Parameters<typeof applyLevel>[2]) => {
    setForm({
      ...form,
      toProcess: applyLevel(form.toProcess ?? [], level, items),
      levelOverview: { ...form.levelOverview, [level]: summarizeLevel(items) },
    })
    setLevelOpen(null)
  }

  const optionsFor = useCallback(
    (accessProfileId: number | null) => profileOptions(view, accessProfileId),
    [view],
  )
  const personaLabels = useMemo(
    () => ({
      add: t('Add'),
      up: t('UpOrder'),
      down: t('DownOrder'),
      accessProfile: t('AccessProfile'),
      delete: t('Delete'),
      select: t('Select'),
      none: USERS_FALLBACK_ONLY.noneOption,
    }),
    [t],
  )

  const personaErrors = useMemo(() => {
    const messages = new Map<string, string>()
    if (!personasChecked || !detail.seatsAuthorisationByPersonas) return messages
    personaRowErrors(form.personas).forEach((error, key) =>
      messages.set(
        key,
        error === 'accessProfileRequired'
          ? t('TheUserYouAreTryingToCreateMustHaveAtLeastOneAccessProfileAssociatedWithIt')
          : t('YouCantSaveUserWithAccessProfilesDuplicates'),
      ),
    )
    return messages
  }, [personasChecked, detail.seatsAuthorisationByPersonas, form.personas, t])

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    ...(detail.seatsAuthorisationByPersonas
      ? [{ id: 'personas' as const, label: t('Personas'), icon: Users }]
      : []),
    { id: 'security', label: t('SecurityLevelPermissions'), icon: ShieldCheck },
  ]

  // APG tabs: arrow keys, Home and End move focus and select (automatic activation).
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1
    if (next < 0) return
    event.preventDefault()
    setTab(tabs[next].id)
    tabRefs.current[tabs[next].id]?.focus()
  }

  const discard = () => {
    setForm(initialForm)
    setCommitted(initialForm)
    setTouched(NO_FIELDS)
    setShowAll(false)
    setPersonasChecked(false)
    setNotice(null)
  }

  const rules = passwordRules(form.setPassword, form.passwordConfirmation, form.userName)

  // Details.cshtml:26-37: Set Password needs only our identity provider; the reset link also needs Users + Edit.
  const secondaryActions = (
    <>
      {passwordActions ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setPasswordOpen(true)}>
          <LockKeyhole aria-hidden className="size-4" />
          {t('SetPassword')}
        </Button>
      ) : null}
      {passwordActions && profile.can(USERS_EDIT) ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void sendLink()}
          disabled={sendingLink}
          aria-busy={sendingLink}
        >
          <Send aria-hidden className={cn('size-4', sendingLink && 'animate-soft-pulse')} />
          {USERS_FALLBACK_ONLY.sendResetLink}
        </Button>
      ) : null}
      <Link
        href={USERS_ROUTE}
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}
      >
        <X aria-hidden className="size-4" />
        {t('Cancel')}
      </Link>
    </>
  )

  // Same header actions as Settings and Job Schedule (SaveActions): Save lights up when dirty, Discard beside it.
  const actions = canSave ? (
    <SaveActions
      dirty={dirty}
      saving={saving}
      saveLabel={t('Save')}
      onSave={() => (saving ? undefined : void submit())}
      onDiscard={discard}
      extra={secondaryActions}
    />
  ) : (
    <div className="flex flex-wrap items-center gap-2">{secondaryActions}</div>
  )

  return (
    <AreaWorkspace
      areaLabel={frame.areaLabel}
      sections={frame.sections}
      activeId="user"
      title={frame.title}
      collapseLabel={frame.collapseLabel}
      expandLabel={frame.expandLabel}
      navigation="admin"
      actions={actions}
    >
      {/* Details.cshtml has no form; Save is an <a> click binding, so Enter never saves. */}
      <div className="flex flex-col gap-4">
        <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.62fr)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <SettingsCard
              icon={User}
              title={USERS_FALLBACK_ONLY.userDetails}
              hint={USERS_FALLBACK_ONLY.accountHint}
              action={
                <label
                  htmlFor="user-account-active"
                  className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-medium text-white"
                >
                  {t('AccountActive')}
                  <Switch
                    id="user-account-active"
                    checked={form.accountActive}
                    onCheckedChange={value => update('accountActive', value)}
                    label={t('AccountActive')}
                  />
                </label>
              }
            >
              {/* Details.cshtml:49-129 field order. */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
                <Field id="user-name" label={t('UserName')} error={message(errors.userName)}>
                  <div className="relative">
                    <User
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="user-name"
                      value={form.userName}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.userName)}
                      aria-describedby={describedBy('user-name', errors.userName)}
                      {...fieldProps('userName')}
                      className="h-9 bg-white pl-9"
                    />
                  </div>
                </Field>
                <Field id="user-full-name" label={t('FullName')} error={message(errors.fullName)}>
                  <div className="relative">
                    <UserCog
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="user-full-name"
                      value={form.fullName}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={describedBy('user-full-name', errors.fullName)}
                      {...fieldProps('fullName')}
                      className="h-9 bg-white pl-9"
                    />
                  </div>
                </Field>
                <Field id="user-email" label={t('EmailAddress')} error={message(errors.emailAddress)}>
                  <Input
                    id="user-email"
                    type="text"
                    inputMode="email"
                    value={form.emailAddress}
                    aria-invalid={Boolean(errors.emailAddress)}
                    aria-describedby={describedBy('user-email', errors.emailAddress)}
                    {...fieldProps('emailAddress')}
                    className="h-9 bg-white"
                  />
                </Field>
                <Field id="user-student" label={t('AssociatedStudent')} error={message(errors.student)}>
                  <StudentTypeahead
                    id="user-student"
                    label={t('AssociatedStudent')}
                    placeholder={t('SearchStudent')}
                    description={form.studentDescription}
                    invalid={Boolean(errors.student)}
                    describedBy={describedBy('user-student', errors.student)}
                    onTextChange={text => setForm({ ...form, studentDescription: text, studentId: null })}
                    onCommit={() => touch('student')}
                    onError={onSearchError}
                    onSelect={(id, description) => {
                      const next = { ...form, studentId: id, studentDescription: description }
                      setForm(next)
                      touch('student', next)
                    }}
                  />
                </Field>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Checkbox
                    id="user-mobile-logging"
                    checked={form.isMobileAppLoggingActive}
                    onCheckedChange={() => update('isMobileAppLoggingActive', !form.isMobileAppLoggingActive)}
                    label={t('IsMobileAppLoggingActive')}
                  />
                  <label htmlFor="user-mobile-logging" className="cursor-pointer text-sm text-slate-700">
                    {t('IsMobileAppLoggingActive')}
                  </label>
                </div>
              </div>
            </SettingsCard>

            {passwordVisible ? (
              <SettingsCard
                icon={KeyRound}
                title={t('Password')}
                hint={USERS_FALLBACK_ONLY.passwordHint}
                delay={40}
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
                  <Field id="user-password" label={t('Password')} error={message(errors.setPassword)}>
                    <div className="relative">
                      <KeyRound
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        id="user-password"
                        type="password"
                        autoComplete="new-password"
                        value={form.setPassword}
                        aria-invalid={Boolean(errors.setPassword) || mismatch}
                        aria-describedby={
                          describedBy('user-password', errors.setPassword) ??
                          (mismatch ? 'user-password-confirmation-error' : undefined)
                        }
                        {...fieldProps('setPassword')}
                        className="h-9 bg-white pl-9"
                      />
                    </div>
                  </Field>
                  {/* Details.cshtml:81: the value binding writes setPassword only on change. */}
                  {committed.setPassword ? (
                    <Field
                      id="user-password-confirmation"
                      label={t('ConfirmPassword')}
                      error={message(errors.passwordConfirmation)}
                    >
                      <div className="relative animate-rise-in motion-reduce:animate-none">
                        <KeyRound
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                          id="user-password-confirmation"
                          type="password"
                          autoComplete="new-password"
                          value={form.passwordConfirmation}
                          aria-invalid={Boolean(errors.passwordConfirmation)}
                          aria-describedby={describedBy(
                            'user-password-confirmation',
                            errors.passwordConfirmation,
                          )}
                          {...fieldProps('passwordConfirmation')}
                          className="h-9 bg-white pl-9"
                        />
                      </div>
                    </Field>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                  <div className="md:col-span-2">
                    <PasswordChecklist rules={rules} />
                  </div>
                </div>
              </SettingsCard>
            ) : null}

            <SettingsCard
              icon={ShieldCheck}
              title={USERS_FALLBACK_ONLY.accessCard}
              hint={USERS_FALLBACK_ONLY.accessHint}
              delay={passwordVisible ? 80 : 40}
            >
              <div
                role="tablist"
                aria-label={t('User')}
                className="relative flex gap-1 border-b border-border px-3"
              >
                <TabIndicator activeKey={tab} />
                {tabs.map((item, index) => {
                  const Icon = item.icon
                  const active = tab === item.id
                  return (
                    <button
                      key={item.id}
                      ref={element => {
                        tabRefs.current[item.id] = element
                      }}
                      type="button"
                      role="tab"
                      id={`user-tab-${item.id}`}
                      aria-selected={active}
                      aria-controls="user-panel"
                      tabIndex={active ? 0 : -1}
                      onClick={() => setTab(item.id)}
                      onKeyDown={event => onTabKeyDown(event, index)}
                      className={cn(
                        'relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        active ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon aria-hidden className="size-4" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
              <div
                role="tabpanel"
                id="user-panel"
                aria-labelledby={`user-tab-${tab}`}
                className="animate-fade-in px-5 py-4 motion-reduce:animate-none"
              >
                {tab === 'personas' ? (
                  <PersonasEditor
                    rows={form.personas}
                    selectedKey={selectedPersona}
                    optionsFor={optionsFor}
                    labels={personaLabels}
                    rowErrors={personaErrors}
                    onSelect={setSelectedPersona}
                    onAdd={() => update('personas', addPersona(form.personas, view.defaultPersonToAdd))}
                    onMove={direction =>
                      selectedPersona
                        ? update('personas', movePersona(form.personas, selectedPersona, direction))
                        : undefined
                    }
                    onRemove={key => update('personas', removePersona(form.personas, key))}
                    onChange={(key, accessProfileId) =>
                      update(
                        'personas',
                        form.personas.map(row => (row.key === key ? { ...row, accessProfileId } : row)),
                      )
                    }
                  />
                ) : (
                  <SecurityOverview
                    isSuperUser={form.isSuperUser}
                    isOwnClasses={form.isOwnClasses}
                    levelOverview={form.levelOverview}
                    showLecturerVisibility={profile.can(LECTURER_VISIBILITY)}
                    t={t}
                    onSuperUserChange={value => update('isSuperUser', value)}
                    onOwnClassesChange={value =>
                      form.isSuperUser
                        ? undefined
                        : setForm({
                            ...form,
                            isOwnClasses: value,
                            toProcess: applyOwnClasses(form.toProcess ?? [], value, detail.id),
                          })
                    }
                    onOpenLevel={setLevelOpen}
                  />
                )}
              </div>
            </SettingsCard>
          </div>

          <aside className="min-w-0 xl:sticky xl:top-4">
            <UserPreviewCard form={form} view={view} creating={creating} t={t} />
          </aside>
        </div>
      </div>

      {levelOpen ? (
        <SecurityLevelDialog
          key={levelOpen}
          level={levelOpen}
          userId={detail.id}
          existing={findLevelEntry(form.toProcess ?? [], levelOpen)?.userSecurityLevelPermissions ?? null}
          canAdd={profile.can(USERS_EDIT)}
          canDelete={profile.can(USERS_DELETE)}
          t={t}
          onApply={items => applySecurityLevel(levelOpen, items)}
          onSearchError={onSearchError}
          onClose={() => setLevelOpen(null)}
        />
      ) : null}
      {passwordOpen ? (
        <SetPasswordDialog
          userId={detail.id}
          userName={form.userName}
          t={t}
          onClose={() => setPasswordOpen(false)}
          onFailed={failure =>
            setNotice({ id: Date.now(), tone: 'error', message: failure, duration: 10000 })
          }
          onSaved={() => {
            setPasswordOpen(false)
            setNotice({
              id: Date.now(),
              tone: 'success',
              message: t('PasswordWasSavedSuccesfuly'),
              duration: 4000,
            })
          }}
        />
      ) : null}
    </AreaWorkspace>
  )
}
