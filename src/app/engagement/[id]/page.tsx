import type { Metadata } from 'next'
import { EngagementModelDetailsScreen } from '@/features/engagement/details/EngagementModelDetailsScreen'

export const metadata: Metadata = {
  title: 'Engagement Model - SEAtS Admin',
}

export default async function EngagementModelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EngagementModelDetailsScreen idParam={id} />
}
