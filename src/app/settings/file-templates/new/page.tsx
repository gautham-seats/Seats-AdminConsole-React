import type { Metadata } from 'next'
import { FileTemplateDetailsScreen } from '@/features/settings/file-templates/FileTemplateDetailsScreen'

export const metadata: Metadata = {
  title: 'File Template - SEAtS Admin',
}

export default function NewFileTemplatePage() {
  return <FileTemplateDetailsScreen id={0} />
}
