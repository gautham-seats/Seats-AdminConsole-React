import type { Metadata } from 'next'
import { DeviceDetailsScreen } from '@/features/devices/details/DeviceDetailsScreen'

export const metadata: Metadata = {
  title: 'Device - SEAtS Admin',
}

export default async function DeviceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DeviceDetailsScreen idParam={id} />
}
