import type { ImportErrorDto, ImportErrorSort, ImportTypeDto } from '@/types/imports'

// seats-file-importer.html:306-309.
export const IMPORT_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel']
// seats-grid.html:205-211 sizes and :264-270 default 100.
export const IMPORT_ERROR_PAGE_SIZES = [10, 20, 30, 50, 100, 200] as const
export const IMPORT_ERROR_DEFAULT_PAGE_SIZE = 100
export const INITIAL_ERROR_SORT: ImportErrorSort = { column: 'lineNumber', dir: 'asc' }
// ImportApiController.cs:277 caps the returned list, so this count means "at least".
export const IMPORT_ERROR_CAP = 100

export function parseImportTypes(raw: unknown): ImportTypeDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    return typeof record.id === 'number' && record.id > 0
      ? [{ id: record.id, description: typeof record.description === 'string' ? record.description : null }]
      : []
  })
}

export function parseImportErrors(raw: unknown): ImportErrorDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    return [
      {
        lineNumber: typeof record.lineNumber === 'number' ? record.lineNumber : 0,
        exceptionInfo: typeof record.exceptionInfo === 'string' ? record.exceptionInfo : null,
      },
    ]
  })
}

export type ImportProblem = 'typeRequired' | 'fileRequired' | 'fileNotSupported'

// seats-file-importer.html:479-497: type, then file, then MIME type.
export function checkImport(typeId: number | null, file: File | null): ImportProblem | null {
  if (typeId === null) return 'typeRequired'
  if (!file) return 'fileRequired'
  return IMPORT_MIME_TYPES.includes(file.type) ? null : 'fileNotSupported'
}

// seats-file-uploader appends the extra fields first, then the file as `file` (seats-file-uploader.html:514-522).
export function toImportForm(typeId: number, file: File): FormData {
  const form = new FormData()
  form.append('selectedImportTypeId', String(typeId))
  form.append('file', file, file.name)
  return form
}

// swgrid.js:139-151 compares with plain < and >, so ordering stays ordinal and case-sensitive, not locale-aware.
const compareText = (a: string | null, b: string | null) => {
  const left = a ?? ''
  const right = b ?? ''
  return left < right ? -1 : left > right ? 1 : 0
}

export function sortImportErrors(rows: readonly ImportErrorDto[], sort: ImportErrorSort): ImportErrorDto[] {
  const factor = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) =>
    sort.column === 'lineNumber'
      ? (a.lineNumber - b.lineNumber) * factor
      : compareText(a.exceptionInfo, b.exceptionInfo) * factor,
  )
}

export function nextErrorSort(current: ImportErrorSort, column: ImportErrorSort['column']): ImportErrorSort {
  return current.column === column
    ? { column, dir: current.dir === 'asc' ? 'desc' : 'asc' }
    : { column, dir: 'asc' }
}

export function formatFileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
