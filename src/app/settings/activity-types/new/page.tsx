import type { Metadata } from 'next'
import { ActivityTypeDetailsScreen } from '@/features/settings/activity-types/ActivityTypeDetailsScreen'

export const metadata: Metadata = {
  title: 'Activity Types - SEAtS Admin',
}

export default function NewActivityTypePage() {
  return <ActivityTypeDetailsScreen id={0} />
}
