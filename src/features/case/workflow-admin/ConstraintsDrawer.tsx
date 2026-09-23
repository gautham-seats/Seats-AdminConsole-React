'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowLeft, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  Button,
  ConfirmDialog,
  DelayedLoading,
  ErrorState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from '@/shared/ui/nav-band'
import type { CfcConstraintTypeDto, CfcWorkflowConstraintDto } from '@/types/case'
import type { SimpleListItemDto } from '@/types/users'
import { LookupField } from '@/features/operations/job-schedule/LookupField'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { CONSTRAINT_OPTION_PATHS, createConstraints, fetchConstraintTypes } from '../case-api'
import { useFixedWindow } from './use-fixed-window'

const ADD = { item: PermissionItem.Case, action: PermissionAction.Add }

const TEXT = {
  Constraints: 'Constraints',
  ConstraintType: 'Constraint Type',
  Back: 'Back',
  Save: 'Save',
  Cancel: 'Cancel',
  Add: 'Add',
  Delete: 'Delete',
  Select: 'Select',
  None: 'None',
  Yes: 'Yes',
  No: 'No',
  Is: 'Is',
  RequiredMessage: 'This field is required.',
  ErrorGettingConstraintTypes: 'There was an error loading constraint types.',
  AlertSaveSucceededDefault: 'The item was saved succesfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Close: 'Close',
  Unknown: 'Unknown',
} as const

const EN = {
  clear: 'Clear',
  noMatches: 'No matches',
  values: 'Values',
  noTypes: 'There are no constraint types to show.',
  addValueRequired: 'Add at least one value before saving.',
  chooseValueRequired: 'Select Yes or No before saving.',
  noSource: 'This constraint type has no option list.',
} as const

// Every value row is h-9, so a long value list is windowed by a fixed row height.
const VALUE_ROW_HEIGHT = 36

const CHOICE_CLASS =
  'size-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

type ConstraintValue = { value: string; description: string | null }
type ConstraintMode =
  | 'radio-with-none'
  | 'radio'
  | 'numeric'
  | 'dropdown'
  | 'school'
  | 'course'
  | 'module'
  | 'site'
  | 'faculty'
  | 'student'
type AcademicFilters = { schoolId: number | null; courseId: number | null; moduleId: number | null }

type ConstraintsDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: number
  onSaved?: () => void
}

// Seats.Trunk.Contracts.CfcConstraintTypeEnum, read by reflection (D-090: pick by id, never by display name).
export const CfcConstraintTypeEnum = {
  Site: 1,
  School: 2,
  Course: 3,
  Module: 4,
  UKVI: 5,
  StudentSubType: 6,
  FEStudent: 7,
  StudentYear: 8,
  AdminAreaType: 9,
  StudentType: 10,
  Faculty: 11,
  StudentStatus: 12,
  Students: 13,
} as const

// seats-admin-workflow-constraints-autocomplete.html:273-296 switches on the type id: UKVI radio + None,
// FEStudent radio, StudentYear typed numbers, everything else a lookup whose URL is chosen by id in
// seats-admin-workflow-creator-stage-constraints.html:401-431.
const MODE_BY_ID: Readonly<Record<number, ConstraintMode>> = {
  [CfcConstraintTypeEnum.UKVI]: 'radio-with-none',
  [CfcConstraintTypeEnum.FEStudent]: 'radio',
  [CfcConstraintTypeEnum.StudentYear]: 'numeric',
  [CfcConstraintTypeEnum.AdminAreaType]: 'dropdown',
  [CfcConstraintTypeEnum.StudentType]: 'dropdown',
  [CfcConstraintTypeEnum.StudentSubType]: 'dropdown',
  [CfcConstraintTypeEnum.StudentStatus]: 'dropdown',
  [CfcConstraintTypeEnum.School]: 'school',
  [CfcConstraintTypeEnum.Course]: 'course',
  [CfcConstraintTypeEnum.Module]: 'module',
  [CfcConstraintTypeEnum.Site]: 'site',
  [CfcConstraintTypeEnum.Faculty]: 'faculty',
  [CfcConstraintTypeEnum.Students]: 'student',
}

export function constraintMode(id: number, name: string | null): ConstraintMode {
  return MODE_BY_ID[id] ?? constraintModeByName(name)
}

