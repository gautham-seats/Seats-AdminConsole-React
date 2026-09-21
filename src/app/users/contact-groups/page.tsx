import type { Metadata } from 'next'
import { ContactGroupsScreen } from '@/features/users/contact-groups/ContactGroupsScreen'

export const metadata: Metadata = {
  title: 'Contact Group - SEAtS Admin',
}

export default function ContactGroupsPage() {
  return <ContactGroupsScreen />
}
