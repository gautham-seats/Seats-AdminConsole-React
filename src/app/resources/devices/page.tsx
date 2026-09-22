import type { Metadata } from 'next'
import { DevicesIndexScreen } from '@/features/devices/index/DevicesIndexScreen'

export const metadata: Metadata = {
  title: 'Devices - SEAtS Admin',
}

export default function DevicesPage() {
  return <DevicesIndexScreen />
}
