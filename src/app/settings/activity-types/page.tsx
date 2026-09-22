import type { Metadata } from 'next'
import { ActivityTypesScreen } from '@/features/settings/activity-types/ActivityTypesScreen'

export const metadata: Metadata = {
  title: 'Activity Types - SEAtS Admin',
}

export default function ActivityTypesPage() {
  return <ActivityTypesScreen />
}
