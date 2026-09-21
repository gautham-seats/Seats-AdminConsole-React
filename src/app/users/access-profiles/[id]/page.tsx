import type { Metadata } from 'next'
import { AccessProfileDetailsScreen } from '@/features/users/access-profiles/AccessProfileDetailsScreen'

export const metadata: Metadata = {
  title: 'Access Profile - SEAtS Admin',
}

export default async function AccessProfileDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AccessProfileDetailsScreen idParam={id} />
}
