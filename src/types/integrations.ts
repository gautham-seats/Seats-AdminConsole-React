// ExistIntegrationAccountDto from GET api/IntegrationApi/ZoomTenantLinked (IntegrationApiController.cs:112-114).
export type ExistIntegrationAccountDto = {
  exist: boolean
  sameUser: boolean
}

export type ZoomLinkState = 'notLinked' | 'linkedByMe' | 'linkedByOther'
