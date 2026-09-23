'use client'

import { Mail, Plus, Save, Trash2, UserRound } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import {
  Button,
  ConfirmDialog,
  Input,
  Pagination,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
} from '@/shared/ui'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS, CANCEL_BUTTON_CLASS } from '@/shared/ui/add-button'
import { FormDialog } from '../shared/FormDialog'
import { SaveToast, type Notice } from '../shared/SaveToast'
import { SettingsField } from '../shared/SettingsCard'
import { FRAME_EN, SettingsGate, SettingsLayout } from '../shared/SettingsFrame'
import { SettingsTable, type TableColumn } from '../shared/SettingsTable'
import { saveFailureMessage } from '../shared/use-object-form'
import { useScreenText } from '../shared/use-screen-text'
import { createContact, deleteContacts, fetchContacts, updateContact } from './contacts-api'
import {
  CONTACT_DEFAULT_PAGE_SIZE,
  CONTACT_PAGE_SIZES,
  EMPTY_CONTACT,
  MAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  toContactBody,
  toDraft,
  validateContact,
  type ContactDraft,
  type ContactError,
} from './contacts-form'
import type { ContactDto } from '@/types/contacts'
import { CountUp } from '@/shared/ui/CountUp'

const ACCESS = { item: PermissionItem.Settings, action: PermissionAction.Contacts }

// Keys from seats-admin-contact.html:293-312.
const TEXT = {
  Save: 'Save',
  Cancel: 'Cancel',
  Name: 'Name',
  Email: 'E-mail',
  Add: 'Add',
  Delete: 'Delete',
  Yes: 'Yes',
  No: 'No',
  Contact: 'Contact',
  Contacts: 'Contacts',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  NameIsRequired: 'The Name is required.',
  EmailIsRequired: 'The E-mail is required.',
  EmailValidationMessage: 'Incorrect Email Format',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  Loading: 'Loading',
  Refresh: 'Refresh',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  Selected: 'Selected',
  Clear: 'Clear',
  SelectAll: 'Select All',
} as const

const EN = {
  noItems: 'There are no items to show.',
  nameHint: 'Who receives the e-mails.',
  mailHint: 'One address, or several separated by ;',
  newContact: 'New contact',
  editContact: 'Edit contact',
  first: 'First',
  last: 'Last',
  select: 'Select',
} as const

type Query = { page: number; pageSize: number; attempt: number }

export function ContactsScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <ContactsWorkspace />
    </SettingsGate>
  )
}

