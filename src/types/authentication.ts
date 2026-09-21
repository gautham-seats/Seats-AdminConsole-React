// AuthenticationViewModel (Seats.Trunk.Admin/ViewModels/Authentication) over CustomAuthenticationRequest.
// AuthenticationApiController serialises it by hand, so names stay PascalCase.
export type AuthenticationDomainDto = {
  Id: number
  SiteTypeId: number
  SiteType: string | null
  Url: string | null
  Thumbprint: string | null
  FederationMetadata: string | null
  Realm: string | null
  IdentityIssuer: string | null
  IssuerAuthority: string | null
}

export type AuthenticationDto = {
  EnvironmentId: number
  ClientId: number
  AuthProtocol: string | null
  SeatsAuthorisationByPersonas: string | null
  SpecificUserIdentifierClaim: string | null
  SpecificGroupClaim: string | null
  SeatsAuthenticationByOurIdentityProvider: string | null
  AuthHomeRealm: string | null
  AuthSpecificLogoutUrl: string | null
  Domains: AuthenticationDomainDto[] | null
  AuthenticationBy: string | null
}
