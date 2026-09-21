import type { Metadata } from 'next'
import { IntegrationsScreen } from '@/features/integration/IntegrationsScreen'

export const metadata: Metadata = {
  title: 'Integrations - SEAtS Admin',
}

export default function IntegrationsPage() {
  return <IntegrationsScreen />
}
