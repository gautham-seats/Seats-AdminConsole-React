'use client'

import { ExternalLink, ListChecks, Minus, Plus, Save, Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { Button, ConfirmDialog, Input, Pagination } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS, CANCEL_BUTTON_CLASS } from '@/shared/ui/add-button'
import { NAV_BAND_ROW } from '@/shared/ui/nav-band'
import type { CustomFieldGroupDto, CustomFieldGroupPageDto } from '@/types/custom-fields'
import { FormDialog } from '../shared/FormDialog'
import { NativeSelect } from '../shared/NativeSelect'
import { SaveToast, type Notice } from '../shared/SaveToast'
import { SettingsField } from '../shared/SettingsCard'
import { FRAME_EN, SettingsGate, SettingsLayout } from '../shared/SettingsFrame'
import { SettingsTable, type TableColumn } from '../shared/SettingsTable'
import { saveFailureMessage } from '../shared/use-object-form'
import { useScreenText } from '../shared/use-screen-text'
import {
  blankRow,
  buildSchemaFields,
  changeDataType,
  codeFromTitle,
  DATA_TYPES,
  ENTITY_TYPES,
  GROUP_PAGE_SIZES,
  groupErrors,
  groupFieldErrors,
  newGroup,
  optionsEnabled,
  rowHasErrors,
  sanitizeName,
  SENSITIVITY_LEVELS,
  STUDENT_DATA_TABLE,
  titleCaseEntity,
  toGroupBody,
  toGroupDraft,
  visibilityCheck,
  visibilityEnabled,
  type FieldRow,
  type GroupDraft,
  type RowErrors,
  type VisibilityCheck,
} from './custom-fields-form'
import { CountUp } from '@/shared/ui/CountUp'

const ITEM = PermissionItem.CustomFields
const ACCESS = { item: ITEM, action: PermissionAction.Access }
const ADD = { item: ITEM, action: PermissionAction.Add }
const EDIT = { item: ITEM, action: PermissionAction.Edit }
const DELETE = { item: ITEM, action: PermissionAction.Delete }
// Views/CustomField/Index.cshtml:5-7: Student data tables need action 121.
const STUDENT_DATA_TABLES = { item: ITEM, action: 121 }

// Keys from seats-admin-customfield.html:595-633.
const TEXT = {
  Save: 'Save',
  Cancel: 'Cancel',
  Add: 'Add',
  Delete: 'Delete',
  CustomFields: 'Custom Fields',
  CustomFieldGroup: 'Custom Field Group',
  CustomFieldGroups: 'Custom Field Groups',
  EntityType2: 'Entity Type',
  Group: 'Group',
  Name: 'Name',
  Code: 'Code',
  DataType: 'Data Type',
  Options: 'Options',
  SensitivityLevel: 'Sensitivity Type',
  Visibility: 'Visibility',
  Fields: 'Fields',
  Student: 'Student',
  Engagement: 'Engagement',
  ManualInterventionStep: 'Manual Intervention Step',
  StudentDataTable: 'Student Data Table',
  FieldVisibility: 'Field visibility',
  CustomFieldVisibility1: 'You have',
  CustomFieldVisibility2: 'visible custom fields left.',
  CustomFieldVisibility3: 'To raise this limit, contact',
  CustomFieldVisibility4: 'SEAtS support',
  CustomFieldVisibility5: 'There is room to make these fields visible.',
  CustomFieldVisibility6: 'There is not enough room to make these fields visible.',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  ThisCustomFieldIsInUseDeletionMayResultInDataLoss:
    'This custom field is in use. Deleting it may result in data loss.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  Loading: 'Loading',
  Refresh: 'Refresh',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
} as const

