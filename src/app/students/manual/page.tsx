import type { Metadata } from 'next'
import { ManualStudentDeletionScreen } from '@/features/students/StudentScreens'

export const metadata: Metadata = {
  title: 'Manual Student Deletion - SEAtS Admin',
}

export default function ManualStudentDeletionPage() {
  return <ManualStudentDeletionScreen />
}
