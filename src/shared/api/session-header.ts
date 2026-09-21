import { getLegacyLayoutHtml } from './legacy-layout'

export type SessionHeader = {
  fullName: string
  email: string
  initials: string
  userId: string | null
}

// _Layout.cshtml:349 renders the UserId claim as swapp.init({ userId: parseInt('123') }).
const USER_ID_PATTERN = /userId:\s*parseInt\('(\d+)'\)/
const INITIALS_PATTERN = /<span class="content-text"[^>]*>([^<]*)<\/span>/
const CENTERED_TEXT_PATTERN =
  /<li style="text-align: center;" role="none"><div class="menu-text-container">([^<]*)<\/div><\/li>/g

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&nbsp;': ' ',
}

// Razor HTML-encodes names and e-mails; the browser's own parser decodes every entity, the regex
// fallback covers the ones Razor emits when no DOM exists (SL-09).
export function decodeHtmlEntities(value: string): string {
  if (typeof document !== 'undefined') {
    const box = document.createElement('textarea')
    box.innerHTML = value
    return box.value.trim()
  }
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&(amp|lt|gt|quot|#39|#x27|nbsp);/g, entity => ENTITIES[entity] ?? entity)
    .trim()
}

// Mirrors Views/Shared/_LoginPartial.cshtml:59-80, the only place Admin exposes name, email and initials.
export function extractSessionHeader(html: string): SessionHeader | null {
  const centered = [...html.matchAll(CENTERED_TEXT_PATTERN)].map(match => decodeHtmlEntities(match[1]))
  const initials = decodeHtmlEntities(INITIALS_PATTERN.exec(html)?.[1] ?? '')
  if (centered.length === 0 && !initials) return null
  const userId = USER_ID_PATTERN.exec(html)?.[1] ?? null
  return {
    fullName: centered[0] ?? '',
    email: centered[1] ?? '',
    initials,
    userId: userId === '0' ? null : userId,
  }
}

export async function loadSessionHeader(): Promise<SessionHeader | null> {
  const html = await getLegacyLayoutHtml()
  return html === null ? null : extractSessionHeader(html)
}
