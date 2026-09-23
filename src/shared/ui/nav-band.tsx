// The Admin band, "Deep lift" (docs/designs/bars.designs-v2.html, chosen 2026-09-23).
// The paint lives in tokens.css so a card header, a table header and a dialog header are the
// same pixels; these names are the only way any screen should reach for it.

// A block surface: card header, dialog header, any div band.
export const NAV_BAND = 'nav-band-surface'

// Table header rows (<thead>) and single sticky header cells (<th>).
export const NAV_BAND_ROW = 'nav-band-row'
export const NAV_BAND_CELL = 'nav-band-cell'

// The round icon chip that sits on a band.
export const NAV_ICON_BOX =
  'rounded-full bg-white/15 text-white ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_6px_14px_-8px_rgba(2,32,56,.95)]'

// Aurora and sweep for a block surface. Table rows carry their own aurora in CSS.
export function NavBandGlow() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [html[data-contrast=high]_&]:hidden"
    >
      <span className="absolute -inset-x-[12%] -inset-y-[46px] animate-aurora bg-[radial-gradient(240px_76px_at_16%_50%,rgba(86,189,234,.26),transparent_70%),radial-gradient(280px_88px_at_62%_38%,rgba(255,255,255,.12),transparent_70%),radial-gradient(220px_66px_at_94%_62%,rgba(86,189,234,.22),transparent_70%)] blur-[9px] motion-reduce:animate-none" />
      <span className="absolute -inset-x-[18%] -inset-y-[60px] animate-aurora-slow bg-[radial-gradient(320px_120px_at_30%_60%,rgba(125,211,252,.28),transparent_72%),radial-gradient(280px_110px_at_78%_40%,rgba(56,189,248,.20),transparent_72%)] opacity-50 blur-[22px] motion-reduce:animate-none" />
      <span className="absolute inset-0 animate-sheen bg-[linear-gradient(112deg,transparent_36%,rgba(255,255,255,.07)_45%,rgba(255,255,255,.26)_50%,rgba(255,255,255,.07)_55%,transparent_64%)] bg-[length:240%_100%] bg-no-repeat motion-reduce:animate-none" />
    </span>
  )
}
