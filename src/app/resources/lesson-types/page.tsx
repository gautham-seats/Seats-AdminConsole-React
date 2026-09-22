import type { Metadata } from 'next'
import { LessonTypesScreen } from '@/features/academic/lesson-types/LessonTypesScreen'

export const metadata: Metadata = {
  title: 'Lesson Type - SEAtS Admin',
}

export default function LessonTypesPage() {
  return <LessonTypesScreen />
}
