// ResourceApiController getResources / GetResourcesByString rows (camelCase).
export type ResourceTextDto = {
  id: number
  key: string
  cultureName: string | null
  type: string | null
  value: string | null
}

export type ResourceTypeDto = {
  id: number
  description: string
  globalId: string | null
  visible: boolean
}
