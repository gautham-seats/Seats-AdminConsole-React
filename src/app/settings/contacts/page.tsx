import type { Metadata } from 'next'
import { ContactsScreen } from '@/features/settings/contacts/ContactsScreen'

export const metadata: Metadata = {
  title: 'Contacts - SEAtS Admin',
}

export default function ContactsPage() {
  return <ContactsScreen />
}