// Fallback only for an id the enum does not list.
function constraintModeByName(name: string | null): ConstraintMode {
  const key = (name ?? '').trim().toLowerCase()
  if (key.includes('ukvi')) return 'radio-with-none'
  if (key.includes('fe') && key.includes('student')) return 'radio'
  if (key.includes('year')) return 'numeric'
  if (
    key.includes('admin area') ||
    key.includes('student type') ||
    key.includes('student sub') ||
    key.includes('student status') ||
    key.includes('monitored')
  ) {
    return 'dropdown'
  }
  if (key.includes('school')) return 'school'
  if (key.includes('course')) return 'course'
  if (key.includes('module')) return 'module'
  if (key.includes('site')) return 'site'
  if (key.includes('faculty')) return 'faculty'
  if (key.includes('student')) return 'student'
  return 'dropdown'
}

function isManyItems(mode: ConstraintMode): boolean {
  return mode !== 'radio-with-none' && mode !== 'radio'
}

function cloneValues(values: readonly CfcWorkflowConstraintDto[] | null | undefined): ConstraintValue[] {
  return (values ?? []).map(item => ({
    value: item.value ?? '',
    description: item.description ?? item.value,
  }))
}

function summarizeValues(type: CfcConstraintTypeDto, t: (key: keyof typeof TEXT & string) => string): string {
  const values = type.cfcWorkflowConstraintsViewModel ?? []
  const mode = constraintMode(type.id, type.name)
  if (values.length === 0) return t('None')
  if (mode === 'radio-with-none' || mode === 'radio') {
    const value = values[0]?.value
    if (value === '1') return t('Yes')
    if (value === '0') return t('No')
    return mode === 'radio-with-none' ? t('None') : t('Unknown')
  }
  let summary = ''
  for (let index = 0; index < values.length; index += 1) {
    summary += values[index].description || values[index].value || ''
    if (index < values.length - 1) {
      if (summary.length < 30) summary += ', '
      else return `${summary}, ...`
    }
  }
  return summary || t('None')
}

function lookupPath(mode: ConstraintMode): string | null {
  switch (mode) {
    case 'school':
    case 'course':
    case 'module':
    case 'site':
    case 'faculty':
    case 'student':
      return CONSTRAINT_OPTION_PATHS[mode]
    default:
      return null
  }
}

function lookupQuery(mode: ConstraintMode, filters: AcademicFilters, text: string): Record<string, string> {
  const id = (value: number | null) => (value === null ? '' : String(value))
  switch (mode) {
    case 'school':
      return { query: text, courseId: id(filters.courseId), moduleId: id(filters.moduleId) }
    case 'course':
      return { query: text, schoolId: id(filters.schoolId), moduleId: id(filters.moduleId) }
    case 'module':
      return { query: text, schoolId: id(filters.schoolId), courseId: id(filters.courseId) }
    default:
      return { query: text }
  }
}

// seats-admin-workflow-creator-stage-constraints.html:402-410, 429-431.
const DROPDOWN_PATH_BY_ID: Readonly<Record<number, string>> = {
  [CfcConstraintTypeEnum.AdminAreaType]: CONSTRAINT_OPTION_PATHS.adminArea,
  [CfcConstraintTypeEnum.StudentSubType]: CONSTRAINT_OPTION_PATHS.studentSubType,
  [CfcConstraintTypeEnum.StudentStatus]: CONSTRAINT_OPTION_PATHS.studentMonitoredType,
  [CfcConstraintTypeEnum.StudentType]: CONSTRAINT_OPTION_PATHS.studentType,
}

function dropdownPathByName(typeName: string | null): string | null {
  const name = (typeName ?? '').toLowerCase()
  if (name.includes('admin area')) return CONSTRAINT_OPTION_PATHS.adminArea
  if (name.includes('student sub')) return CONSTRAINT_OPTION_PATHS.studentSubType
  if (name.includes('student status') || name.includes('monitored'))
    return CONSTRAINT_OPTION_PATHS.studentMonitoredType
  if (name.includes('student type')) return CONSTRAINT_OPTION_PATHS.studentType
  return null
}

