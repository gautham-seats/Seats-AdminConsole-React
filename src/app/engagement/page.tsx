import type { Metadata } from 'next'
import { EngagementConfigurationScreen } from '@/features/engagement/configuration/EngagementConfigurationScreen'

export const metadata: Metadata = {
  title: 'Engagement - SEAtS Admin',
}

export default function EngagementPage() {
  return <EngagementConfigurationScreen />
}
