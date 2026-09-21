import type { AuthenticationDomainDto, AuthenticationDto } from '@/types/authentication'

// Options exactly as seats-admin-authentication.html:285-313.
export const AUTHENTICATION_BY = ['SEAtS', 'Other'] as const
export const PROTOCOLS = [
  { value: 'saml', label: 'SAML' },
  { value: 'wsfed', label: 'WS-FED' },
] as const
// Personas "true" is shown as "No" claim-based authorisation, "false" as "Yes".
export const PERSONAS = [
  { value: 'true', label: 'No' },
  { value: 'false', label: 'Yes' },
] as const

export const TEXT_MAX_LENGTH = 200

export type AuthenticationTextField =
  'SpecificUserIdentifierClaim' | 'SpecificGroupClaim' | 'AuthHomeRealm' | 'AuthSpecificLogoutUrl'

export type DomainTextField =
  'Thumbprint' | 'FederationMetadata' | 'Realm' | 'IdentityIssuer' | 'IssuerAuthority'

// Legacy hides the provider settings only when the value is exactly "SEAtS".
export function usesOtherProvider(model: AuthenticationDto): boolean {
  return model.AuthenticationBy !== 'SEAtS'
}

export function setDomainField(
  model: AuthenticationDto,
  index: number,
  field: DomainTextField,
  value: string,
): AuthenticationDto {
  const domains = (model.Domains ?? []).map((domain, position): AuthenticationDomainDto =>
    position === index ? { ...domain, [field]: value } : domain,
  )
  return { ...model, Domains: domains }
}
