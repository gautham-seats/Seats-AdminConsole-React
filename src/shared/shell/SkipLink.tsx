'use client'

export const SKIP_EN = { skipToContent: 'Skip to main content' }

// The href alone still jumps without JS; the click moves focus, which fragment navigation does not do reliably.
export function SkipLink({ mainId }: { mainId: string }) {
  return (
    <a
      href={`#${mainId}`}
      onClick={() => document.getElementById(mainId)?.focus()}
      className="sr-only rounded-b-lg bg-white px-4 py-2 text-sm font-semibold text-brand shadow-lg ring-2 ring-brand focus-visible:not-sr-only focus-visible:absolute focus-visible:top-0 focus-visible:left-4 focus-visible:z-[100] focus-visible:outline-none"
    >
      {SKIP_EN.skipToContent}
    </a>
  )
}
