import type {
  SecurityLevel,
  SimpleListItemDto,
  UserDetailsViewModel,
  UserDto,
  UserPersonDto,
  UserSecurityLevelPermissionOverviewDto,
  UserSecurityLevelPermissionToProcessDto,
} from '@/types/users'
import { parseToProcess, SECURITY_LEVELS } from './security-levels'

export type PersonaRow = {
  key: string
  id: number
  accessProfileId: number | null
  order: number
  userId: string | null
}

export type UserForm = {
  userName: string
  fullName: string
  emailAddress: string
  accountActive: boolean
  isMobileAppLoggingActive: boolean
  setPassword: string
  passwordConfirmation: string
  studentId: number | null
  studentDescription: string
  personas: PersonaRow[]
  isSuperUser: boolean
  isOwnClasses: boolean
  levelOverview: Record<SecurityLevel, string | null>
  toProcess: UserSecurityLevelPermissionToProcessDto[] | null
}

export type FieldError =
  | 'required'
  | 'passwordRequired'
  | 'confirmRequired'
  | 'specialCharacters'
  | 'passwordPolicy'
  | 'passwordConfirmation'
  | 'studentNotSelected'

export type FormField =
  'userName' | 'fullName' | 'emailAddress' | 'setPassword' | 'passwordConfirmation' | 'student'

export type FormErrors = Partial<Record<FormField, FieldError>>

export type PersonasError = 'accessProfileRequired' | 'accessProfileDuplicate'

const asText = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const asNumber = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback)
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

function toList(raw: unknown): SimpleListItemDto[] {
  return Array.isArray(raw)
    ? raw.flatMap(item => {
        const record = asRecord(item)
        return typeof record.id === 'number'
          ? [{ id: record.id, description: asText(record.description) }]
          : []
      })
    : []
}

function toPersona(raw: unknown): UserPersonDto {
  const record = asRecord(raw)
  return {
    id: asNumber(record.id),
    accessProfileId: asNumber(record.accessProfileId),
    order: asNumber(record.order),
    userId: asText(record.userId),
  }
}

function toOverview(raw: unknown): UserSecurityLevelPermissionOverviewDto | null {
  if (!raw || typeof raw !== 'object') return null
  const record = asRecord(raw)
  return {
    userId: asNumber(record.userId),
    faculty: asText(record.faculty),
    course: asText(record.course),
    programme: asText(record.programme),
    module: asText(record.module),
    school: asText(record.school),
    student: asText(record.student),
    isSuperUser: record.isSuperUser === true,
    isOwnClasses: record.isOwnClasses === true,
  }
}

export function parseUserDetails(raw: unknown): UserDetailsViewModel {
  const root = asRecord(raw)
  const detail = asRecord(root.detail)
  return {
    detail: {
      id: asNumber(detail.id),
      userName: asText(detail.userName),
      setPassword: asText(detail.setPassword),
      accountActive: detail.accountActive === true,
      associatedStudentId: typeof detail.associatedStudentId === 'number' ? detail.associatedStudentId : null,
      associatedStudentDescription: asText(detail.associatedStudentDescription),
      authenticateModeId: asNumber(detail.authenticateModeId),
      isSuperUser: detail.isSuperUser === true,
      seatsAuthorisationByPersonas: detail.seatsAuthorisationByPersonas === true,
      seatsAuthenticationByOurIdentityProvider: detail.seatsAuthenticationByOurIdentityProvider === true,
      emailAddress: asText(detail.emailAddress),
      positionNumber: asText(detail.positionNumber),
      personas: Array.isArray(detail.personas) ? detail.personas.map(toPersona) : null,
      fullName: asText(detail.fullName),
      isMobileAppLoggingActive: detail.isMobileAppLoggingActive === true,
      displayName: asText(detail.displayName),
      userSecurityLevelPermissionToProcess: parseToProcess(detail.userSecurityLevelPermissionToProcess),
    },
    defaultPersonToAdd: toPersona(root.defaultPersonToAdd),
    accessProfileAvailables: toList(root.accessProfileAvailables),
    accessProfileRestricted: Array.isArray(root.accessProfileRestricted)
      ? root.accessProfileRestricted.filter((id): id is number => typeof id === 'number')
      : [],
    accessProfileAll: Array.isArray(root.accessProfileAll) ? toList(root.accessProfileAll) : null,
    userSecurityLevelPermissionOverview: toOverview(root.userSecurityLevelPermissionOverview),
  }
}

