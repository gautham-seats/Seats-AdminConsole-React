// ViewModels/Engagement/EngagementHistory.cs (camelCase JSON).
export type EngagementMessageDto = { messages: string | null; count: number }

export type EngagementHistoryItem = {
  period: string | null
  calculated: string | null
  training: boolean
  model: string | null
  node: string | null
  status: string | null
  instances: number | null
  min: number | null
  max: number | null
  mean: number | null
  sd: number | null
}

export type EngagementStatsItem = EngagementHistoryItem & {
  errors: EngagementMessageDto | null
  warnings: EngagementMessageDto | null
  messages: EngagementMessageDto | null
}

export type EngagementStudentScoreItem = EngagementHistoryItem & {
  studentId: number
  r: number | null
  z: number | null
  dr: number | null
  dz: number | null
  zdz: number | null
  p: number | null
}

export type EngagementHistoryView = 'Stats' | 'StudentScore'

// EngagementHistoryParameters; isTrainingPeriod is '' for All exactly as legacy sends it.
export type EngagementHistoryBody = {
  returnTotalCount: boolean
  pageNumber: number
  pageSize: number
  sortField: string
  sortOrder: string
  isTrainingPeriod: '' | 'true' | 'false'
  startDatePeriod: string
  endDatePeriod: string
  modelIds: number[]
  nodeIds: number[]
  status: string[]
  containing?: string
  studentIds?: (number | '')[]
}

export type CalculationPeriodDto = { periodStart: string | null; periodEnd: string | null }
