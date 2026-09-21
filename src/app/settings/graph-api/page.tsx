import type { Metadata } from 'next'
import { GraphApiScreen } from '@/features/settings/graph-api/GraphApiScreen'

export const metadata: Metadata = {
  title: 'Graph API - SEAtS Admin',
}

export default function GraphApiPage() {
  return <GraphApiScreen />
}
