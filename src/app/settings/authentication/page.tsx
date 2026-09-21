import type { Metadata } from 'next'
import { AuthenticationScreen } from '@/features/settings/authentication/AuthenticationScreen'

export const metadata: Metadata = {
  title: 'Authentication - SEAtS Admin',
}

export default function AuthenticationPage() {
  return <AuthenticationScreen />
}
