'use client'

import { useCallback, useMemo } from 'react'
import { useResources } from '@/shared/resources'

// Resource text with an English fallback when the key is missing, empty or still loading.
export function useScreenText<T extends Record<string, string>>(fallbacks: T) {
  const keys = useMemo(() => Object.keys(fallbacks), [fallbacks])
  const { text } = useResources(keys)
  return useCallback(
    (key: keyof T & string) => {
      const value = text(key)
      return value && value !== key ? value : fallbacks[key]
    },
    [text, fallbacks],
  )
}

export type ScreenText<T extends Record<string, string>> = (key: keyof T & string) => string
