// GET api/ImportApi/GetImportTypes items (ImportApiController.cs:517-543).
export type ImportTypeDto = {
  id: number
  description: string | null
}

// ErrorDetails rows from PUT api/ImportApi/validateFile, first 100 only (ImportApiController.cs:272).
export type ImportErrorDto = {
  lineNumber: number
  exceptionInfo: string | null
}

export type ImportErrorSort = { column: 'lineNumber' | 'exceptionInfo'; dir: 'asc' | 'desc' }
