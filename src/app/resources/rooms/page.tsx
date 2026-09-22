import type { Metadata } from 'next'
import { RoomsIndexScreen } from '@/features/devices/rooms/RoomsIndexScreen'

export const metadata: Metadata = {
  title: 'Room - SEAtS Admin',
}

export default function RoomsPage() {
  return <RoomsIndexScreen />
}
