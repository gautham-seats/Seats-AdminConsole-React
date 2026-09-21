// EngagementModelGridItem in ServerSidePagedListDto from GET api/engagementApi/GetAllEngagement (EngagementApiController.cs:147-156).
export type EngagementModelGridItem = {
  id: number
  modelName: string | null
  isActive: boolean
  lastRun: string | null
}

// ReCalculateViewModel (ViewModels/Engagement/ReCalculateViewModel.cs); dates in the global dd/MM/yyyy format.
export type ReCalculateBody = {
  reSyncStudents: boolean
  selectAll: boolean
  startDate: string
  endDate: string
  modelIds: number[]
}

export type EngagementModelSort = { column: 'modelName' | 'isActive'; dir: 'asc' | 'desc' }
