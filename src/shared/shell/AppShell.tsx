'use client'

import type { ReactNode } from 'react'
import { FrostTooltips } from '@/shared/ui/FrostTooltips'
import { AccessibilityPrefs } from './AccessibilityPrefs'
import { LeaveDialog } from './LeaveDialog'
import { NavBar } from './NavBar'
import { ProfileProvider } from './profile'
import { RequestPulse } from './RequestPulse'
import { ShortcutsDialog } from './ShortcutsDialog'
import { SKIP_EN, SkipLink } from './SkipLink'
import { TideSplash } from './TideSplash'

export const SHELL_EN = SKIP_EN

const MAIN_ID = 'admin-main'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ProfileProvider>
      <AccessibilityPrefs />
      <TideSplash />
      <FrostTooltips />
      <LeaveDialog />
      <ShortcutsDialog />
      {/* overflow-x-auto, not hidden: at 200% zoom anything still too wide must stay reachable */}
      {/* Below md the whole shell scrolls, so a wrapped nav bar never squeezes the page. */}
      <div className="flex min-h-screen flex-col overflow-x-auto bg-page md:h-screen md:overflow-y-hidden">
        <SkipLink mainId={MAIN_ID} />
        <NavBar />
        <div className="relative flex min-h-0 flex-1 flex-col">
          <RequestPulse />
          <main
            id={MAIN_ID}
            tabIndex={-1}
            className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset md:min-h-0 md:overflow-auto"
          >
            {children}
          </main>
        </div>
      </div>
    </ProfileProvider>
  )
}
