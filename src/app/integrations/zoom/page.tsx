import type { Metadata } from 'next'
import { ZoomReturnScreen } from '@/features/integration/ZoomReturnScreen'

export const metadata: Metadata = {
  title: 'Integrations - SEAtS Admin',
}

// The OAuth code is deliberately not read: linking completes on the legacy Admin (see D-109).
export default function ZoomReturnPage() {
  return <ZoomReturnScreen />
}
