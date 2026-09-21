import type { CustomFieldGroupBody, CustomFieldGroupDto, SchemaFieldDto } from '@/types/custom-fields'

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'
export const STUDENT_DATA_TABLE = 'STUDENT DATA TABLE'
export const GROUP_PAGE_SIZES = [10, 20, 30, 50, 100, 200] as const

// Option values from seats-admin-customfield.html:346-352.
export const ENTITY_TYPES = [
  { value: 'STUDENT', labelKeys: ['Student'] },
  { value: 'STUDENT|ENGAGEMENT', labelKeys: ['Student', 'Engagement'] },
  { value: 'MANUAL INTERVENTION STEP', labelKeys: ['ManualInterventionStep'] },
  { value: STUDENT_DATA_TABLE, labelKeys: ['StudentDataTable'] },
] as const

// SchemaFieldDataTypes shown in legacy (Integer, Decimal, Time and DateTime are commented out).
export const DATA_TYPES = [
  { value: 1, label: 'Text' },
  { value: 4, label: 'Date' },
  { value: 7, label: 'Link' },
] as const
export const DATE_TYPE = 4
export const TEXT_TYPE = 1

export const SENSITIVITY_LEVELS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Level A' },
  { value: 2, label: 'Level B' },
  { value: 3, label: 'Level C' },
] as const

export type FieldRow = {
  key: string
  id: string
  name: string
  visibility: boolean
  wasVisible: boolean
  dataType: number
  options: string
  sensitivity: number
}

export type GroupDraft = {
  id: number
  globalId: string
  entityType: string
  title: string
  code: string
  sensitivity: number
  tableFieldId: string
  rows: FieldRow[]
}

// Intended legacy pattern [a-zA-Z0-9-_:.,()?¿\s]; legacy escaping turned "\\-_" into a range and dropped the hyphen.
const NOT_ALLOWED = /[^a-zA-Z0-9\-_:.,()?¿\s]/g

export function sanitizeName(value: string): string {
  return value.replace(NOT_ALLOWED, '')
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
}

