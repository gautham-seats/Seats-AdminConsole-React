import { getLegacyLayoutHtml, markLegacyLayoutUnusable, resetLegacyLayout } from './legacy-layout'

const TOKEN_PATTERN = /requestVerificationToken:\s*'([^'\s]+:[^'\s]+)'/

export function extractVerificationToken(html: string): string | null {
  return TOKEN_PATTERN.exec(html)?.[1] ?? null
}

export async function getVerificationToken(): Promise<string | null> {
  const html = await getLegacyLayoutHtml()
  const token = html === null ? null : extractVerificationToken(html)
  // A page without the token is the login page or a changed layout: treated like a failed fetch (SL-02).
  if (token === null && html !== null) markLegacyLayoutUnusable()
  return token
}

export function resetVerificationToken(): void {
  resetLegacyLayout()
}
