'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUserStorage } from './use-user-storage'

type Update = boolean | ((value: boolean) => boolean)

const parseFlag = (value: unknown) => (typeof value === 'boolean' ? value : null)
// A true/false UI preference kept per signed-in user (docs/decisions.md D-009).
export function useRememberedFlag(key: string, fallback = false): [boolean, (update: Update) => void] {
  const storage = useUserStorage()
  const stored = useMemo(() => storage?.read(key, parseFlag) ?? null, [storage, key])
  const [choice, setChoice] = useState<boolean | null>(null)
  const value = choice ?? stored ?? fallback

  // A choice made before the user id was known is written as soon as the id arrives, not lost.
  useEffect(() => {
    if (storage && choice !== null) storage.write(key, choice)
  }, [storage, key, choice])

  const update = useCallback(
    (next: Update) => {
      const resolved = typeof next === 'function' ? next(value) : next
      setChoice(resolved)
      storage?.write(key, resolved)
    },
    [key, storage, value],
  )

  return [value, update]
}
