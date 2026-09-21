import { pageEnvelope } from '@/shared/api/page-total'
import { api } from '@/shared/api'
import type { ContactDto } from '@/types/contacts'

export const fetchContacts = async (page: number, pageSize: number, signal: AbortSignal) =>
  pageEnvelope<ContactDto>(
    await api.get<unknown>('ContactApi', { query: { page, pageSize }, signal }),
    'ContactApi',
  )

export const createContact = (contact: ContactDto) => api.post<void>('ContactApi', { body: contact })
export const updateContact = (contact: ContactDto) => api.put<void>('ContactApi', { body: contact })
export const deleteContacts = (ids: readonly number[]) => api.delete<void>('ContactApi', { body: ids })
