import type { Metadata } from 'next'
import { NotAuthorisedScreen } from '@/features/errors/ErrorPages'

export const metadata: Metadata = {
  title: 'Not Authorised - SEAtS Admin',
}

export default function NotAuthorisedPage() {
  return <NotAuthorisedScreen />
}
