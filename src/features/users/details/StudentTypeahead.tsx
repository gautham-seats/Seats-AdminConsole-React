'use client'

import { GraduationCap } from 'lucide-react'
import type { ApiError } from '@/shared/api'
import { LookupTypeahead } from './LookupTypeahead'
import { searchStudents } from './user-details-api'

export type StudentTypeaheadProps = {
  id: string
  label: string
  placeholder: string
  description: string
  invalid: boolean
  describedBy?: string
  onTextChange: (text: string) => void
  onSelect: (id: number, description: string) => void
  onCommit: () => void
  onError: (error: ApiError) => void
}

// swapp.js:811 passes limit 10, which the plugin ignores; its default of 8 applies (bootstrap3-typeahead.js:360).
export function StudentTypeahead({ description, onSelect, ...props }: StudentTypeaheadProps) {
  return (
    <LookupTypeahead
      {...props}
      text={description}
      icon={GraduationCap}
      cacheKey="students"
      maxResults={8}
      search={searchStudents}
      onSelect={item => onSelect(item.id, item.description ?? '')}
    />
  )
}
