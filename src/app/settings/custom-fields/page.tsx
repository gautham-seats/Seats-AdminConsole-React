import type { Metadata } from 'next'
import { CustomFieldsScreen } from '@/features/settings/custom-fields/CustomFieldsScreen'

export const metadata: Metadata = {
  title: 'Custom Fields - SEAtS Admin',
}

export default function CustomFieldsPage() {
  return <CustomFieldsScreen />
}
