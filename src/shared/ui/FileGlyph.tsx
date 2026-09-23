// The PDF and CSV file icons, drawn here so no export dialog depends on an image asset.
export function FileGlyph({ kind }: { kind: 'pdf' | 'csv' }) {
  const tint = kind === 'pdf' ? 'var(--color-file-pdf)' : 'var(--color-file-csv)'
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 60"
      className="h-20 w-16 drop-shadow-[0_6px_10px_rgba(15,23,42,.18)] transition-transform duration-300 ease-premium group-hover:scale-105"
    >
      <path d="M4 4a4 4 0 0 1 4-4h22l18 18v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#fff" />
      <path
        d="M4 4a4 4 0 0 1 4-4h22l18 18v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"
        fill="none"
        stroke="rgba(15,23,42,.18)"
        strokeWidth="1.5"
      />
      <path d="M30 0l18 18H34a4 4 0 0 1-4-4Z" fill="rgba(15,23,42,.1)" />
      <rect x="0" y="30" width="44" height="18" rx="3" fill={tint} />
      <text
        x="22"
        y="43"
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
      >
        {kind.toUpperCase()}
      </text>
    </svg>
  )
}
