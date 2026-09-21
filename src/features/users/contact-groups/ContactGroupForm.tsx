'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Info, Link2, Mail, Pencil, Plus, Save, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useResources } from '@/shared/resources'
import { CONTACT_GROUPS_ROUTE, PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { LEAVE_EN } from '@/shared/shell/LeaveDialog'
import { useLeaveGuard } from '@/shared/shell/use-leave-guard'
import {
  Button,
  buttonVariants,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type CheckboxState,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { ContactGroupViewModel, FunctionDto } from '@/types/contact-groups'
import type { SimpleListItemDto } from '@/types/users'
import { GENERAL_ERROR_DURATION, isGeneralError } from '../index/general-error'
import { StatusNotice, type Notice } from '../index/StatusNotice'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from '../index/users-text'
import { LookupTypeahead } from '../details/LookupTypeahead'
import { useChangeCommit } from '../details/use-change-commit'
import { fetchUserDetails } from '../details/user-details-api'
import { saveErrorText } from '../save-error'
import { setFlash } from '../users-flash'
import {
  addMember,
  entityRequired,
  isEntityType,
  isKnockoutEmail,
  removeMembers,
  sendOptionDisabled,
  toContactGroupForm,
  toContactGroupPayload,
  upsertFunction,
  validateContactGroup,
  withEntity,
  withFunction,
  withGroupEmail,
  type ContactGroupErrors,
  type ContactGroupField,
  type ContactGroupForm as FormState,
  type EntityType,
} from './contact-group-form'
import { saveContactGroup, searchContactGroupUsers, searchEntities } from './contact-group-details-api'
import { FunctionDialog } from './FunctionDialog'

const ADD = { item: PermissionItem.ContactGroup, action: PermissionAction.Add }
const EDIT = { item: PermissionItem.ContactGroup, action: PermissionAction.Edit }
const FUNCTIONS = { item: PermissionItem.ContactGroup, action: PermissionAction.ContactGroupFunctions }

const NONE = 'none'
// Layout text read through swapp.js:574; not in the Users text set.
const EN = { FieldsWithInputValidations: 'There are fields with input validation errors.' } as const
const EXTRA_KEYS = Object.keys(EN)
// swapp.js:574 validation alert and contactGroupDetailsController.js:232 save error timings.
const VALIDATION_MS = 4000
const SAVE_ERROR_MS = 5000
// contactGroupDetailsController.js:228 and :377 save success timing.
const SAVE_SUCCESS_MS = 3500
const DELETE_SUCCESS_MS = 3000
// bootstrap3-typeahead.js:360 shows 8 results when the binding sets no items.
const TYPEAHEAD_ITEMS = 8
const NO_IDS: ReadonlySet<number> = new Set()
const NO_FIELDS: ReadonlySet<ContactGroupField> = new Set()

const ENTITY_LABEL: Record<EntityType, UsersTextKey> = {
  1: 'Course',
  2: 'Faculty',
  3: 'Module',
  4: 'Programme',
  5: 'School',
}

function Field({
  id,
  label,
  error,
  hint,
  required = false,
  children,
}: {
  id: string
  label: ReactNode
  error?: string | null
  hint?: string | null
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={cn(
          'flex items-center gap-1.5 text-[13px] font-medium text-slate-700',
          required && "after:text-destructive after:content-['*']",
        )}
      >
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
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-amber-700">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export type ContactGroupFormProps = { view: ContactGroupViewModel; t: (key: UsersTextKey) => string }

export function ContactGroupForm({ view, t }: ContactGroupFormProps) {
  const router = useRouter()
  const profile = useProfile()
  const { detail } = view
  const creating = detail.id === 0
  const canSave = profile.can(creating ? ADD : EDIT)
  const canEditMembers = profile.can(EDIT)
  const canUseFunctions = profile.can(FUNCTIONS)

  const [form, setForm] = useState<FormState>(() => toContactGroupForm(view))
  const [baseline] = useState<FormState>(() => toContactGroupForm(view))
  const [functions, setFunctions] = useState<FunctionDto[]>(view.functionAvailables)
  // ko.validation messagesOnModified: a field shows its message once changed, or every field after Save.
  const [touched, setTouched] = useState<ReadonlySet<ContactGroupField>>(NO_FIELDS)
  // Messages follow the values as of the last change event, since the value binding only writes then.
  const [committed, setCommitted] = useState<FormState>(form)
  const formRef = useRef(form)
  const addUserController = useRef<AbortController | null>(null)
  useEffect(() => {
    formRef.current = form
  }, [form])
  useEffect(
    () => () => {
      addUserController.current?.abort()
    },
    [],
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [userText, setUserText] = useState('')
  const [pickedUser, setPickedUser] = useState<SimpleListItemDto | null>(null)
  const [addingUser, setAddingUser] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<number>>(NO_IDS)
  // Details.cshtml:191 and contactGroupDetailsController.js:69-83: its own flag, not derived from row ticks.
  const [selectAll, setSelectAll] = useState(false)
  const [functionOpen, setFunctionOpen] = useState(false)
  const membersScroller = useRef<HTMLDivElement>(null)
  const membersWindow = useRowWindow(form.members.length, membersScroller)
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  useLeaveGuard(canSave && dirty && !saving, LEAVE_EN.message)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const changeCommit = useChangeCommit()
  // swapp.js:168-206 global ajaxError handler for requests without their own error callback.
  const onGeneralError = useCallback(
    (error: unknown) => {
      if (!isGeneralError(error)) return
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: t('AlertGeneralErrorDefault'),
        duration: GENERAL_ERROR_DURATION,
      })
    },
    [t],
  )
  const extra = useResources(EXTRA_KEYS)
  const validationText = () => {
    const value = extra.text('FieldsWithInputValidations')
    return !value.trim() || value === 'FieldsWithInputValidations' ? EN.FieldsWithInputValidations : value
  }

  const touch = (field: ContactGroupField, snapshot: FormState) => {
    setCommitted(snapshot)
    setTouched(current => (current.has(field) ? current : new Set([...current, field])))
  }

  const commit = (next: FormState) => {
    setForm(next)
    setCommitted(next)
  }

  // Special character rules are only added by swapp.handleSaveEvent (swapp.js:493-529).
  // messages appear on the change event, as knockout does, but clear as soon as the typed value is valid
  const allErrors = validateContactGroup(committed, submitted)
  const liveErrors = validateContactGroup(form, submitted)
  const visible = (field: ContactGroupField) => {
    if (!liveErrors[field]) return undefined
    if (submitted) return liveErrors[field]
    return touched.has(field) ? allErrors[field] : undefined
  }
  const errors: ContactGroupErrors = {
    name: visible('name'),
    description: visible('description'),
    groupEmailAddress: visible('groupEmailAddress'),
    sendEmailsToTypeId: visible('sendEmailsToTypeId'),
    entity: visible('entity'),
  }

  const message = (error: ContactGroupErrors[keyof ContactGroupErrors]) =>
    error === 'required'
      ? t('Required')
      : error === 'specialCharacters'
        ? USERS_FALLBACK_ONLY.specialCharacters
        : null

  const entitySearch = useCallback(
    (query: string, signal: AbortSignal) =>
      isEntityType(form.entityId) ? searchEntities(form.entityId, query, signal) : Promise.resolve([]),
    [form.entityId],
  )

  const submit = async () => {
    setSubmitted(true)
    setCommitted(form)
    const nextErrors = validateContactGroup(form)
    if (Object.keys(nextErrors).length > 0) {
      setNotice({ id: Date.now(), tone: 'gray', message: validationText(), duration: VALIDATION_MS })
      return
    }
    // contactGroupDetailsController.js:223 tests an observable, so the members-or-email check never blocks; the server answers 400.
    setSaving(true)
    try {
      await saveContactGroup(toContactGroupPayload(form, detail))
      setFlash({ tone: 'success', message: t('AlertSaveSucceededDefault'), duration: SAVE_SUCCESS_MS })
      router.push(CONTACT_GROUPS_ROUTE)
    } catch (error) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        // The global handler swaps in the general text but keeps the 5 s timer (swalert.js:77-87).
        message: isGeneralError(error)
          ? t('AlertGeneralErrorDefault')
          : saveErrorText(error, t('AlertSaveErrorDefault')),
        duration: SAVE_ERROR_MS,
      })
      setSaving(false)
    }
  }

  // contactGroupDetailsController.js:123-156 fetches the full user before adding it once.
  const addPickedUser = async () => {
    if (!pickedUser) return
    setSelected(NO_IDS)
    setSelectAll(false)
    setAddingUser(true)
    addUserController.current?.abort()
    const controller = new AbortController()
    addUserController.current = controller
    try {
      const { detail: user } = await fetchUserDetails(pickedUser.id, controller.signal)
      // A superseded add must never write state or clear the busy flag the newer one owns.
      if (addUserController.current !== controller) return
      const member = {
        id: user.id,
        userName: user.userName,
        fullName: user.fullName,
        displayName: user.displayName,
        emailAddress: user.emailAddress,
      }
      // Legacy pushes into the live list, so edits typed while the user loads are kept.
      const duplicate = formRef.current.members.some(existing => existing.id === user.id)
      setForm(current => addMember(current, member))
      setCommitted(current => addMember(current, member))
      // contactGroupDetailsController.js:142-146 clears the search only when the user was added.
      if (!duplicate) {
        setUserText('')
        setPickedUser(null)
      }
    } catch (error) {
      if (addUserController.current !== controller) return
      // $.getJSON has no error callback, so only the global handler reports it.
      onGeneralError(error)
    } finally {
      if (addUserController.current === controller) setAddingUser(false)
    }
  }

  const emailInvalid = !isKnockoutEmail(form.groupEmailAddress)
  const entityError = entityRequired(form) ? 'required' : errors.entity
  const allState: CheckboxState = selectAll
  const currentFunction = form.functionId === null ? null : { id: form.functionId, name: form.functionName }
  const membersCount = `${form.members.length}`
  const functionButtonLabel = `${form.functionId === null ? t('Add') : t('Edit')} ${t('Function')}`

  return (
    <>
      {/* Details.cshtml:29-165 has no form, so Enter never saves. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <StatusNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Clear')} />

        <div className="min-h-0 flex-1 scroll-pb-24 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4 pb-2">
            <section
              aria-labelledby="contact-group-title"
              className="rounded-lg border border-border bg-white shadow-sm"
            >
              <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                <h2
                  id="contact-group-title"
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <Users aria-hidden className="size-4 text-brand" />
                  {USERS_FALLBACK_ONLY.contactGroupDetails}
                </h2>
              </header>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2">
                <Field id="contact-group-name" label={t('Name')} error={message(errors.name)} required>
                  <Input
                    id="contact-group-name"
                    value={form.name}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'contact-group-name-error' : undefined}
                    onChange={event => setForm({ ...form, name: event.target.value })}
                    {...changeCommit(() => touch('name', form))}
                    className="h-9 bg-white"
                  />
                </Field>
                <Field
                  id="contact-group-description"
                  label={t('Description')}
                  error={message(errors.description)}
                >
                  <Input
                    id="contact-group-description"
                    value={form.description}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? 'contact-group-description-error' : undefined}
                    onChange={event => setForm({ ...form, description: event.target.value })}
                    {...changeCommit(() => touch('description', form))}
                    className="h-9 bg-white"
                  />
                </Field>
                {/* Details.cshtml:47-58 places Add Users between Description and Group Email Address. */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contact-group-user" className="text-[13px] font-medium text-slate-700">
                    {t('AddUsers')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <LookupTypeahead
                        id="contact-group-user"
                        label={t('AddUsers')}
                        placeholder={t('SearchUsers')}
                        text={userText}
                        icon={Search}
                        cacheKey="contact-group-users"
                        maxResults={TYPEAHEAD_ITEMS}
                        clientFilter={false}
                        search={searchContactGroupUsers}
                        onError={onGeneralError}
                        onTextChange={value => {
                          setUserText(value)
                          setPickedUser(null)
                        }}
                        onSelect={item => {
                          setUserText(item.description ?? '')
                          setPickedUser(item)
                        }}
                      />
                    </div>
                    {canEditMembers ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={!pickedUser || addingUser}
                        aria-busy={addingUser}
                        onClick={() => void addPickedUser()}
                      >
                        <Plus aria-hidden className="size-4" />
                        {t('Add')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <Field
                  id="contact-group-email"
                  label={t('GroupEmailAddress')}
                  error={message(errors.groupEmailAddress)}
                  hint={emailInvalid ? t('PleaseEnterAValidEmail') : null}
                >
                  <div className="relative">
                    <Mail
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="contact-group-email"
                      type="email"
                      maxLength={100}
                      value={form.groupEmailAddress}
                      aria-invalid={Boolean(errors.groupEmailAddress) || emailInvalid}
                      aria-describedby={
                        errors.groupEmailAddress
                          ? 'contact-group-email-error'
                          : emailInvalid
                            ? 'contact-group-email-hint'
                            : undefined
                      }
                      onChange={event => setForm(withGroupEmail(form, event.target.value))}
                      {...changeCommit(() => touch('groupEmailAddress', form))}
                      className="h-9 bg-white pl-9"
                    />
                  </div>
                </Field>
                <Field
                  id="contact-group-send-to"
                  label={t('SendEmailsTo')}
                  error={message(errors.sendEmailsToTypeId)}
                  required
                >
                  <Select
                    value={form.sendEmailsToTypeId === null ? NONE : String(form.sendEmailsToTypeId)}
                    onValueChange={value => {
                      const next = { ...form, sendEmailsToTypeId: value === NONE ? null : Number(value) }
                      setForm(next)
                      touch('sendEmailsToTypeId', next)
                    }}
                  >
                    <SelectTrigger
                      id="contact-group-send-to"
                      aria-invalid={Boolean(errors.sendEmailsToTypeId)}
                      aria-describedby={errors.sendEmailsToTypeId ? 'contact-group-send-to-error' : undefined}
                      className={cn('bg-white', errors.sendEmailsToTypeId && 'border-destructive')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{USERS_FALLBACK_ONLY.noneOption}</SelectItem>
                      {view.sendEmailToAvailables.map(option => (
                        <SelectItem
                          key={option.id}
                          value={String(option.id)}
                          disabled={sendOptionDisabled(option, form)}
                        >
                          {option.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {canUseFunctions ? (
                  <>
                    <Field
                      id="contact-group-function"
                      label={
                        <>
                          {t('Function')}
                          <Info aria-hidden className="size-3.5 text-brand" />
                          <span className="sr-only">{t('ContactGroupFunctionInfo')}</span>
                        </>
                      }
                    >
                      <div className="flex gap-2" title={t('ContactGroupFunctionInfo')}>
                        <Select
                          value={form.functionId === null ? NONE : String(form.functionId)}
                          onValueChange={value =>
                            commit(withFunction(form, functions, value === NONE ? null : Number(value)))
                          }
                        >
                          <SelectTrigger id="contact-group-function" className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{USERS_FALLBACK_ONLY.noneOption}</SelectItem>
                            {functions.map(item => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0"
                          aria-label={functionButtonLabel}
                          onClick={() => setFunctionOpen(true)}
                        >
                          {form.functionId === null ? (
                            <Plus aria-hidden className="size-4" />
                          ) : (
                            <Pencil aria-hidden className="size-4" />
                          )}
                          {form.functionId === null ? t('Add') : t('Edit')}
                        </Button>
                      </div>
                    </Field>
                    <Field id="contact-group-entity" label={t('AssociatedTo')} error={message(entityError)}>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={form.entityId === null ? NONE : String(form.entityId)}
                          disabled={form.functionId === null}
                          onValueChange={value => {
                            const next = value === NONE ? null : Number(value)
                            commit(withEntity(form, isEntityType(next) ? next : null))
                          }}
                        >
                          <SelectTrigger aria-label={t('EntityType')} className="bg-white sm:w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>{USERS_FALLBACK_ONLY.noneOption}</SelectItem>
                            {view.entityAvailables
                              .filter(option => option.id > 0)
                              .map(option => (
                                <SelectItem key={option.id} value={String(option.id)}>
                                  {option.description}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <div className="min-w-0 flex-1">
                          {isEntityType(form.entityId) ? (
                            <LookupTypeahead
                              key={form.entityId}
                              id="contact-group-entity"
                              label={t(ENTITY_LABEL[form.entityId])}
                              placeholder={t('Search')}
                              text={form.associatedToDescription}
                              icon={Link2}
                              cacheKey={`contact-group-entity:${form.entityId}`}
                              maxResults={TYPEAHEAD_ITEMS}
                              minLength={0}
                              search={entitySearch}
                              onError={onGeneralError}
                              invalid={Boolean(entityError)}
                              describedBy={entityError ? 'contact-group-entity-error' : undefined}
                              onTextChange={value =>
                                commit({ ...form, associatedToDescription: value, entityValueId: null })
                              }
                              onSelect={item =>
                                commit({
                                  ...form,
                                  associatedToDescription: item.description ?? '',
                                  entityValueId: item.id,
                                })
                              }
                            />
                          ) : (
                            <Input
                              id="contact-group-entity"
                              disabled
                              placeholder={t('Search')}
                              className="h-9"
                            />
                          )}
                        </div>
                      </div>
                    </Field>
                  </>
                ) : null}
              </div>
            </section>

            <section
              aria-labelledby="contact-group-members-title"
              className="rounded-lg border border-border bg-white shadow-sm"
            >
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <h2
                  id="contact-group-members-title"
                  className="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <UserPlus aria-hidden className="size-4 text-brand" />
                  {t('Users')}
                  <span className="rounded-full bg-brand/[0.08] px-2 py-0.5 text-xs font-semibold tabular-nums text-brand">
                    {membersCount}
                  </span>
                </h2>
                {canEditMembers && selected.size > 0 ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="animate-slide-in motion-reduce:animate-none"
                    onClick={() => {
                      commit(removeMembers(form, selected))
                      setSelected(NO_IDS)
                      setSelectAll(false)
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                    {t('Delete')}
                  </Button>
                ) : null}
              </header>
              <div className="flex flex-col gap-4 px-5 py-4">
                {/* Details.cshtml:186-216 always shows the checkboxes and headers, even with no members. */}
                {/* A capped scroll area so more than 100 members are windowed instead of all rendered. */}
                <div
                  ref={membersScroller}
                  onScroll={membersWindow.onScroll}
                  className="max-h-[32rem] overflow-auto rounded-md border border-border"
                >
                  <table className="w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className="h-10 w-11 border-b border-border pl-3 text-left">
                          <Checkbox
                            checked={allState}
                            onCheckedChange={() => {
                              setSelectAll(!selectAll)
                              setSelected(selectAll ? NO_IDS : new Set(form.members.map(member => member.id)))
                            }}
                            label={t('SelectAll')}
                          />
                        </th>
                        {[t('UserName'), t('RealName'), t('Email')].map(label => (
                          <th
                            key={label}
                            scope="col"
                            className="h-10 border-b border-border px-2 text-left font-medium text-muted-foreground"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {membersWindow.padTop > 0 ? (
                        <tr data-row-spacer aria-hidden style={{ height: membersWindow.padTop }} />
                      ) : null}
                      {form.members.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            {USERS_FALLBACK_ONLY.noItems}
                          </td>
                        </tr>
                      ) : (
                        form.members.slice(membersWindow.start, membersWindow.end).map((member, offset) => (
                          <tr
                            key={member.id}
                            style={{ animationDelay: `${Math.min(membersWindow.start + offset, 15) * 18}ms` }}
                            className={cn(
                              'animate-row-in transition-colors motion-reduce:animate-none',
                              selected.has(member.id) ? 'bg-primary/[0.07]' : 'hover:bg-brand/[0.04]',
                            )}
                          >
                            <td className="border-b border-border py-2 pl-3">
                              <Checkbox
                                checked={selected.has(member.id)}
                                onCheckedChange={() =>
                                  setSelected(current => {
                                    const next = new Set(current)
                                    if (next.has(member.id)) next.delete(member.id)
                                    else next.add(member.id)
                                    return next
                                  })
                                }
                                label={`${USERS_FALLBACK_ONLY.select} ${member.userName ?? ''}`}
                              />
                            </td>
                            <td className="border-b border-border px-2 py-2 font-medium text-foreground">
                              {member.userName}
                            </td>
                            <td className="border-b border-border px-2 py-2 text-foreground">
                              {member.displayName ?? member.fullName}
                            </td>
                            <td className="border-b border-border px-2 py-2 text-slate-600">
                              {member.emailAddress}
                            </td>
                          </tr>
                        ))
                      )}
                      {membersWindow.padBottom > 0 ? (
                        <tr data-row-spacer aria-hidden style={{ height: membersWindow.padBottom }} />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 rounded-lg border border-border bg-white/90 px-4 py-3 shadow-[0_-6px_16px_-12px_rgba(15,23,42,.35)] backdrop-blur">
          <Link href={CONTACT_GROUPS_ROUTE} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <X aria-hidden className="size-4" />
            {t('Cancel')}
          </Link>
          {canSave ? (
            <Button
              type="button"
              size="sm"
              loading={saving}
              className="min-w-24"
              onClick={() => {
                if (!saving) void submit()
              }}
            >
              <Save aria-hidden className={cn('size-4', saving && 'animate-soft-pulse')} />
              {t('Save')}
            </Button>
          ) : null}
        </footer>
      </div>

      {functionOpen ? (
        <FunctionDialog
          current={currentFunction}
          t={t}
          onClose={() => setFunctionOpen(false)}
          onSaved={saved => {
            setFunctions(current => upsertFunction(current, saved))
            commit(withFunction(form, [saved], saved.id))
            setFunctionOpen(false)
            setNotice({
              id: Date.now(),
              tone: 'success',
              message: t('AlertSaveSucceededDefault'),
              duration: SAVE_SUCCESS_MS,
            })
          }}
          onDeleted={id => {
            setFunctions(current => current.filter(item => item.id !== id))
            commit(withFunction(form, [], null))
            setFunctionOpen(false)
            setNotice({
              id: Date.now(),
              tone: 'success',
              message: t('AlertDeleteSuccessDefault'),
              duration: DELETE_SUCCESS_MS,
            })
          }}
        />
      ) : null}
    </>
  )
}
