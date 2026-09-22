import type { Metadata } from 'next'
import { RollbackScreen } from '@/features/operations/rollback/RollbackScreen'

export const metadata: Metadata = {
  title: 'Rollback - SEAtS Admin',
}

export default function RollbackPage() {
  return <RollbackScreen />
}
