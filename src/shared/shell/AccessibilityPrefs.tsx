'use client'

import { useEffect } from 'react'
import { applyHighContrast } from '@/shared/ui/accessibility-prefs'

// Applies the saved High Contrast choice once per page load; the profile menu re-applies it on Save.
export function AccessibilityPrefs() {
  useEffect(() => applyHighContrast(), [])
  return null
}
