'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { api, ApiError, useApiRead, type ReadStatus } from '@/shared/api'
import { hasPermission, normalizeProfile, type Permission, type ProfileItem } from './admin-menu'

export type ProfileState = {
  status: ReadStatus
  error: ApiError | null
  profile: ProfileItem[]
  reload: () => void
  can: (permission: Permission) => boolean
}

const ProfileContext = createContext<ProfileState | null>(null)

// One GetClaims request per page load, shared by the menu and every screen's permission gates.
export function ProfileProvider({ children }: { children: ReactNode }) {
  // A 200 whose body is not the claims array would render the shell locked-down and empty with
  // nothing to retry; it is reported like any other failed read instead.
  const load = useCallback(async (signal: AbortSignal) => {
    const raw = await api.get<unknown>('UserApi/GetClaims', { signal })
    if (!Array.isArray(raw)) throw new ApiError('parse', 'UserApi/GetClaims', 200)
    return normalizeProfile(raw)
  }, [])
  const { data, status, error, reload } = useApiRead('shell-profile', load)
  const value = useMemo<ProfileState>(() => {
    const profile = data ?? []
    return { status, error, profile, reload, can: permission => hasPermission(profile, permission) }
  }, [data, status, error, reload])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile must be used inside ProfileProvider.')
  return value
}
