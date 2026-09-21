import type { Metadata } from 'next'
import { ActivityScreen } from '@/features/users/activity/ActivityScreen'

export const metadata: Metadata = {
  title: 'Activity - SEAtS Admin',
}

export default function ActivityPage() {
  return <ActivityScreen />
}