// Names are HTML-encoded by the server on save; show them decoded so they are not encoded again.
export function decodeName(value: string | null): string {
  return (value ?? '').replace(/&(amp|lt|gt|quot|#39);/g, entity => ENTITIES[entity] ?? entity)
}

let rowCounter = 0
export function blankRow(): FieldRow {
  rowCounter += 1
  return {
    key: `new-${rowCounter}`,
    id: EMPTY_GUID,
    name: '',
    visibility: false,
    wasVisible: false,
    dataType: TEXT_TYPE,
    options: '',
    sensitivity: 0,
  }
}

export function newGroup(): GroupDraft {
  return {
    id: 0,
    globalId: '',
    entityType: '',
    title: '',
    code: '',
    sensitivity: 0,
    tableFieldId: EMPTY_GUID,
    rows: [blankRow()],
  }
}

export function toGroupDraft(group: CustomFieldGroupDto): GroupDraft {
  const fields = group.SchemaFields ?? []
  const first = fields[0]
  return {
    id: group.Id,
    globalId: group.GlobalId,
    entityType: (group.EntityType ?? '').toUpperCase(),
    title: group.Title ?? '',
    code: decodeName(first?.Name ?? ''),
    sensitivity: first?.SensitivityLevel ?? 0,
    tableFieldId: first?.Id ?? EMPTY_GUID,
    rows:
      fields.length > 0
        ? fields.map(field => ({
            key: field.Id,
            id: field.Id,
            name: decodeName(field.Name),
            visibility: field.Visibility,
            wasVisible: field.Visibility,
            dataType: field.DataType,
            options: (field.Options ?? []).join(','),
            sensitivity: field.SensitivityLevel,
          }))
        : [blankRow()],
  }
}

// _changeName (:1016-1020): the table code is the name with spaces replaced by underscores.
export function codeFromTitle(title: string): string {
  return title.replaceAll(' ', '_')
}

// verifyDataType: Date disables and clears visibility and options; Link disables options.
export function changeDataType(row: FieldRow, dataType: number): FieldRow {
  return { ...row, dataType, visibility: dataType === DATE_TYPE ? false : row.visibility }
}

export const optionsEnabled = (row: FieldRow) => row.dataType === TEXT_TYPE
export const visibilityEnabled = (row: FieldRow) => row.dataType !== DATE_TYPE && !row.wasVisible

type SchemaFieldPayload = Omit<SchemaFieldDto, 'DataType' | 'SensitivityLevel' | 'Options'> & {
  DataType: number | string
  SensitivityLevel: number | string
  Options: string[]
}

// parseSchemaFields (:1100-1140).
export function buildSchemaFields(draft: GroupDraft): SchemaFieldPayload[] {
  if (draft.entityType === STUDENT_DATA_TABLE) {
    return [
      {
        Id: draft.tableFieldId,
        Name: draft.code,
        DataType: 1,
        SensitivityLevel: draft.sensitivity,
        Visibility: true,
        Options: [''],
      },
    ]
  }
  return draft.rows.map(row => ({
    Id: row.id,
    Name: row.name,
    DataType: String(row.dataType),
    SensitivityLevel: String(row.sensitivity),
    Visibility: row.visibility,
    Options: row.options.split(','),
  }))
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type RowErrors = { id: boolean; name: boolean; dataType: boolean }
export type GroupFieldErrors = { title: boolean; entityType: boolean; rows: RowErrors[] }

// isBodyValid (:1148-1195) per field, so each input can show its own error.
export function groupFieldErrors(draft: GroupDraft, fields: readonly SchemaFieldPayload[]): GroupFieldErrors {
  return {
    title: !draft.title,
    entityType: !draft.entityType,
    rows: fields.map(field => ({
      id: !(GUID.test(field.Id) || field.Id === EMPTY_GUID),
      name: !field.Name || !/[a-zA-Z0-9\-_:.,()?¿\s]/.test(field.Name),
      dataType: Number.isNaN(Number(field.DataType)),
    })),
  }
}

export const rowHasErrors = (row: RowErrors | undefined) =>
  Boolean(row && (row.id || row.name || row.dataType))

// isBodyValid summary, reporting each problem once.
export function groupErrors(draft: GroupDraft, fields: readonly SchemaFieldPayload[]): string[] {
  const found = groupFieldErrors(draft, fields)
  const errors: string[] = []
  if (found.title) errors.push('Field is required.')
  if (found.entityType) errors.push('Entity Type is required.')
  found.rows.forEach((errorsInRow, index) => {
    const row: string[] = []
    if (errorsInRow.id) row.push('Id is required.')
    if (errorsInRow.name) row.push('Name is required.')
    if (errorsInRow.dataType) row.push('Data type is required.')
    if (row.length) errors.push(`Errors in row (${index}): ${row.join(' ')}`)
  })
  return errors
}

export function toGroupBody(draft: GroupDraft, fields: readonly SchemaFieldPayload[]): CustomFieldGroupBody {
  return {
    id: draft.id,
    globalId: draft.globalId,
    entityType: draft.entityType,
    title: draft.title,
    schemaFields: JSON.stringify(fields),
  }
}

export type VisibilityCheck = { needed: boolean; available: number; allowed: boolean }

// _countVisibilityResponse (:902-936): only when a limit exists and a field was newly made visible.
export function visibilityCheck(
  limit: number | null,
  draft: GroupDraft,
  fields: readonly SchemaFieldPayload[],
): VisibilityCheck {
  const newlyVisible =
    draft.entityType !== STUDENT_DATA_TABLE && draft.rows.some(row => row.visibility && !row.wasVisible)
  if (limit === null || !newlyVisible) return { needed: false, available: limit ?? 0, allowed: true }
  const alreadyVisible = draft.id > 0 ? draft.rows.filter(row => row.wasVisible).length : 0
  const visible = fields.filter(field => field.Visibility).length
  return { needed: true, available: limit, allowed: limit + alreadyVisible >= visible }
}

export function titleCaseEntity(value: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/(^|[\s|])([a-z])/g, (_, lead: string, letter: string) => lead + letter.toUpperCase())
}
