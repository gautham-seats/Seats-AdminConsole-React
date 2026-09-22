import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WorkflowAdminScreen } from '@/features/case/workflow-admin/WorkflowAdminScreen'
import Loading from '../loading'

export const metadata: Metadata = {
  title: 'Workflow Admin - SEAtS Admin',
}

// The screen reads ?workflow= and ?node= with useSearchParams, which next build only accepts under Suspense.
export default function CasePage() {
  return (
    <Suspense fallback={<Loading />}>
      <WorkflowAdminScreen />
    </Suspense>
  )
}