export function dropdownPathFor(typeId: number, typeName: string | null): string | null {
  return DROPDOWN_PATH_BY_ID[typeId] ?? dropdownPathByName(typeName)
}

function SideDrawer({
  open,
  onOpenChange,
  title,
  closeLabel,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  closeLabel: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={event => event.preventDefault()}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-white shadow-dialog outline-none data-[state=open]:animate-slide-in motion-reduce:animate-none"
        >
          <div className={cn('relative flex items-center gap-2.5 px-4 py-2.5', NAV_BAND)}>
            <NavBandGlow />
            <span className={cn('grid size-7 shrink-0 place-items-center', NAV_ICON_BOX)}>
              <SlidersHorizontal aria-hidden className="size-4" />
            </span>
            <DialogPrimitive.Title className="min-w-0 flex-1 text-[14.5px] leading-[19px] font-bold break-words tracking-[-.005em] text-white">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              type="button"
              aria-label={closeLabel}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-white/85 transition-[background-color,color,rotate] duration-300 hover:rotate-90 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X aria-hidden className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>
          {footer ? <div className="border-t border-border bg-slate-50/80 px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function ConstraintEditor({
  workflowId,
  type,
  canSave,
  onBack,
  onSaved,
}: {
  workflowId: number
  type: CfcConstraintTypeDto
  canSave: boolean
  onBack: () => void
  onSaved: () => void
}) {
  const t = useScreenText(TEXT)
  const mode = constraintMode(type.id, type.name)
  const many = isManyItems(mode)
  const [values, setValues] = useState<ConstraintValue[]>(() =>
    cloneValues(type.cfcWorkflowConstraintsViewModel),
  )
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [draftValue, setDraftValue] = useState(() => {
    if (!many && (mode === 'radio-with-none' || mode === 'radio')) {
      return type.cfcWorkflowConstraintsViewModel?.[0]?.value ?? (mode === 'radio-with-none' ? '' : '1')
    }
    return ''
  })
  const [draftText, setDraftText] = useState('')
  const [draftId, setDraftId] = useState<number | null>(null)
  const [filters, setFilters] = useState<AcademicFilters>({ schoolId: null, courseId: null, moduleId: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const valuesScroller = useRef<HTMLUListElement>(null)
  const valuesWindow = useFixedWindow(values.length, VALUE_ROW_HEIGHT, valuesScroller)

  // …constraints-autocomplete.html:326-345 saves an empty list to clear a constraint (UKVI "None", no sites);
  // only the plain Yes/No radio (FEStudent) has no empty state.
  const valueMissing = mode === 'radio' && !draftValue
  const valueError = attempted && valueMissing ? (many ? EN.addValueRequired : EN.chooseValueRequired) : null
  const valueErrorId = `constraint-value-error-${type.id}`
  const invalidProps = valueError ? { 'aria-invalid': true, 'aria-describedby': valueErrorId } : {}

  const path = lookupPath(mode)
  const dropdownPath = mode === 'dropdown' ? dropdownPathFor(type.id, type.name) : null
  const dropdownRead = useApiRead(dropdownPath ? `constraint-options-${type.id}` : null, signal =>
    api.get<SimpleListItemDto[]>(dropdownPath ?? '', { signal }),
  )

  const addValue = () => {
    if (!draftValue.trim() || values.some(item => item.value === draftValue)) return
    setValues(current => [...current, { value: draftValue, description: draftText || draftValue }])
    setDraftValue('')
    setDraftText('')
    setDraftId(null)
  }

  const save = async () => {
    if (!canSave) return
    const payload: CfcConstraintTypeDto = {
      id: type.id,
      name: type.name,
      cfcWorkflowConstraintsViewModel: many
        ? values.map(item => ({
            id: null,
            cfcConstraintTypeId: type.id,
            cfcConstraintTypeName: type.name,
            cfcWorkflowId: workflowId,
            value: item.value,
            description: item.description,
          }))
        : draftValue
          ? [
              {
                id: null,
                cfcConstraintTypeId: type.id,
                cfcConstraintTypeName: type.name,
                cfcWorkflowId: workflowId,
                value: draftValue,
                description: draftText || '',
              },
            ]
          : [],
    }
    setAttempted(true)
    if (valueMissing) return
    setSaving(true)
    setError(null)
    try {
      await createConstraints(workflowId, type.id, payload)
      onSaved()
      onBack()
    } catch (caught) {
      setError(saveFailureMessage(toApiError(caught), t('AlertSaveErrorDefault')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t('Back')}
      </button>
      <h3 className="border-b border-border pb-2 text-sm font-semibold text-foreground">{type.name}</h3>
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {mode === 'radio-with-none' || mode === 'radio' ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            {t('Is')} {type.name}
          </legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              { value: '1', label: t('Yes') },
              { value: '0', label: t('No') },
              ...(mode === 'radio-with-none' ? [{ value: '', label: t('None') }] : []),
            ].map(option => (
              <label key={option.value || 'none'} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name={`constraint-${type.id}`}
                  checked={draftValue === option.value}
                  onChange={() => setDraftValue(option.value)}
                  className={CHOICE_CLASS}
                  {...invalidProps}
                />
                {option.label}
              </label>
            ))}
          </div>
          {valueError ? (
            <p id={valueErrorId} role="alert" className="text-xs font-medium text-destructive">
              {valueError}
            </p>
          ) : null}
        </fieldset>
      ) : null}
      {mode === 'numeric' ? (
        <div className="space-y-2">
          <Label htmlFor={`constraint-year-${type.id}`}>{type.name}</Label>
          <Input
            id={`constraint-year-${type.id}`}
            inputMode="numeric"
            value={draftValue}
            onChange={event => setDraftValue(event.target.value.replace(/\D/g, ''))}
            {...invalidProps}
          />
          {many ? (
            <Button type="button" size="sm" disabled={!draftValue} onClick={addValue}>
              <Plus aria-hidden className="size-4" />
              {t('Add')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {mode === 'dropdown' ? (
        <div className="space-y-2">
          <Label htmlFor={`constraint-dropdown-${type.id}`}>{type.name}</Label>
          {dropdownRead.status === 'idle' ? (
            <p className="text-sm text-muted-foreground">{EN.noSource}</p>
          ) : null}
          {dropdownRead.status === 'loading' ? <DelayedLoading active label={t('Loading')} /> : null}
          {dropdownRead.status === 'error' ? (
            <ErrorState
              message={t('ErrorGettingConstraintTypes')}
              retryLabel={t('Refresh')}
              onRetry={dropdownRead.reload}
              error={dropdownRead.error}
            />
          ) : null}
          {dropdownRead.status === 'success' ? (
            <Select
              value={draftValue || undefined}
              onValueChange={value => {
                setDraftValue(value)
                const match = dropdownRead.data?.find(option => String(option.id) === value)
                setDraftText(match?.description ?? value)
              }}
            >
              <SelectTrigger id={`constraint-dropdown-${type.id}`} className="w-full" {...invalidProps}>
                <SelectValue placeholder={t('Select')} />
              </SelectTrigger>
              <SelectContent>
                {(dropdownRead.data ?? []).map(option => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {many ? (
            <Button type="button" size="sm" disabled={!draftValue} onClick={addValue}>
              <Plus aria-hidden className="size-4" />
              {t('Add')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {path ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor={`constraint-lookup-${type.id}`}>
              {t('Add')} {type.name}
            </Label>
            <LookupField
              id={`constraint-lookup-${type.id}`}
              label={type.name ?? t('ConstraintType')}
              placeholder={t('Select')}
              clearLabel={EN.clear}
              noResults={EN.noMatches}
              path={path}
              query={text => lookupQuery(mode, filters, text)}
              filterKey={JSON.stringify({ mode, filters })}
              selectedId={draftId}
              text={draftText}
              disabled={false}
              onTextChange={setDraftText}
              onSelect={option => {
                setDraftId(option?.id ?? null)
                setDraftValue(option ? String(option.id) : '')
                setDraftText(option?.description ?? '')
                if (mode === 'school') setFilters(current => ({ ...current, schoolId: option?.id ?? null }))
                if (mode === 'course') setFilters(current => ({ ...current, courseId: option?.id ?? null }))
                if (mode === 'module') setFilters(current => ({ ...current, moduleId: option?.id ?? null }))
              }}
            />
          </div>
          <Button type="button" size="sm" disabled={!draftValue} onClick={addValue}>
            <Plus aria-hidden className="size-4" />
            {t('Add')}
          </Button>
        </div>
      ) : null}
      {many && valueError ? (
        <p id={valueErrorId} role="alert" className="text-xs font-medium text-destructive">
          {valueError}
        </p>
      ) : null}
      {many && values.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{EN.values}</p>
            {selected.size > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
                <Trash2 aria-hidden className="size-4" />
                {t('Delete')}
              </Button>
            ) : null}
          </div>
          <ul
            ref={valuesScroller}
            onScroll={valuesWindow.onScroll}
            className="max-h-48 overflow-auto rounded-lg border border-border"
          >
            {valuesWindow.padTop > 0 ? (
              <li aria-hidden style={{ height: `${valuesWindow.padTop}px` }} />
            ) : null}
            {values.slice(valuesWindow.start, valuesWindow.end).map(item => (
              <li
                key={item.value}
                className="box-border flex h-9 items-center gap-2 border-b border-border px-3 last:border-b-0"
              >
                <input
                  type="checkbox"
                  className={CHOICE_CLASS}
                  checked={selected.has(item.value)}
                  aria-label={item.description ?? item.value}
                  onChange={() => {
                    setSelected(current => {
                      const next = new Set(current)
                      if (next.has(item.value)) next.delete(item.value)
                      else next.add(item.value)
                      return next
                    })
                  }}
                />
                <span className="min-w-0 flex-1 truncate text-sm" title={item.description ?? item.value}>
                  {item.description ?? item.value}
                </span>
              </li>
            ))}
            {valuesWindow.padBottom > 0 ? (
              <li aria-hidden style={{ height: `${valuesWindow.padBottom}px` }} />
            ) : null}
          </ul>
        </div>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          {t('Cancel')}
        </Button>
        {canSave ? (
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {t('Save')}
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('Delete')}
        message={t('DeleteConfirmationMsg')}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        onConfirm={() => {
          setValues(current => current.filter(item => !selected.has(item.value)))
          setSelected(new Set())
          setConfirming(false)
        }}
      />
    </div>
  )
}

export function ConstraintsDrawer({ open, onOpenChange, workflowId, onSaved }: ConstraintsDrawerProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canSave = profile.can(ADD)
  const [editing, setEditing] = useState<CfcConstraintTypeDto | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const load = useCallback((signal: AbortSignal) => fetchConstraintTypes(workflowId, signal), [workflowId])
  const read = useApiRead(open ? `constraint-types-${workflowId}` : null, load)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditing(null)
      setNotice(null)
    }
    onOpenChange(nextOpen)
  }

  const types = useMemo(() => read.data ?? [], [read.data])

  return (
    <SideDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={t('Constraints')}
      closeLabel={t('Close')}
      footer={
        notice ? (
          <p role="status" className="text-sm text-emerald-700">
            {notice}
          </p>
        ) : null
      }
    >
      {editing ? (
        <ConstraintEditor
          key={editing.id}
          workflowId={workflowId}
          type={editing}
          canSave={canSave}
          onBack={() => setEditing(null)}
          onSaved={() => {
            setNotice(t('AlertSaveSucceededDefault'))
            read.reload()
            onSaved?.()
          }}
        />
      ) : read.status === 'loading' ? (
        <DelayedLoading active label={t('Loading')} />
      ) : read.status === 'error' ? (
        <ErrorState
          message={t('ErrorGettingConstraintTypes')}
          retryLabel={t('Refresh')}
          onRetry={read.reload}
          error={read.error}
        />
      ) : types.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EN.noTypes}</p>
      ) : (
        <div className="space-y-3">
          <h3 className="border-b border-border pb-2 text-sm font-semibold text-foreground">
            {t('ConstraintType')}
          </h3>
          <ul className="space-y-2">
            {types.map(type => (
              <li
                key={type.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="min-w-0 flex-1 text-sm font-medium break-words text-foreground">
                  {type.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(type)}
                  className={cn(
                    'shrink-0 rounded-sm text-sm text-brand underline-offset-2 hover:underline',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  )}
                >
                  {summarizeValues(type, t)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SideDrawer>
  )
}
