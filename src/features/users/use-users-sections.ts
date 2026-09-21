'use client'

import { useMemo } from 'react'
import { USERS_GROUP } from '@/shared/shell/admin-menu'
import type { WorkspaceSection } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { isUsersTextKey, useUsersText } from './index/users-text'

// Views/User/Index.cshtml:8-38: each Users-area section shows only with its own permission.
export function useUsersSections(): WorkspaceSection[] {
  const profile = useProfile()
  const t = useUsersText()
  return useMemo(
    () =>
      USERS_GROUP.filter(section => !section.permission || profile.can(section.permission)).map(section => ({
        ...section,
        label: section.labelKey && isUsersTextKey(section.labelKey) ? t(section.labelKey) : section.fallback,
      })),
    [profile, t],
  )
}
