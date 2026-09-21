// Elements that can run code or re-parse their content (svg/math carry the classic mXSS routes).
const BLOCKED_ELEMENTS =
  'script,iframe,object,embed,form,input,button,meta,base,style,link,template,svg,math,noscript'
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'background', 'xlink:href'])
// srcset is a second list of image sources; style is kept but reduced to plain formatting below.
const BLOCKED_ATTRIBUTES = new Set(['srcdoc', 'srcset', 'ping'])
// The inline properties Quill's toolbar writes (colour, highlight, size, font, alignment) and nothing else.
const SAFE_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
  'line-height',
])
const SAFE_STYLE_VALUE = /^[a-z0-9#%.,()\s-]+$/i
// Control characters and spaces go first, so a scheme split by a tab cannot slip through.
const STRIPPED = /[\u0000-\u0020\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u3000\ufeff]/g
const UNSAFE_SCHEME = /^(?:javascript|vbscript|data):/i
// Templates legitimately embed small images; every other data: URL stays blocked.
const SAFE_DATA_IMAGE = /^data:image[/](?:png|jpeg|jpg|gif|webp|bmp);base64,[a-z0-9+/=\s]*$/i

// Keeps only known formatting declarations with plain values, so url(), expression() and escapes never survive.
function safeStyle(value: string): string {
  return value
    .split(';')
    .map(declaration => declaration.trim())
    .filter(declaration => {
      const colon = declaration.indexOf(':')
      if (colon < 0) return false
      const property = declaration.slice(0, colon).trim().toLowerCase()
      const text = declaration.slice(colon + 1).trim()
      return (
        SAFE_STYLE_PROPERTIES.has(property) && SAFE_STYLE_VALUE.test(text) && !/url|expression/i.test(text)
      )
    })
    .join('; ')
}

function unsafeUrl(name: string, value: string): boolean {
  const cleaned = value.replace(STRIPPED, '')
  if (!UNSAFE_SCHEME.test(cleaned)) return false
  return !(name === 'src' && SAFE_DATA_IMAGE.test(cleaned))
}

// Removes anything executable before a stored template reaches the editor (audit L-02).
export function sanitizeTemplateHtml(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  document.body.querySelectorAll(BLOCKED_ELEMENTS).forEach(element => element.remove())
  document.body.querySelectorAll('*').forEach(element => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      const local = attribute.localName.toLowerCase()
      if (name.startsWith('on') || BLOCKED_ATTRIBUTES.has(local) || BLOCKED_ATTRIBUTES.has(name)) {
        element.removeAttribute(attribute.name)
      } else if (local === 'style') {
        const kept = safeStyle(attribute.value)
        if (kept) element.setAttribute('style', kept)
        else element.removeAttribute(attribute.name)
      } else if (
        (URL_ATTRIBUTES.has(name) || URL_ATTRIBUTES.has(local)) &&
        unsafeUrl(local, attribute.value)
      ) {
        element.removeAttribute(attribute.name)
      }
    }
  })
  return document.body.innerHTML
}
