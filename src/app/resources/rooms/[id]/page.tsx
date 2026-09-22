import type { Metadata } from 'next'
import { RoomDetailsScreen } from '@/features/devices/rooms/RoomDetailsScreen'

export const metadata: Metadata = {
  title: 'Room Details - SEAtS Admin',
}

export default async function RoomDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <RoomDetailsScreen idParam={id} />
}
