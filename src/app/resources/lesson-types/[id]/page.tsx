import type { Metadata } from 'next'
import { LessonTypeDetailsScreen } from '@/features/academic/lesson-types/LessonTypeDetailsScreen'

export const metadata: Metadata = {
  title: 'Lesson Type - SEAtS Admin',
}

export default async function LessonTypeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <LessonTypeDetailsScreen idParam={id} />
}
