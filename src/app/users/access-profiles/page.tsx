import type { Metadata } from 'next'
import { AccessProfilesScreen } from '@/features/users/access-profiles/AccessProfilesScreen'

export const metadata: Metadata = {
  title: 'Access Profile - SEAtS Admin',
}

export default function AccessProfilesPage() {
  return <AccessProfilesScreen />
}
