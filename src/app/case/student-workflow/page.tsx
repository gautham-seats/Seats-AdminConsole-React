import type { Metadata } from 'next'
import { StudentWorkflowScreen } from '@/features/case/student-workflow/StudentWorkflowScreen'

export const metadata: Metadata = {
  title: 'Student Workflow - SEAtS Admin',
}

export default function StudentWorkflowPage() {
  return <StudentWorkflowScreen />
}
