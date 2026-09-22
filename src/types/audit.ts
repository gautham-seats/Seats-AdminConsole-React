// ColumnDetailViewModel: `detail` is the raw JSON string stored by the audit service (ViewModels/User/AuditViewModel.cs).
export type AuditDetailDto = {
  auditType: string | null
  detail: string | null
}

// AuditViewModel from POST api/audit/GetAudit (Controllers/Api/AuditController.cs:140-153).
export type AuditItemDto = {
  id: number
  userName: string | null
  userFullName: string | null
  userId: number
  accessDate: string | null
  auditType: string | null
  detail: AuditDetailDto | null
}

export type AuditPageDto = {
  items: AuditItemDto[]
  totalRowCount: number
}

export type AuditSortColumn = 'auditType' | 'detail' | 'accessDate' | 'userName' | 'userFullName'

// ViewModels/Audit/AuditParameters.cs; `user` is posted as '' for all users, as the component did.
export type AuditParameters = {
  pageNumber: number
  pageSize: number
  sortCol: AuditSortColumn
  sortDir: 'asc' | 'desc'
  type: string
  user: number | ''
  site: string
  from: string
  to: string
}
