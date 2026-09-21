import type { Metadata } from 'next'
import { UserNotificationsScreen } from '@/features/notifications/UserNotificationsScreen'

export const metadata: Metadata = {
  title: 'User Notifications - SEAtS Admin',
}

export default function NotificationsPage() {
  return <UserNotificationsScreen />
}
