'use client'

import { ErrorState } from '@/shared/ui'

// Views/Error/*.cshtml text; the legacy pages hard-code English, and GeneralResources has no key for the first two.
export const ERROR_PAGES_EN = {
  notAuthorisedLabel: 'No access',
  notAuthorised: 'You do not have permission to view this page within the SEAtS application.',
  notActiveLabel: 'Account inactive',
  notActive: 'Your account is currently inactive. You do not have permission to access this site.',
  notActiveCall: 'Please call (01) 513 6772.',
  unsupportedLabel: 'Browser not supported',
  unsupported: 'This browser is not supported.',
  unsupportedHint: 'Please use a recent version of Chrome, Edge, Firefox or Safari.',
} as const

// ErrorController.NotAuthorised: shown for #/Error/NotAuthorised (swapp.js:179, _Layout.cshtml:548-560).
export function NotAuthorisedScreen() {
  return (
    <ErrorState
      variant="page"
      headingLevel={1}
      glyph="permission"
      stateLabel={ERROR_PAGES_EN.notAuthorisedLabel}
      message={ERROR_PAGES_EN.notAuthorised}
      hint=""
    />
  )
}

// ErrorController.NotActive: tenant or account switched off.
export function NotActiveScreen() {
  return (
    <ErrorState
      variant="page"
      headingLevel={1}
      glyph="permission"
      stateLabel={ERROR_PAGES_EN.notActiveLabel}
      message={ERROR_PAGES_EN.notActive}
      hint={ERROR_PAGES_EN.notActiveCall}
    />
  )
}

// ErrorController.UnsupportedBrowser: HomeController.Index sends Internet Explorer here.
export function UnsupportedBrowserScreen() {
  return (
    <ErrorState
      variant="page"
      headingLevel={1}
      glyph="problem"
      stateLabel={ERROR_PAGES_EN.unsupportedLabel}
      message={ERROR_PAGES_EN.unsupported}
      hint={ERROR_PAGES_EN.unsupportedHint}
    />
  )
}
