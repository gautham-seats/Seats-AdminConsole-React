import type { Metadata } from 'next'
import { SuspiciousReadingsReportScreen } from '@/features/devices/readings/SuspiciousReadingsReportScreen'

export const metadata: Metadata = {
  title: 'Suspicious Readings Report - SEAtS Admin',
}

export default function Page() {
  return <SuspiciousReadingsReportScreen />
}
