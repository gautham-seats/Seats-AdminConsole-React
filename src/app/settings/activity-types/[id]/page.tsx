import type { Metadata } from 'next'
import { ActivityTypeDetailsScreen } from '@/features/settings/activity-types/ActivityTypeDetailsScreen'

export const metadata: Metadata = {
  title: 'Activity Types - SEAtS Admin',
}

export default async function ActivityTypeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numeric = Number(id)
  return <ActivityTypeDetailsScreen id={Number.isInteger(numeric) && numeric > 0 ? numeric : 0} />
}
