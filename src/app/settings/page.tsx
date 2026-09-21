import type { Metadata } from 'next'
import { SettingsScreen } from '@/features/settings/general/SettingsScreen'

export const metadata: Metadata = {
  title: 'Settings - SEAtS Admin',
}

export default function SettingsPage() {
  return <SettingsScreen />
}