const EN = {
  // Hard-coded in legacy.
  saved: 'Actions updated successfully',
  selectEntity: 'Select an Entity Type',
  invalid: 'All fields must have a valid value.',
  entityTitle: 'Entity Type',
  groupTitle: 'Group Name',
  newGroup: 'New custom field group',
  editGroup: 'Fields shown on student records and forms',
  addField: 'Add field',
  removeField: 'Remove field',
  noItems: 'There are no items to show.',
  first: 'First',
  last: 'Last',
  support: 'https://seatssoftware.freshdesk.com',
  titleRequired: 'Enter a name.',
  entityRequired: 'Select an entity type.',
  rowIdRequired: 'This field has an invalid Id.',
  rowNameRequired: 'Enter a field name.',
  rowDataTypeRequired: 'Select a data type.',
} as const

const rowMessage = (row: RowErrors | undefined) =>
  row
    ? [row.id && EN.rowIdRequired, row.name && EN.rowNameRequired, row.dataType && EN.rowDataTypeRequired]
        .filter(Boolean)
        .join(' ')
    : ''

type Query = { pageNumber: number; pageSize: number; sortCol: string; sortDir: 'asc' | 'desc' | '' }

const countFields = () => api.get<number | null>('CustomFieldGroupApi/CountCustomFields')
const loadCount = (signal: AbortSignal) =>
  api.get<number | null>('CustomFieldGroupApi/CountCustomFields', { signal })

const NO_SELECTION: ReadonlySet<number> = new Set()

export function CustomFieldsScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <CustomFieldsWorkspace />
    </SettingsGate>
  )
}

