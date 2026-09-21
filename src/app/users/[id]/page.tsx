import type { Metadata } from 'next'
import { UserDetailsScreen } from '@/features/users/details/UserDetailsScreen'

export const metadata: Metadata = {
  title: 'User - SEAtS Admin',
}

export default async function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <UserDetailsScreen idParam={id} />
}
