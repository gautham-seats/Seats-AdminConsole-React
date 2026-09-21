// CustomFieldGroupApiController serialises groups by hand, so names stay PascalCase.
export type SchemaFieldDto = {
  Id: string
  Name: string | null
  DataType: number
  SensitivityLevel: number
  Options: string[] | null
  Visibility: boolean
}

export type CustomFieldGroupDto = {
  Id: number
  GlobalId: string
  EntityType: string | null
  Title: string | null
  SchemaFields: SchemaFieldDto[] | null
}

export type CustomFieldGroupPageDto = {
  Items: CustomFieldGroupDto[] | null
  TotalRowCount: number
}

// POST/PUT body as seats-admin-customfield.html sends it: camelCase, schemaFields as a JSON string.
export type CustomFieldGroupBody = {
  id: number
  globalId: string
  entityType: string
  title: string
  schemaFields: string
}
