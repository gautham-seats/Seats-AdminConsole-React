import type { Metadata } from 'next'
import { NotActiveScreen } from '@/features/errors/ErrorPages'

export const metadata: Metadata = {
  title: 'Account Inactive - SEAtS Admin',
}

export default function NotActivePage() {
  return <NotActiveScreen />
}
