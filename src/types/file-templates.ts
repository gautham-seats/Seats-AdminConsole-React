// Seats.Trunk.Contracts FileTemplateDto and the FileTemplateApi details envelope (camelCase).
export type FileTemplateDto = {
  id: number
  name: string | null
  comment: string | null
  fileName: string | null
  contentFile: string | null
  fileTemplateTypeId: number
  fileTemplateTypeDescription: string | null
  subject: string | null
  externalFileName: string | null
  dateCreated: string | null
  size: number
}

export type FileTemplateTypeDto = {
  id: number
  description: string
  className: string | null
  setDynamicType: boolean
}

export type TypeValuesDto = {
  className: string
  values: string[]
}

export type FileTemplateDetailsDto = {
  detail: FileTemplateDto
  fileTemplateTypeAvailables: FileTemplateTypeDto[]
  typeValuesAvailables: TypeValuesDto[]
}

export type GlobalListItemDto = {
  id: number
  description: string
  globalId: string | null
  visible: boolean
}
