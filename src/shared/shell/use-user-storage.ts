'use client'

import { useEffect, useMemo, useState } from 'react'
import { createUserStorage, readLastUserId, rememberLastUserId, type UserStorage } from '@/shared/storage'
import { useSessionHeader } from './use-shell-data'

// Per-user storage for the signed-in user. Only the legacy layout HTML carries the user id, so the last
// signed-in id is used until the header arrives (sign-out clears it); null when no id is known at all.
export function useUserStorage(): UserStorage | null {
  const headerUserId = useSessionHeader()?.userId ?? null
  const [lastUser] = useState(() => (typeof window === 'undefined' ? null : readLastUserId()))
  const userId = headerUserId ?? lastUser

  useEffect(() => {
    if (headerUserId) rememberLastUserId(headerUserId)
  }, [headerUserId])

  return useMemo(() => (userId ? createUserStorage(userId) : null), [userId])
}
