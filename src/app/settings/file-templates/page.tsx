import type { Metadata } from 'next'
import { FileTemplatesScreen } from '@/features/settings/file-templates/FileTemplatesScreen'

export const metadata: Metadata = {
  title: 'File Template - SEAtS Admin',
}

export default function FileTemplatesPage() {
  return <FileTemplatesScreen />
}
