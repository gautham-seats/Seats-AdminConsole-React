// Glossy primary action shared by Add and Refresh: layered shadow, slow lift, light sweep, icon turns on hover.
export const ADD_BUTTON_CLASS = [
  'group relative isolate inline-flex min-h-10 min-w-[8.5rem] items-center justify-center gap-2.5 overflow-hidden rounded-lg px-7',
  'text-sm font-semibold tracking-wide text-white',
  'bg-[linear-gradient(180deg,#2d84c4_0%,#1566a2_55%,#10568a_100%)]',
  'shadow-[inset_0_1px_0_rgba(255,255,255,.35),inset_0_-1px_0_rgba(0,0,0,.14),0_1px_2px_rgba(15,23,42,.14),0_4px_10px_-2px_rgba(21,102,162,.28),0_12px_24px_-10px_rgba(21,102,162,.45)]',
  'transition-[transform,box-shadow,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.4),inset_0_-1px_0_rgba(0,0,0,.14),0_2px_4px_rgba(15,23,42,.12),0_8px_16px_-4px_rgba(21,102,162,.35),0_20px_36px_-12px_rgba(21,102,162,.55)]',
  'active:translate-y-0 active:scale-[.98] active:brightness-95 active:shadow-[inset_0_1px_0_rgba(255,255,255,.3),inset_0_-1px_0_rgba(0,0,0,.14),0_1px_2px_rgba(15,23,42,.14),0_3px_8px_-3px_rgba(21,102,162,.35)] active:duration-150',
  'disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-1/2 before:bg-[linear-gradient(180deg,rgba(255,255,255,.2),rgba(255,255,255,0))] before:content-['']",
  "after:pointer-events-none after:absolute after:inset-y-0 after:-left-1/2 after:w-1/3 after:-skew-x-12 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)] after:opacity-0 after:transition-[left,opacity] after:duration-1000 after:ease-out after:content-['']",
  'hover:after:left-[130%] hover:after:opacity-100',
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:after:hidden',
].join(' ')

export const ADD_ICON_CLASS =
  'size-[18px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90 motion-reduce:transition-none'
