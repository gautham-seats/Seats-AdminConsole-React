import { cn } from '../cn'

export type LoadingStyle = 'shine' | 'hop'

const DELAYS = { shine: ['0ms', '200ms', '400ms'], hop: ['0ms', '160ms', '320ms'] }

export function LoadingDots({ style = 'shine', className }: { style?: LoadingStyle; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-flex items-center gap-[3px]', className)}>
      {DELAYS[style].map(delay => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className={cn(
            'size-1 rounded-full motion-reduce:animate-none motion-reduce:opacity-60',
            style === 'shine' ? 'bg-brand animate-dot-fade' : 'bg-current animate-dot-hop',
          )}
        />
      ))}
    </span>
  )
}

// Word and dots are centred together under the logo.
export function LoadingLabel({
  label,
  style = 'shine',
  className,
}: {
  label: string
  style?: LoadingStyle
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-sm font-medium tracking-wide',
        style === 'hop' && 'text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          style === 'shine' &&
            'animate-text-shine bg-[linear-gradient(90deg,var(--color-muted-foreground)_0%,var(--color-muted-foreground)_35%,var(--color-brand)_50%,var(--color-muted-foreground)_65%,var(--color-muted-foreground)_100%)] bg-[length:250%_100%] bg-clip-text text-transparent motion-reduce:animate-none',
        )}
      >
        {label.replace(/[.…\s]+$/, '')}
      </span>
      <LoadingDots style={style} className="ml-1.5" />
    </span>
  )
}
