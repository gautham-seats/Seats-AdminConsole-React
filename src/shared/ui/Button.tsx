'use client'

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './cn'
import { onSaveSuccess } from './feedback-bus'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'lift-bloom bg-brand text-primary-foreground hover:bg-brand/90',
        destructive: 'lift-bloom bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'lift-bloom border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'lift-bloom bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        // Icon-only: prefer IconButton, whose type requires aria-label.
        icon: 'lift-icon h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }

const TICK_WINDOW_MS = 2500
const TICK_SHOW_MS = 1400

export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      data-busy-icon=""
      className={cn('size-4 shrink-0 animate-spin motion-reduce:animate-none', className)}
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}

function ButtonTick() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      data-busy-icon=""
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
    >
      <path
        d="M20 6 9 17l-5-5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[tick_480ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        style={{ strokeDasharray: 22 }}
      />
    </svg>
  )
}

// Shows a spinner while loading, then a drawn tick when a success toast follows.
function useSaveTick(loading: boolean) {
  const [tick, setTick] = useState(false)
  const lastLoading = useRef(0)

  useEffect(() => {
    if (loading) lastLoading.current = Date.now()
    else if (lastLoading.current) lastLoading.current = Date.now()
  }, [loading])

  useEffect(() => {
    let timer = 0
    const off = onSaveSuccess(() => {
      if (!lastLoading.current || Date.now() - lastLoading.current > TICK_WINDOW_MS) return
      lastLoading.current = 0
      setTick(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setTick(false), TICK_SHOW_MS)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [])

  return tick
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, type = 'button', loading = false, disabled, children, onClick, ...props },
    ref,
  ) => {
    const tick = useSaveTick(loading)
    const busy = loading || tick
    // A loading button stays focusable (aria-disabled) so focus is not dropped on the page while saving.
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-disabled={!disabled && loading ? true : undefined}
        aria-busy={loading || undefined}
        onClick={loading ? event => event.preventDefault() : onClick}
        className={cn(
          buttonVariants({ variant, size }),
          busy && '[&>svg:not([data-busy-icon])]:hidden',
          tick && 'save-ring',
          loading && 'pointer-events-none opacity-70',
          className,
        )}
        {...props}
      >
        {loading ? <ButtonSpinner /> : tick ? <ButtonTick /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
