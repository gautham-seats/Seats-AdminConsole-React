import type { Metadata } from 'next'
import { UsersIndexScreen } from '@/features/users/index/UsersIndexScreen'

export const metadata: Metadata = {
  title: 'Users - SEAtS Admin',
}

export default function UsersPage() {
  return <UsersIndexScreen />
}
