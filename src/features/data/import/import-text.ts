'use client'

import { useCallback } from 'react'
import { useResources } from '@/shared/resources'

const IMPORT_TEXT = {
  Imports: 'Imports',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Collapse: 'Collapse',
  FileNotSupported: 'File not supported.',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Previous: 'Previous',
  Next: 'Next',
} as const

// Hard-coded English in seats-file-importer.html:146-305, 482-486, or React-only states.
export const IMPORT_FALLBACK_ONLY = {
  importType: 'Import Type',
  select: 'Select',
  sample: 'Get sample file',
  file: 'File',
  dropText: 'Select or Drop File Here',
  csvOnly: 'CSV files only',
  removeFile: 'Remove file',
  checkAndImport: 'Check and import',
  checkHelp: 'Validate File checks every line first. Process File uploads the file for import.',
  validate: 'Validate File',
  process: 'Process File',
  errorsTitle: 'The imported file is not valid. Fix the next errors:',
  errorCount: 'errors',
  resultTitle: 'Result',
  resultIdle: 'Nothing checked yet',
  resultIdleHint: 'Pick an import type and a file, then Validate File to see every line that needs fixing.',
  resultClean: 'No problems found',
  resultCleanHint: 'Every line in this file passed the check. Process File imports it.',
  lineNumber: 'Line Number',
  exceptionInfo: 'Exception Info',
  typeRequired: 'Select import type',
  fileRequired: 'Select file',
  uploaded: 'The file has been uploaded and will be processed soon',
  invalid: 'The file data is invalid, please check the errors list',
  valid: 'The file is valid, please click on process file to import the data in it',
  uploadError: 'There was an error uploading the file',
  csvBadge: 'CSV',
  noAccess: 'You do not have permission to view this page.',
  expand: 'Expand',
  first: 'First',
  last: 'Last',
  dismiss: 'Dismiss',
  safeMode: 'Uploading is turned off in this environment (safe mode).',
  uploading: 'Uploading',
  cancel: 'Cancel',
  retry: 'Retry',
  cancelled: 'Upload cancelled. Nothing was imported.',
} as const

export type ImportTextKey = keyof typeof IMPORT_TEXT

const KEYS = Object.keys(IMPORT_TEXT)

export function useImportText() {
  const { text } = useResources(KEYS)
  return useCallback(
    (key: ImportTextKey) => {
      const value = text(key)
      return !value.trim() || value === key ? IMPORT_TEXT[key] : value
    },
    [text],
  )
}
