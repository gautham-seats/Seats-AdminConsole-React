import type { Metadata } from 'next'
import { JobScheduleDetailsScreen } from '@/features/operations/job-schedule/JobScheduleDetailsScreen'

export const metadata: Metadata = {
  title: 'Job Schedule - SEAtS Admin',
}

export default async function JobScheduleDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numeric = Number(id)
  return <JobScheduleDetailsScreen id={Number.isInteger(numeric) && numeric > 0 ? numeric : 0} />
}
