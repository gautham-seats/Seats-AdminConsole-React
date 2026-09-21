import type { Metadata } from 'next'
import { ContactGroupDetailsScreen } from '@/features/users/contact-groups/ContactGroupDetailsScreen'

export const metadata: Metadata = {
  title: 'Contact Group - SEAtS Admin',
}

export default async function ContactGroupDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ContactGroupDetailsScreen idParam={id} />
}