function CustomFieldsWorkspace() {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const [query, setQuery] = useState<Query>({ pageNumber: 0, pageSize: 100, sortCol: '', sortDir: '' })
  const [attempt, setAttempt] = useState(0)
  const load = useCallback(
    (signal: AbortSignal) =>
      api.get<CustomFieldGroupPageDto | null>('CustomFieldGroupApi/', {
        query: { value: '', cultureName: '', ...query },
        signal,
      }),
    [query],
  )
  const read = useApiRead(`settings-custom-fields:${JSON.stringify(query)}:${attempt}`, load)
  const limit = useApiRead(`settings-custom-field-limit:${attempt}`, loadCount)
  const showVisibility = limit.status === 'success' && limit.data !== null && limit.data !== undefined

  const [draft, setDraft] = useState<GroupDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const [check, setCheck] = useState<VisibilityCheck | null>(null)
  const [deleteState, setDeleteState] = useState<{ inUse: boolean } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // After the first Save attempt field errors are recomputed from the current values on every change.
  const [submitted, setSubmitted] = useState(false)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const isNew = draft?.id === 0
  const canWrite = isNew ? profile.can(ADD) : profile.can(EDIT)
  const locked = !canWrite || saving
  const tableAllowed = profile.can(STUDENT_DATA_TABLES)

  // Errors go inside the open dialog; content behind a modal is hidden from assistive technology.
  const fail = (message: string) =>
    draft ? setDialogError(message) : setNotice({ id: Date.now(), tone: 'error', message })
  const open = (next: GroupDraft) => {
    setDialogError(null)
    setSubmitted(false)
    setDraft(next)
  }
  const done = () => {
    setDraft(null)
    setCheck(null)
    setDeleteState(null)
    setNotice({ id: Date.now(), tone: 'success', message: EN.saved })
    setAttempt(value => value + 1)
  }

  const updateRow = (key: string, change: (row: FieldRow) => FieldRow) =>
    setDraft(current =>
      current
        ? { ...current, rows: current.rows.map(row => (row.key === key ? change(row) : row)) }
        : current,
    )

  const send = async () => {
    if (!draft) return
    const fields = buildSchemaFields(draft)
    setSaving(true)
    try {
      const body = toGroupBody(draft, fields)
      await (draft.id > 0
        ? api.put<unknown>('CustomFieldGroupApi/', { body })
        : api.post<unknown>('CustomFieldGroupApi/', { body }))
      done()
    } catch (caught) {
      setCheck(null)
      fail(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!draft || saving || !canWrite) return
    setDialogError(null)
    const fields = buildSchemaFields(draft)
    const errors = groupErrors(draft, fields)
    setSubmitted(true)
    if (errors.length) return
    let remaining: number | null = null
    try {
      remaining = await countFields()
    } catch (caught) {
      fail(saveFailureMessage(toApiError(caught), t('AlertGeneralErrorDefault')))
      return
    }
    const result = visibilityCheck(remaining ?? null, draft, fields)
    if (result.needed) setCheck(result)
    else await send()
  }

  const askDelete = async () => {
    if (!draft) return
    try {
      const inUse = await api.get<boolean>('CustomFieldGroupApi/ExistsCustomFieldDataByEntityIdAsync', {
        query: { globalId: draft.id },
      })
      setDeleteState({ inUse: Boolean(inUse) })
    } catch (caught) {
      fail(saveFailureMessage(toApiError(caught), t('AlertGeneralErrorDefault')))
    }
  }

  const confirmDelete = async () => {
    if (!draft) return
    setSaving(true)
    try {
      await api.delete<unknown>('CustomFieldGroupApi/', {
        body: { id: draft.id, globalId: draft.globalId, entityType: draft.entityType, title: draft.title },
      })
      done()
    } catch (caught) {
      setDeleteState(null)
      fail(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setSaving(false)
    }
  }

  const page = read.data
  const rows = page?.Items ?? []
  const total = page?.TotalRowCount ?? 0
  const columns: TableColumn<CustomFieldGroupDto & { id: number }>[] = [
    {
      key: 'EntityType',
      label: EN.entityTitle,
      sortable: true,
      render: row => (
        <span className="rounded-full bg-brand/[0.07] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-brand">
          {titleCaseEntity(row.EntityType)}
        </span>
      ),
    },
    { key: 'Title', label: EN.groupTitle, sortable: true, render: row => row.Title },
  ]
  const tableRows = rows.map(row => ({ ...row, id: row.Id }))
  const entityLabel = (keys: readonly string[]) => keys.map(key => t(key as keyof typeof TEXT)).join('|')
  const isTable = draft?.entityType === STUDENT_DATA_TABLE
  const draftFields = submitted && draft ? buildSchemaFields(draft) : null
  const fieldErrors = draft && draftFields ? groupFieldErrors(draft, draftFields) : null
  const summary = draft && draftFields ? groupErrors(draft, draftFields) : []
  const validationBanner = summary.length ? [EN.invalid, ...summary].join('\n') : null
  const tableFieldError = isTable ? rowMessage(fieldErrors?.rows[0]) : ''
  const countLabel = `${t('CustomFieldGroups')} ${total}`
  const limitLine = check
    ? `${t('CustomFieldVisibility1')} ${check.available} ${t('CustomFieldVisibility2')}`
    : ''

  return (
    <SettingsLayout
      sectionId="custom-fields"
      title={t('CustomFields')}
      meta={
        read.status === 'success' && rows.length > 0 ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
            <CountUp text={countLabel} />
          </span>
        ) : null
      }
      actions={
        profile.can(ADD) ? (
          // Rendered from the first paint, disabled until the list is in, so the header does not jump.
          <button
            type="button"
            onClick={() => open(newGroup())}
            disabled={read.status !== 'success'}
            className={ADD_BUTTON_CLASS}
          >
            <Plus aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
            {t('Add')}
          </button>
        ) : null
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />

      {/* Tab order is visual: Add in the header, then the table rows and pager. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <SettingsTable
          rows={tableRows}
          columns={columns}
          status={read.status}
          sort={query.sortCol ? { column: query.sortCol, direction: query.sortDir || 'asc' } : undefined}
          onSort={column =>
            setQuery(current => ({
              ...current,
              pageNumber: 0,
              sortCol: column,
              sortDir: current.sortCol === column && current.sortDir === 'asc' ? 'desc' : 'asc',
            }))
          }
          selectable={false}
          selected={NO_SELECTION}
          onToggle={() => undefined}
          onTogglePage={() => undefined}
          onOpen={row => open(toGroupDraft(row))}
          onRetry={read.reload}
          emptyText={EN.noItems}
          text={{
            loading: t('Loading'),
            error: t('AlertGeneralErrorDefault'),
            retry: t('Refresh'),
            selectAll: '',
            select: row => row.Title ?? '',
          }}
        />
        {read.status === 'success' && total >= GROUP_PAGE_SIZES[0] ? (
          <Pagination
            id="custom-fields-page-size"
            pageIndex={query.pageNumber}
            pageSize={query.pageSize}
            total={total}
            pageSizes={GROUP_PAGE_SIZES}
            onPageChange={pageNumber => setQuery(current => ({ ...current, pageNumber }))}
            onPageSizeChange={pageSize => setQuery(current => ({ ...current, pageSize, pageNumber: 0 }))}
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
        onOpenChange={next => {
          if (!next) setDraft(null)
        }}
        icon={ListChecks}
        title={t('CustomFieldGroup')}
        hint={isNew ? EN.newGroup : EN.editGroup}
        closeLabel={t('Cancel')}
        busy={saving}
        error={dialogError ?? validationBanner}
        onSubmit={() => void save()}
        className="max-w-4xl"
        footer={
          <>
            {!isNew && profile.can(DELETE) ? (
              <Button
                variant="ghost"
                onClick={() => void askDelete()}
                disabled={saving}
                className="mr-auto text-destructive hover:bg-red-50 hover:text-destructive"
              >
                <Trash2 aria-hidden className="size-4" />
                {t('Delete')}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => setDraft(null)}
              disabled={saving}
              className={CANCEL_BUTTON_CLASS}
            >
              {t('Cancel')}
            </Button>
            {canWrite ? (
              <Button type="submit" loading={saving} className={ADD_BUTTON_CLASS}>
                <Save aria-hidden className="size-[18px]" />
                {t('Save')}
              </Button>
            ) : null}
          </>
        }
      >
        {draft ? (
          <>
            <div className="grid sm:grid-cols-2">
              <SettingsField
                htmlFor="custom-field-entity"
                label={t('EntityType2')}
                error={fieldErrors?.entityType ? EN.entityRequired : null}
              >
                <NativeSelect
                  id="custom-field-entity"
                  value={draft.entityType}
                  disabled={locked}
                  aria-invalid={fieldErrors?.entityType || undefined}
                  aria-describedby={fieldErrors?.entityType ? 'custom-field-entity-error' : undefined}
                  onChange={event => {
                    const entityType = event.target.value
                    setDraft(current => (current ? { ...current, entityType } : current))
                  }}
                >
                  <option value="">{EN.selectEntity}</option>
                  {ENTITY_TYPES.filter(option => option.value !== STUDENT_DATA_TABLE || tableAllowed).map(
                    option => (
                      <option key={option.value} value={option.value}>
                        {entityLabel(option.labelKeys)}
                      </option>
                    ),
                  )}
                </NativeSelect>
              </SettingsField>
              <SettingsField
                htmlFor="custom-field-title"
                label={isTable ? t('Name') : `${t('Group')} ${t('Name')}`}
                error={fieldErrors?.title ? EN.titleRequired : null}
              >
                <Input
                  id="custom-field-title"
                  value={draft.title}
                  disabled={locked}
                  aria-invalid={fieldErrors?.title || undefined}
                  aria-describedby={fieldErrors?.title ? 'custom-field-title-error' : undefined}
                  onChange={event => {
                    const title = sanitizeName(event.target.value)
                    setDraft(current =>
                      current ? { ...current, title, code: codeFromTitle(title) } : current,
                    )
                  }}
                  className="h-9 w-full bg-white"
                />
              </SettingsField>
            </div>

            {isTable ? (
              <div className="grid animate-rise-in sm:grid-cols-2 motion-reduce:animate-none">
                <SettingsField htmlFor="custom-field-code" label={t('Code')} error={tableFieldError || null}>
                  <Input
                    id="custom-field-code"
                    value={draft.code}
                    readOnly
                    aria-invalid={Boolean(tableFieldError) || undefined}
                    aria-describedby={tableFieldError ? 'custom-field-code-error' : undefined}
                    className="h-9 w-full bg-slate-50 font-mono text-[13px]"
                  />
                </SettingsField>
                <SettingsField htmlFor="custom-field-sensitivity" label={t('SensitivityLevel')}>
                  <NativeSelect
                    id="custom-field-sensitivity"
                    value={draft.sensitivity}
                    disabled={locked}
                    onChange={event => {
                      const sensitivity = Number(event.target.value)
                      setDraft(current => (current ? { ...current, sensitivity } : current))
                    }}
                  >
                    {SENSITIVITY_LEVELS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </SettingsField>
              </div>
            ) : (
              <div className="animate-rise-in px-5 py-4 motion-reduce:animate-none">
                <p className="mb-2 text-[13.5px] font-semibold text-slate-800">{t('Fields')}</p>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[40rem] text-sm">
                    <thead className={`${NAV_BAND_ROW} text-left text-xs font-semibold`}>
                      <tr>
                        <th className="px-3 py-2">{t('Name')}</th>
                        {showVisibility ? <th className="px-2 py-2 text-center">{t('Visibility')}</th> : null}
                        <th className="px-2 py-2">{t('DataType')}</th>
                        <th className="px-2 py-2">{t('Options')}</th>
                        <th className="px-2 py-2">{t('SensitivityLevel')}</th>
                        <th className="w-10 px-2 py-2">
                          <span className="sr-only">{EN.removeField}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.rows.map((row, index) => {
                        const rowErrors = fieldErrors?.rows[index]
                        const rowError = rowHasErrors(rowErrors) ? rowMessage(rowErrors) : ''
                        const rowErrorId = `custom-field-row-${row.key}-error`
                        return (
                          <tr
                            key={row.key}
                            className="animate-row-in border-t border-border motion-reduce:animate-none"
                          >
                            <td className="px-3 py-2">
                              <Input
                                aria-label={`${t('Name')} ${index + 1}`}
                                value={row.name}
                                disabled={locked}
                                aria-invalid={rowErrors?.name || rowErrors?.id || undefined}
                                aria-describedby={rowError ? rowErrorId : undefined}
                                onChange={event => {
                                  const name = sanitizeName(event.target.value)
                                  updateRow(row.key, current => ({ ...current, name }))
                                }}
                                className="h-8 bg-white"
                              />
                              {rowError ? (
                                <p
                                  id={rowErrorId}
                                  className="mt-1 animate-fade-in text-xs font-medium text-destructive motion-reduce:animate-none"
                                >
                                  {rowError}
                                </p>
                              ) : null}
                            </td>
                            {showVisibility ? (
                              <td className="px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  aria-label={`${t('Visibility')} ${index + 1}`}
                                  checked={row.visibility}
                                  disabled={locked || !visibilityEnabled(row)}
                                  onChange={event => {
                                    const visibility = event.target.checked
                                    updateRow(row.key, current => ({ ...current, visibility }))
                                  }}
                                  className="size-4 rounded-sm accent-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                              </td>
                            ) : null}
                            <td className="px-2 py-2">
                              <NativeSelect
                                aria-label={`${t('DataType')} ${index + 1}`}
                                value={row.dataType}
                                disabled={locked}
                                aria-invalid={rowErrors?.dataType || undefined}
                                aria-describedby={rowErrors?.dataType ? rowErrorId : undefined}
                                onChange={event => {
                                  const dataType = Number(event.target.value)
                                  updateRow(row.key, current => changeDataType(current, dataType))
                                }}
                                className="min-w-24"
                              >
                                {DATA_TYPES.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </NativeSelect>
                            </td>
                            <td className="px-2 py-2">
                              <Input
                                aria-label={`${t('Options')} ${index + 1}`}
                                value={row.options}
                                disabled={locked || !optionsEnabled(row)}
                                onChange={event => {
                                  const options = sanitizeName(event.target.value)
                                  updateRow(row.key, current => ({ ...current, options }))
                                }}
                                className="h-8 bg-white"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <NativeSelect
                                aria-label={`${t('SensitivityLevel')} ${index + 1}`}
                                value={row.sensitivity}
                                disabled={locked}
                                onChange={event => {
                                  const sensitivity = Number(event.target.value)
                                  updateRow(row.key, current => ({ ...current, sensitivity }))
                                }}
                                className="min-w-28"
                              >
                                {SENSITIVITY_LEVELS.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </NativeSelect>
                            </td>
                            <td className="px-2 py-2">
                              {canWrite && draft.rows.length > 1 ? (
                                <button
                                  type="button"
                                  aria-label={`${EN.removeField} ${index + 1}`}
                                  disabled={saving}
                                  onClick={() =>
                                    setDraft(current =>
                                      current
                                        ? {
                                            ...current,
                                            rows: current.rows.filter(item => item.key !== row.key),
                                          }
                                        : current,
                                    )
                                  }
                                  className="grid size-8 place-items-center rounded-md text-slate-500 transition-[color,background-color,transform] hover:bg-red-50 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90"
                                >
                                  <Minus aria-hidden className="size-4" />
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {canWrite ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={saving}
                    onClick={() =>
                      setDraft(current =>
                        current ? { ...current, rows: [...current.rows, blankRow()] } : current,
                      )
                    }
                    className="group/add mt-2 text-brand hover:bg-brand/[0.06] hover:text-brand"
                  >
                    <Plus
                      aria-hidden
                      className="size-4 transition-transform duration-300 group-hover/add:rotate-90"
                    />
                    {EN.addField}
                  </Button>
                ) : null}
              </div>
            )}
          </>
        ) : null}
      </FormDialog>

      <FormDialog
        open={check !== null}
        onOpenChange={next => {
          if (!next) setCheck(null)
        }}
        icon={TriangleAlert}
        title={t('FieldVisibility')}
        closeLabel={t('Cancel')}
        busy={saving}
        onSubmit={() => void send()}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCheck(null)}
              disabled={saving}
              className={CANCEL_BUTTON_CLASS}
            >
              {t('Cancel')}
            </Button>
            {check?.allowed ? (
              <Button type="submit" loading={saving} className={ADD_BUTTON_CLASS}>
                <Save aria-hidden className="size-[18px]" />
                {t('Save')}
              </Button>
            ) : null}
          </>
        }
      >
        {check ? (
          <div className="flex flex-col gap-3 px-5 py-4 text-sm text-slate-700">
            <p>{limitLine}</p>
            <p>
              {t('CustomFieldVisibility3')}{' '}
              <a
                href={EN.support}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-sm font-medium text-brand underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t('CustomFieldVisibility4')}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            </p>
            <p
              className={cn(
                'rounded-lg px-3 py-2 font-medium',
                check.allowed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900',
              )}
            >
              {check.allowed ? t('CustomFieldVisibility5') : t('CustomFieldVisibility6')}
            </p>
          </div>
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={deleteState !== null}
        onOpenChange={next => {
          if (!next) setDeleteState(null)
        }}
        title={t('Delete')}
        message={
          deleteState?.inUse
            ? t('ThisCustomFieldIsInUseDeletionMayResultInDataLoss')
            : t('DeleteConfirmationMsg')
        }
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        onConfirm={() => void confirmDelete()}
        pending={saving}
      />
    </SettingsLayout>
  )
}
