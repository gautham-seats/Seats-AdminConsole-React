import type { Metadata } from 'next'
import { EngagementHistoryScreen } from '@/features/engagement/history/EngagementHistoryScreen'

export const metadata: Metadata = {
  title: 'Engagement History - SEAtS Admin',
}

export default function EngagementHistoryPage() {
  return <EngagementHistoryScreen />
}
