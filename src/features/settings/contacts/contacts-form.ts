import type { ContactDto } from '@/types/contacts'

// seats-admin-contact.html:241-277 and :415-429.
export const NAME_MAX_LENGTH = 300
export const MAIL_MAX_LENGTH = 50
export const CONTACT_PAGE_SIZES = [10, 20, 30, 50, 100, 200] as const
export const CONTACT_DEFAULT_PAGE_SIZE = 100

export type ContactDraft = { id: number; name: string; mail: string; globalId: string | null }

export const EMPTY_CONTACT: ContactDraft = { id: 0, name: '', mail: '', globalId: null }

const MAIL_PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/

// _validateFormat (:533-558): semicolon-separated addresses, empty parts skipped.
export function isValidMailList(value: string): boolean {
  return value
    .split(/\s*;\s*/)
    .filter(Boolean)
    .every(part => MAIL_PATTERN.test(part))
}

export type ContactError = {
  field: 'name' | 'mail'
  messageKey: 'NameIsRequired' | 'EmailIsRequired' | 'EmailValidationMessage'
}

// Same order as legacy _save (:488-504).
export function validateContact(draft: ContactDraft): ContactError | null {
  if (!draft.name) return { field: 'name', messageKey: 'NameIsRequired' }
  if (!draft.mail) return { field: 'mail', messageKey: 'EmailIsRequired' }
  if (!isValidMailList(draft.mail)) return { field: 'mail', messageKey: 'EmailValidationMessage' }
  return null
}

export function toDraft(contact: ContactDto): ContactDraft {
  return { id: contact.id, name: contact.name ?? '', mail: contact.mail ?? '', globalId: contact.globalId }
}

// POST sends globalId null for a new contact; PUT sends the row's globalId.
export function toContactBody(draft: ContactDraft): ContactDto {
  return {
    id: draft.id,
    name: draft.name,
    mail: draft.mail,
    globalId: draft.id === 0 ? null : draft.globalId,
  }
}
