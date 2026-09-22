import type { Metadata } from 'next'
import { JobSchedulesScreen } from '@/features/operations/job-schedule/JobSchedulesScreen'

export const metadata: Metadata = {
  title: 'Job Schedule - SEAtS Admin',
}

export default function JobSchedulePage() {
  return <JobSchedulesScreen />
}
