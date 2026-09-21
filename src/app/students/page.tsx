import type { Metadata } from 'next'
import { StudentDeletionScreen } from '@/features/students/StudentScreens'

export const metadata: Metadata = {
  title: 'Student Deletion - SEAtS Admin',
}

export default function StudentDeletionPage() {
  return <StudentDeletionScreen />
}
