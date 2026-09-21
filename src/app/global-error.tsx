'use client'

import '@/shared/ui/tokens.css'
import { ErrorState } from '@/shared/ui'

// Last resort: the root layout itself failed, so this replaces it and brings its own html and body.
const TEXT = {
  state: 'Service interrupted',
  message: 'SEAtS Admin could not start.',
  hint: 'Reload to try again. If this continues, give your administrator the reference below.',
  retry: 'Reload',
  reference: 'Reference',
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-page text-foreground antialiased">
        <main
          id="admin-main"
          tabIndex={-1}
          className="grid min-h-screen place-items-center p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
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
            meta={error.digest ? `${TEXT.reference} ${error.digest}` : undefined}
          />
        </main>
      </body>
    </html>
  )
}
