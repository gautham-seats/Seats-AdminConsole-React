import type { Metadata } from 'next'
import { ReadingsReportScreen } from '@/features/devices/readings/ReadingsReportScreen'

export const metadata: Metadata = {
  title: 'Readings Report - SEAtS Admin',
}

export default function Page() {
  return <ReadingsReportScreen />
}
