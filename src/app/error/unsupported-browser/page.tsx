import type { Metadata } from 'next'
import { UnsupportedBrowserScreen } from '@/features/errors/ErrorPages'

export const metadata: Metadata = {
  title: 'Browser Not Supported - SEAtS Admin',
}

export default function UnsupportedBrowserPage() {
  return <UnsupportedBrowserScreen />
}