function ContactsWorkspace() {
  const t = useScreenText(TEXT)
  const [query, setQuery] = useState<Query>({ page: 0, pageSize: CONTACT_DEFAULT_PAGE_SIZE, attempt: 0 })
  const load = useCallback(
    (signal: AbortSignal) => fetchContacts(query.page, query.pageSize, signal),
    [query.page, query.pageSize],
  )
  const read = useApiRead(`settings-contacts:${query.page}:${query.pageSize}:${query.attempt}`, load)
  const page = read.data ?? null
  const rows = useMemo(() => page?.items ?? [], [page])

  const [selection, setSelection] = useState<{ source: typeof page; ids: ReadonlySet<number> }>({
    source: null,
    ids: new Set(),
  })
  // Selection is cleared on every data load (seats-grid.html:491-493).
  const selected = selection.source === page ? selection.ids : new Set<number>()
  const setSelected = (ids: ReadonlySet<number>) => setSelection({ source: page, ids })

  const [draft, setDraft] = useState<ContactDraft | null>(null)
  // After the first Save attempt the error is recomputed from the current values on every change.
  const [submitted, setSubmitted] = useState(false)
  const error: ContactError | null = submitted && draft ? validateContact(draft) : null
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const reloadFirstPage = () => setQuery(current => ({ ...current, page: 0, attempt: current.attempt + 1 }))

  const openContact = (contact: ContactDto | null) => {
    setSubmitted(false)
    setDialogError(null)
    setDraft(contact ? toDraft(contact) : EMPTY_CONTACT)
  }

  const save = async () => {
    if (!draft || saving) return
    const failure = validateContact(draft)
    setSubmitted(true)
    if (failure) {
      document.getElementById(`contact-${failure.field}`)?.focus()
      return
    }
    setSaving(true)
    try {
      const body = toContactBody(draft)
      await (draft.id === 0 ? createContact(body) : updateContact(body))
      setDraft(null)
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertSaveSucceededDefault') })
      reloadFirstPage()
    } catch (caught) {
      setDialogError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await deleteContacts([...selected])
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertDeleteSuccessDefault') })
      reloadFirstPage()
    } catch (caught) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: saveFailureMessage(toApiError(caught), t('AlertDeleteErrorDefault')),
      })
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const columns: TableColumn<ContactDto>[] = [
    { key: 'name', label: t('Name'), render: row => row.name },
    { key: 'mail', label: t('Email'), className: 'text-slate-600', render: row => row.mail },
  ]

  const total = page?.totalRowCount ?? 0
  const countLabel = `${t('Contacts')} ${total}`
  const selectedLabel = `${selected.size} ${t('Selected')}`

  return (
    <SettingsLayout
      sectionId="contacts"
      title={t('Contacts')}
      meta={
        read.status === 'success' && rows.length > 0 ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
            <CountUp text={countLabel} />
          </span>
        ) : null
      }
      actions={
        <button type="button" onClick={() => openContact(null)} className={ADD_BUTTON_CLASS}>
          <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
          {t('Add')}
        </button>
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Tab order is visual: selection count, Delete, Clear, then the table. */}
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <SelectionActions
            count={selected.size}
            selectedLabel={selectedLabel}
            clearLabel={t('Clear')}
            onClear={() => setSelected(new Set())}
            showClear={false}
          />
          <div className="mr-4 ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => setConfirming(true)}
              className={selectionButtonClass(selected.size > 0)}
            >
              <Trash2 aria-hidden />
              {t('Delete')}
            </button>
            <SelectionClear
              active={selected.size > 0}
              label={t('Clear')}
              onClear={() => setSelected(new Set())}
            />
          </div>
        </div>
        <SettingsTable
          rows={rows}
          columns={columns}
          status={read.status}
          selectable
          selected={selected}
          onToggle={id => {
            const next = new Set(selected)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            setSelected(next)
          }}
          onTogglePage={() =>
            setSelected(
              rows.every(row => selected.has(row.id)) ? new Set() : new Set(rows.map(row => row.id)),
            )
          }
          onOpen={row => openContact(row)}
          onRetry={read.reload}
          emptyText={EN.noItems}
          text={{
            loading: t('Loading'),
            error: t('AlertGeneralErrorDefault'),
            retry: t('Refresh'),
            selectAll: t('SelectAll'),
            select: row => `${EN.select} ${row.name ?? ''}`,
          }}
        />
        {/* seats-admin-contact.html:409 hides the pager only when the list is empty, not below a page size. */}
        {read.status === 'success' && total > 0 ? (
          <Pagination
            id="contacts-page-size"
            pageIndex={query.page}
            pageSize={query.pageSize}
            total={total}
            pageSizes={CONTACT_PAGE_SIZES}
            onPageChange={next => setQuery(current => ({ ...current, page: next }))}
            onPageSizeChange={size => setQuery(current => ({ ...current, page: 0, pageSize: size }))}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: EN.first,
              previous: t('Previous'),
              next: t('Next'),
              last: EN.last,
            }}
          />
        ) : null}
      </div>

      <FormDialog
        open={draft !== null}
        onOpenChange={open => {
          if (!open) setDraft(null)
        }}
        icon={draft?.id ? UserRound : Plus}
        title={t('Contact')}
        hint={draft?.id ? EN.editContact : EN.newContact}
        closeLabel={t('Cancel')}
        busy={saving}
        error={dialogError}
        onSubmit={() => void save()}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={saving}
              className={CANCEL_BUTTON_CLASS}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" loading={saving} className={ADD_BUTTON_CLASS}>
              <Save aria-hidden className="size-[18px]" />
              {t('Save')}
            </Button>
          </>
        }
      >
        {draft ? (
          <>
            <SettingsField
              htmlFor="contact-name"
              label={t('Name')}
              hint={EN.nameHint}
              error={error?.field === 'name' ? t(error.messageKey) : null}
            >
              <Input
                id="contact-name"
                value={draft.name}
                maxLength={NAME_MAX_LENGTH}
                autoFocus
                disabled={saving}
                aria-invalid={error?.field === 'name' || undefined}
                aria-describedby={error?.field === 'name' ? 'contact-name-error' : undefined}
                onChange={event => {
                  const name = event.target.value
                  setDraft(current => (current ? { ...current, name } : current))
                }}
                className="h-9 w-full bg-white"
              />
            </SettingsField>
            <SettingsField
              htmlFor="contact-mail"
              label={t('Email')}
              hint={EN.mailHint}
              error={error?.field === 'mail' ? t(error.messageKey) : null}
            >
              <div className="relative">
                <Mail
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
                />
                <Input
                  id="contact-mail"
                  value={draft.mail}
                  maxLength={MAIL_MAX_LENGTH}
                  disabled={saving}
                  spellCheck={false}
                  aria-invalid={error?.field === 'mail' || undefined}
                  aria-describedby={error?.field === 'mail' ? 'contact-mail-error' : undefined}
                  onChange={event => {
                    const mail = event.target.value
                    setDraft(current => (current ? { ...current, mail } : current))
                  }}
                  className="h-9 w-full bg-white pl-9"
                />
              </div>
            </SettingsField>
          </>
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('Delete')}
        message={t('DeleteConfirmationMsg')}
        confirmLabel={t('Yes')}
        cancelLabel={t('No')}
        onConfirm={() => void confirmDelete()}
        pending={deleting}
      />
    </SettingsLayout>
  )
}
