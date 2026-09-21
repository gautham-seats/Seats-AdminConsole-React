import {
  ENTITY_TYPE,
  SEND_EMAILS_TO,
  type ContactGroupDetailViewModel,
  type ContactGroupMemberDto,
  type ContactGroupViewModel,
  type FunctionDto,
  type SendEmailsToOptionDto,
} from '@/types/contact-groups'

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE]

// contactGroupDetailsController.js:267-312 and Details.cshtml:101-156: the id field each entity type fills.
export const ENTITY_FIELD = {
  [ENTITY_TYPE.courses]: 'courseId',
  [ENTITY_TYPE.faculties]: 'facultyId',
  [ENTITY_TYPE.modules]: 'moduleId',
  [ENTITY_TYPE.programmes]: 'programmeId',
  [ENTITY_TYPE.schools]: 'schoolId',
} as const satisfies Record<EntityType, keyof ContactGroupDetailViewModel>

export type ContactGroupForm = {
  name: string
  description: string
  groupEmailAddress: string
  sendEmailsToTypeId: number | null
  functionId: number | null
  functionName: string | null
  entityId: EntityType | null
  entityValueId: number | null
  associatedToDescription: string
  members: ContactGroupMemberDto[]
  // contactGroupDetailsController.js:456 counts every loaded member until the first email or member change.
  countAllMembers: boolean
}

export type ContactGroupField =
  'name' | 'description' | 'groupEmailAddress' | 'sendEmailsToTypeId' | 'functionName' | 'entity'
export type ContactGroupErrors = Partial<Record<ContactGroupField, 'required' | 'specialCharacters'>>

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const int = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

export const isEntityType = (value: number | null): value is EntityType =>
  value !== null && Object.values(ENTITY_TYPE).some(type => type === value)

export function parseMember(raw: unknown): ContactGroupMemberDto | null {
  const r = record(raw)
  if (typeof r.id !== 'number') return null
  return {
    id: r.id,
    userName: text(r.userName),
    fullName: text(r.fullName),
    displayName: text(r.displayName),
    emailAddress: text(r.emailAddress),
  }
}

export function parseContactGroupView(raw: unknown): ContactGroupViewModel {
  const root = record(raw)
  const d = record(root.detail)
  const list = (value: unknown) => (Array.isArray(value) ? value : [])
  return {
    detail: {
      id: int(d.id) ?? 0,
      name: text(d.name),
      description: text(d.description),
      userIdsInContactGroup: Array.isArray(d.userIdsInContactGroup)
        ? d.userIdsInContactGroup.filter((id): id is number => typeof id === 'number')
        : null,
      groupEmailAddress: text(d.groupEmailAddress),
      associatedTo: int(d.associatedTo),
      associatedToDescription: text(d.associatedToDescription),
      sendEmailsToTypeId: int(d.sendEmailsToTypeId),
      functionId: int(d.functionId),
      functionName: text(d.functionName),
      entityId: int(d.entityId),
      facultyId: int(d.facultyId),
      schoolId: int(d.schoolId),
      programmeId: int(d.programmeId),
      courseId: int(d.courseId),
      moduleId: int(d.moduleId),
    },
    users: Array.isArray(root.users)
      ? root.users.map(parseMember).filter((m): m is ContactGroupMemberDto => m !== null)
      : null,
    sendEmailToAvailables: list(root.sendEmailToAvailables).flatMap(item => {
      const r = record(item)
      return typeof r.id === 'number'
        ? [{ id: r.id, description: text(r.description), visible: r.visible === true }]
        : []
    }),
    entityAvailables: list(root.entityAvailables).flatMap(item => {
      const r = record(item)
      return typeof r.id === 'number' ? [{ id: r.id, description: text(r.description) }] : []
    }),
    functionAvailables: list(root.functionAvailables).flatMap(item => {
      const r = record(item)
      return typeof r.id === 'number' ? [{ id: r.id, name: text(r.name) }] : []
    }),
  }
}

export function toContactGroupForm(view: ContactGroupViewModel): ContactGroupForm {
  const { detail } = view
  const entityId = isEntityType(detail.entityId) ? detail.entityId : null
  return {
    name: detail.name ?? '',
    description: detail.description ?? '',
    groupEmailAddress: detail.groupEmailAddress ?? '',
    sendEmailsToTypeId: detail.sendEmailsToTypeId,
    functionId: detail.functionId,
    // ContactGroupApiController.cs:90-110 never fills functionName; take it from the function list (LB-021).
    functionName:
      detail.functionName ??
      view.functionAvailables.find(item => item.id === detail.functionId)?.name ??
      null,
    entityId,
    entityValueId: entityId === null ? null : detail[ENTITY_FIELD[entityId]],
    associatedToDescription: detail.associatedToDescription ?? '',
    members: view.users ?? [],
    countAllMembers: true,
  }
}

// contactGroupDetailsController.js:116-122 address rule.
const EMAIL =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

export const isValidEmail = (value: string | null | undefined): boolean => Boolean(value && EMAIL.test(value))

// knockout.validation.debug.js:525-534 email rule on the group address; empty counts as valid.
const KO_EMAIL =
  /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i

