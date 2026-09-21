import { TidePageLoading } from '@/shared/ui'

const LOADING_LABEL = 'Loading'

export default function Loading() {
  return (
    <>
      {/* WCAG 2.4.6: every route state keeps one h1, even while the page loads. */}
      <h1 className="sr-only">{LOADING_LABEL}</h1>
      <TidePageLoading label={LOADING_LABEL} />
    </>
  )
}
