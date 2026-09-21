import type { Metadata } from 'next'
import { DeveloperKeysScreen } from '@/features/users/developer-keys/DeveloperKeysScreen'

export const metadata: Metadata = {
  title: 'Developer Key - SEAtS Admin',
}

export default function DeveloperKeysPage() {
  return <DeveloperKeysScreen />
}