export const isKnockoutEmail = (value: string): boolean => value === '' || KO_EMAIL.test(value)

// contactGroupDetailsController.js:190-201: the option flag named `visible` actually disables it (Details.cshtml:69, 101-104).
export function sendOptionDisabled(option: SendEmailsToOptionDto, form: ContactGroupForm): boolean {
  const invalidEmail = form.groupEmailAddress === '' || !isKnockoutEmail(form.groupEmailAddress)
  const members = form.countAllMembers
    ? form.members
    : form.members.filter(member => isValidEmail(member.emailAddress))
  const noMembers = members.length === 0
  if (option.id === SEND_EMAILS_TO.groupEmail) return invalidEmail
  if (option.id === SEND_EMAILS_TO.individualMembers) return noMembers
  if (option.id === SEND_EMAILS_TO.groupEmailAndMembers) return invalidEmail || noMembers
  return false
}

// contactGroupDetailsController.js:40-64: changing the function or entity clears the association.
export function withFunction(
  form: ContactGroupForm,
  functions: readonly FunctionDto[],
  functionId: number | null,
) {
  return {
    ...form,
    functionId,
    functionName: functions.find(item => item.id === functionId)?.name ?? '',
    entityId: null,
    entityValueId: null,
    associatedToDescription: '',
  }
}

export function withEntity(form: ContactGroupForm, entityId: EntityType | null): ContactGroupForm {
  return { ...form, entityId, entityValueId: null, associatedToDescription: '' }
}

// contactGroupDetailsController.js:107-114: typing the group email recounts members with valid emails.
export function withGroupEmail(form: ContactGroupForm, groupEmailAddress: string): ContactGroupForm {
  return { ...form, groupEmailAddress, countAllMembers: false }
}

export function addMember(form: ContactGroupForm, member: ContactGroupMemberDto): ContactGroupForm {
  const members = form.members.some(current => current.id === member.id)
    ? form.members
    : [...form.members, member]
  return { ...form, members, countAllMembers: false }
}

export function removeMembers(form: ContactGroupForm, ids: ReadonlySet<number>): ContactGroupForm {
  return { ...form, members: form.members.filter(member => !ids.has(member.id)), countAllMembers: false }
}

// contactGroupDetailsController.js:365-397: a saved function is selected and a deleted one cleared.
export function upsertFunction(functions: readonly FunctionDto[], saved: FunctionDto): FunctionDto[] {
  return functions.some(item => item.id === saved.id)
    ? functions.map(item => (item.id === saved.id ? saved : item))
    : [...functions, saved]
}

const SPECIAL = /[<>]/

// Details.cshtml:108-153 binds Required to isValid(), so it shows before any Save.
export const entityRequired = (form: ContactGroupForm): boolean =>
  form.functionId !== null && form.entityId !== null && form.entityValueId === null

// swapp.js:493-529 required rules plus the special character rule Save adds to every text field.
export function validateContactGroup(
  form: ContactGroupForm,
  checkSpecialCharacters = true,
): ContactGroupErrors {
  const errors: ContactGroupErrors = {}
  const special = (value: string | null) => checkSpecialCharacters && value !== null && SPECIAL.test(value)
  if (!form.name.trim()) errors.name = 'required'
  else if (special(form.name)) errors.name = 'specialCharacters'
  if (special(form.description)) errors.description = 'specialCharacters'
  if (special(form.groupEmailAddress)) errors.groupEmailAddress = 'specialCharacters'
  if (form.sendEmailsToTypeId === null) errors.sendEmailsToTypeId = 'required'
  // swapp.js:506-529 extends every detail observable, so the unbound functionName blocks Save too.
  if (special(form.functionName)) errors.functionName = 'specialCharacters'
  if (entityRequired(form)) errors.entity = 'required'
  else if (special(form.associatedToDescription)) errors.entity = 'specialCharacters'
  return errors
}

// ko.toJSON(detail) posted to api/ContactGroupApi (contactGroupDetailsController.js:215-236).
export function toContactGroupPayload(form: ContactGroupForm, detail: ContactGroupDetailViewModel) {
  const entityValue = (type: EntityType) => (form.entityId === type ? form.entityValueId : null)
  return {
    ...detail,
    name: form.name,
    description: form.description,
    groupEmailAddress: form.groupEmailAddress,
    sendEmailsToTypeId: form.sendEmailsToTypeId,
    functionId: form.functionId,
    functionName: form.functionName,
    entityId: form.entityId,
    courseId: entityValue(ENTITY_TYPE.courses),
    facultyId: entityValue(ENTITY_TYPE.faculties),
    moduleId: entityValue(ENTITY_TYPE.modules),
    programmeId: entityValue(ENTITY_TYPE.programmes),
    schoolId: entityValue(ENTITY_TYPE.schools),
    // contactGroupDetailsController.js:52-60 cleared this to null, so an empty box must not store "".
    associatedToDescription: form.associatedToDescription || null,
    userIdsInContactGroup: form.members.map(member => member.id),
  }
}

export type ContactGroupPayload = ReturnType<typeof toContactGroupPayload>
