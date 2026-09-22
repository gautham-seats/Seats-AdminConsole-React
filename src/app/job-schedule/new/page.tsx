import type { Metadata } from 'next'
import { JobScheduleDetailsScreen } from '@/features/operations/job-schedule/JobScheduleDetailsScreen'

export const metadata: Metadata = {
  title: 'Job Schedule - SEAtS Admin',
}

export default function NewJobSchedulePage() {
  return <JobScheduleDetailsScreen id={0} />
}
