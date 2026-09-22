'use client'

import { useMemo } from 'react'
import { DEVICES_GROUP } from '@/shared/shell/admin-menu'
import type { WorkspaceSection } from '@/shared/shell/AreaWorkspace'
import { useProfile } from '@/shared/shell/profile'
import { isDevicesTextKey, useDevicesText } from './index/devices-text'

// Views/Device/Index.cshtml:53-65: each Devices-area section shows only with its own permission.
export function useDevicesSections(): WorkspaceSection[] {
  const profile = useProfile()
  const t = useDevicesText()
  return useMemo(
    () =>
      DEVICES_GROUP.filter(section => !section.permission || profile.can(section.permission)).map(
        section => ({
          ...section,
          label:
            section.labelKey && isDevicesTextKey(section.labelKey) ? t(section.labelKey) : section.fallback,
        }),
      ),
    [profile, t],
  )
}
