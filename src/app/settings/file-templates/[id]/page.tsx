import type { Metadata } from 'next'
import { FileTemplateDetailsScreen } from '@/features/settings/file-templates/FileTemplateDetailsScreen'

export const metadata: Metadata = {
  title: 'File Template - SEAtS Admin',
}

export default async function FileTemplateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numeric = Number(id)
  return <FileTemplateDetailsScreen id={Number.isInteger(numeric) && numeric > 0 ? numeric : 0} />
}
