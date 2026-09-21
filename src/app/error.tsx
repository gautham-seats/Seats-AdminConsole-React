'use client'

import Link from 'next/link'
import { buttonVariants, ErrorState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

// The boundary cannot fetch its own text: the resources call may be the thing that failed.
const TEXT = {
  state: 'Unexpected problem',
  message: 'This screen could not be displayed.',
  hint: 'No data was affected. If this continues, give your administrator the reference below.',
  retry: 'Try again',
  home: 'Return to Home',
  reference: 'Reference',
}

// Catches anything thrown while rendering a route, so a stack trace can never reach the screen.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Next already reports the cause to the server log and the dev overlay, so nothing is logged here.
  return (
    <div className="grid flex-1 place-items-center p-6">
      <ErrorState
        variant="page"
        headingLevel={1}
        tone="danger"
        glyph="problem"
        stateLabel={TEXT.state}
        message={TEXT.message}
        hint={TEXT.hint}
        retryLabel={TEXT.retry}
        onRetry={reset}
        // Only the digest is shown: never the message, never the stack.
        meta={error.digest ? `${TEXT.reference} ${error.digest}` : undefined}
        action={
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'bg-card')}>
            {TEXT.home}
          </Link>
        }
      />
    </div>
  )
}
