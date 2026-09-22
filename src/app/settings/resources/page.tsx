import type { Metadata } from 'next'
import { ResourcesScreen } from '@/features/settings/resources/ResourcesScreen'

export const metadata: Metadata = {
  title: 'Resources - SEAtS Admin',
}

export default function ResourcesPage() {
  return <ResourcesScreen />
}
