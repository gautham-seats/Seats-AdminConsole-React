import { api } from '@/shared/api'
import { adminApiPath } from '@/shared/api/config'
import type { ImportErrorDto, ImportTypeDto } from '@/types/imports'
import { parseImportErrors, parseImportTypes, toImportForm } from './import-file'

// GET api/ImportApi/GetImportTypes, Import + Access; the server already sorts and filters by tenant.
export async function fetchImportTypes(signal: AbortSignal): Promise<ImportTypeDto[]> {
  return parseImportTypes(await api.get<unknown>('ImportApi/GetImportTypes', { signal }))
}

export type UploadOptions = { signal?: AbortSignal; onUploadProgress?: (fraction: number) => void }

// PUT api/ImportApi/validateFile, Import + Access (ImportApiController.cs:261-279).
export async function validateImportFile(
  typeId: number,
  file: File,
  options: UploadOptions = {},
): Promise<ImportErrorDto[]> {
  return parseImportErrors(
    await api.put<unknown>('ImportApi/validateFile', { body: toImportForm(typeId, file), ...options }),
  )
}

// PUT api/ImportApi/UploadFile, Import + Add (ImportApiController.cs:50-258).
export function uploadImportFile(typeId: number, file: File, options: UploadOptions = {}): Promise<void> {
  return api.put<void>('ImportApi/UploadFile', { body: toImportForm(typeId, file), ...options })
}

// Opened in a new tab like the legacy link (seats-file-importer.html:164, 352).
export function importSampleUrl(typeId: number): string {
  return adminApiPath(`ImportApi/GetImportFileSample/${typeId}`)
}
