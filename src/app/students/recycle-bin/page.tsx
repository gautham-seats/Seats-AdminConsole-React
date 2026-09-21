import type { Metadata } from 'next'
import { StudentRecycleBinScreen } from '@/features/students/StudentScreens'

export const metadata: Metadata = {
  title: 'Recycle Bin - SEAtS Admin',
}

export default function StudentRecycleBinPage() {
  return <StudentRecycleBinScreen />
}
