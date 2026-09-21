import type { Metadata } from 'next'
import { MoreScreen } from '@/features/more/MoreScreen'

export const metadata: Metadata = {
  title: 'More - SEAtS Admin',
}

export default function MorePage() {
  return <MoreScreen />
}
