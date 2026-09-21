import type { Metadata } from 'next'
import { ImportScreen } from '@/features/data/import/ImportScreen'

export const metadata: Metadata = {
  title: 'Imports - SEAtS Admin',
}

export default function ImportsPage() {
  return <ImportScreen />
}