let rowSeed = 0
const rowKey = () => `persona-${++rowSeed}`

const byOrder = (left: PersonaRow, right: PersonaRow) => left.order - right.order

// accessProfileId 0 is the unselected "[None]" caption (userDetailsController.js:132).
function toRow(persona: UserPersonDto): PersonaRow {
  return {
    key: rowKey(),
    id: persona.id,
    accessProfileId: persona.accessProfileId > 0 ? persona.accessProfileId : null,
    order: persona.order,
    userId: persona.userId,
  }
}

export function toForm(view: UserDetailsViewModel): UserForm {
  const { detail } = view
  return {
    userName: detail.userName ?? '',
    fullName: detail.fullName ?? '',
    emailAddress: detail.emailAddress ?? '',
    accountActive: detail.accountActive,
    isMobileAppLoggingActive: detail.isMobileAppLoggingActive,
    setPassword: '',
    passwordConfirmation: '',
    studentId: detail.associatedStudentId,
    studentDescription: detail.associatedStudentDescription ?? '',
    personas: (detail.personas ?? []).map(toRow).sort(byOrder),
    isSuperUser: detail.isSuperUser,
    isOwnClasses: Boolean(view.userSecurityLevelPermissionOverview?.isOwnClasses),
    levelOverview: Object.fromEntries(
      SECURITY_LEVELS.map(level => [level, view.userSecurityLevelPermissionOverview?.[level] ?? null]),
    ) as Record<SecurityLevel, string | null>,
    toProcess: detail.userSecurityLevelPermissionToProcess,
  }
}

// userDetailsController.js:11-19: a new persona continues the order after the last one.
export function addPersona(rows: readonly PersonaRow[], template: UserPersonDto): PersonaRow[] {
  const next = toRow(template)
  if (rows.length > 0) next.order = rows[rows.length - 1].order + 1
  return [...rows, next]
}

// userDetailsController.js:34-63 swaps order with the neighbour and re-sorts.
export function movePersona(rows: readonly PersonaRow[], key: string, direction: -1 | 1): PersonaRow[] {
  const index = rows.findIndex(row => row.key === key)
  const neighbour = rows[index + direction]
  if (index < 0 || !neighbour) return [...rows]
  const current = rows[index]
  return rows
    .map(row => {
      if (row.key === current.key) return { ...row, order: neighbour.order }
      if (row.key === neighbour.key) return { ...row, order: current.order }
      return row
    })
    .sort(byOrder)
}

export function removePersona(rows: readonly PersonaRow[], key: string): PersonaRow[] {
  return rows.length > 1 ? rows.filter(row => row.key !== key) : [...rows]
}

export function profileOptions(
  view: UserDetailsViewModel,
  accessProfileId: number | null,
): SimpleListItemDto[] {
  const restricted = accessProfileId !== null && view.accessProfileRestricted.includes(accessProfileId)
  return restricted && view.accessProfileAll ? view.accessProfileAll : view.accessProfileAvailables
}

const SPECIAL_CHARACTERS = /[<>]/

// swapp.js:2601-2618 client password rule.
export function isStrongPassword(value: string): boolean {
  return (
    value.length >= 10 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^a-zA-Z0-9]/.test(value)
  )
}

// GeneralResources.DoesntPassPasswordPolicy says six characters, but the rule it explains needs ten (LB entry).
export const PASSWORD_POLICY_TEXT =
  'Password must be at least ten characters in length and it must contain at least one uppercase alphabet characters (A–Z), one lowercase alphabet characters (a–z), one digit (0–9) and one non-alphanumeric characters (!$#,%).'

// passwordUserNameMatches (swapp.js:2586-2599) compares the raw user name.
const failsPolicy = (password: string, userName: string) =>
  !isStrongPassword(password) || (userName !== '' && password.includes(userName))

// ko.validation required trims strings.
const isBlank = (value: string) => value.trim() === ''

