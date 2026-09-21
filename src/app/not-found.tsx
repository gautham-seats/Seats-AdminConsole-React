import Link from 'next/link'
import { buttonVariants, ErrorState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

// Static text: the boundary renders inside the shell but must not depend on the resources call.
const TEXT = {
  state: 'Page not found',
  message: 'There is no screen at this address.',
  hint: 'Check the link you followed, or return to Home and use the menu.',
  home: 'Return to Home',
}

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center p-6">
      <ErrorState
        variant="page"
        headingLevel={1}
        glyph="missing"
        stateLabel={TEXT.state}
        message={TEXT.message}
        hint={TEXT.hint}
        action={
          <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'bg-card')}>
            {TEXT.home}
          </Link>
        }
      />
    </div>
  )
}
