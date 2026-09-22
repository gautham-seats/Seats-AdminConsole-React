import Image, { type StaticImageData } from 'next/image'
import { useId } from 'react'

// Silver Seal (docs/specs/shared/logo.designs.html): the logo file untouched, a chrome ring round its disc, a glint over it.
export function NavLogo({ src, alt }: { src: StaticImageData; alt: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mask = `url(${src.src}) center / 100% 100% no-repeat`
  return (
    <span className="relative block h-8 shrink-0 transition-transform duration-300 hover:scale-[1.03]">
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <filter id={`seal-solid-${uid}`} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncA type="linear" slope={1.45} />
            </feComponentTransfer>
          </filter>
          <linearGradient id={`seal-chrome-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-seal-bright)' }} />
            <stop offset="0.25" style={{ stopColor: 'var(--color-seal-cool)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--color-seal-bright)' }} />
            <stop offset="0.75" style={{ stopColor: 'var(--color-seal-deep)' }} />
            <stop offset="1" style={{ stopColor: 'var(--color-seal-bright)' }} />
          </linearGradient>
        </defs>
      </svg>
      <Image
        src={src}
        alt={alt}
        priority
        unoptimized
        className="h-8 w-auto"
        style={{ filter: `url(#seal-solid-${uid}) drop-shadow(0 1px 0 var(--color-seal-shadow))` }}
      />
      <span aria-hidden="true" className="nav-seal-disc [html[data-contrast=high]_&]:hidden">
        <svg viewBox="0 0 100 100">
          <circle className="nav-seal-ring" cx="50" cy="50" r="55" stroke={`url(#seal-chrome-${uid})`} />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="nav-seal-glint [html[data-contrast=high]_&]:hidden"
        style={{ WebkitMask: mask, mask }}
      />
    </span>
  )
}