// Rules in legacy order (userDetailsController.js:493-551); the <> rule is appended to every field once Save runs (swapp.js:500-526).
export function validateForm(form: UserForm, detail: UserDto, checkSpecialCharacters = false): FormErrors {
  const errors: FormErrors = {}
  const special = (value: string) => checkSpecialCharacters && SPECIAL_CHARACTERS.test(value)
  const passwordRules = detail.id === 0 && detail.seatsAuthenticationByOurIdentityProvider

  if (isBlank(form.userName)) errors.userName = 'required'
  else if (special(form.userName)) errors.userName = 'specialCharacters'

  if (isBlank(form.fullName)) errors.fullName = 'required'
  else if (special(form.fullName)) errors.fullName = 'specialCharacters'

  if (special(form.emailAddress)) errors.emailAddress = 'specialCharacters'

  if (passwordRules) {
    if (isBlank(form.setPassword)) errors.setPassword = 'passwordRequired'
    else if (failsPolicy(form.setPassword, form.userName)) errors.setPassword = 'passwordPolicy'
    else if (special(form.setPassword)) errors.setPassword = 'specialCharacters'
  }

  // Requirements 8.2: a specific message per empty box; the mismatch rule only once the confirmation has a value.
  if (passwordRules && form.passwordConfirmation === '') errors.passwordConfirmation = 'confirmRequired'
  else if (passwordRules && form.passwordConfirmation !== form.setPassword)
    errors.passwordConfirmation = 'passwordConfirmation'
  else if (special(form.passwordConfirmation)) errors.passwordConfirmation = 'specialCharacters'

  if (form.studentDescription.trim() && form.studentId === null) errors.student = 'studentNotSelected'
  else if (special(form.studentDescription)) errors.student = 'specialCharacters'

  return errors
}

export type PasswordErrors = { password?: FieldError; confirm?: FieldError }

// userDetailsController.js:297-322: required, policy and no user name inside; the confirmation must match.
export function validateNewPassword(password: string, confirm: string, userName: string): PasswordErrors {
  const errors: PasswordErrors = {}
  if (isBlank(password)) errors.password = 'passwordRequired'
  else if (failsPolicy(password, userName)) errors.password = 'passwordPolicy'
  if (confirm === '') errors.confirm = 'confirmRequired'
  else if (confirm !== password) errors.confirm = 'passwordConfirmation'
  return errors
}

// userDetailsController.js:128-143 walks the rows in order and reports the first problem it meets.
export function validatePersonas(form: UserForm, detail: UserDto): PersonasError | null {
  if (!detail.seatsAuthorisationByPersonas) return null
  const rows = form.personas
  for (let i = 0; i < rows.length; i++) {
    for (let j = i; j < rows.length; j++) {
      if (rows[i].accessProfileId === null) return 'accessProfileRequired'
      if (i !== j && rows[i].accessProfileId === rows[j].accessProfileId) return 'accessProfileDuplicate'
    }
  }
  return null
}

// Per-row problem for the inline messages: an empty row, or a later repeat of an earlier profile.
export function personaRowErrors(rows: readonly PersonaRow[]): Map<string, PersonasError> {
  const errors = new Map<string, PersonasError>()
  rows.forEach((row, index) => {
    if (row.accessProfileId === null) errors.set(row.key, 'accessProfileRequired')
    else if (rows.findIndex(other => other.accessProfileId === row.accessProfileId) !== index)
      errors.set(row.key, 'accessProfileDuplicate')
  })
  return errors
}

// Mirrors ko.toJSON(detail) (swapp.js:533) restricted to UserDto fields; text is sent untrimmed.
export function toSavePayload(form: UserForm, detail: UserDto): UserDto {
  const creating = detail.id === 0
  return {
    ...detail,
    userName: form.userName,
    fullName: form.fullName,
    emailAddress: form.emailAddress,
    accountActive: form.accountActive,
    isMobileAppLoggingActive: form.isMobileAppLoggingActive,
    setPassword:
      creating && detail.seatsAuthenticationByOurIdentityProvider && form.setPassword
        ? form.setPassword
        : null,
    associatedStudentId: form.studentId,
    isSuperUser: form.isSuperUser,
    userSecurityLevelPermissionToProcess: form.toProcess,
    associatedStudentDescription: form.studentId === null ? null : form.studentDescription,
    personas:
      detail.personas === null && !detail.seatsAuthorisationByPersonas
        ? null
        : form.personas.map(row => ({
            id: row.id,
            accessProfileId: row.accessProfileId ?? 0,
            order: row.order,
            userId: row.userId,
          })),
  }
}
