import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The table band paints its layers through background-image / -size / -position. CSS repeats the
// shorter list, so an extra image layer silently gives the base gradient the underline's 2.5px
// height: a white header with white text on every table in the app. This keeps the lists in step.
describe('nav-band-cell background layers', () => {
  const css = readFileSync(join('src', 'shared', 'ui', 'tokens.css'), 'utf8')

  const block = css.slice(css.indexOf('.nav-band-cell {'))
  const rule = block.slice(0, block.indexOf('}'))

  // Splits on commas that are not inside gradient parentheses.
  const layers = (value: string) => {
    const parts: string[] = []
    let depth = 0
    let current = ''
    for (const char of value) {
      if (char === '(') depth += 1
      if (char === ')') depth -= 1
      if (char === ',' && depth === 0) {
        parts.push(current.trim())
        current = ''
      } else current += char
    }
    if (current.trim()) parts.push(current.trim())
    return parts
  }

  const declaration = (name: string) => {
    const at = rule.indexOf(`${name}:`)
    if (at === -1) throw new Error(`nav-band-cell has no ${name}`)
    const from = at + name.length + 1
    return layers(rule.slice(from, rule.indexOf(';', from)))
  }

  it('declares one size and one position for every image layer', () => {
    const images = declaration('background-image')
    expect(images.length).toBeGreaterThan(1)
    expect(declaration('background-size')).toHaveLength(images.length)
    expect(declaration('background-position')).toHaveLength(images.length)
  })

  it('paints the opaque base gradient last so the header is never white', () => {
    const images = declaration('background-image')
    const sizes = declaration('background-size')
    expect(images.at(-1)).toBe('var(--band-cell-base)')
    expect(sizes.at(-1)).toBe('100% 100%')
  })

  // Each <th> is its own paint box, so a diagonal or radial layer restarts per column and the
  // header shows a seam. Only a vertical gradient paints identically in every cell.
  it('uses a vertical base so columns never show a seam', () => {
    const base = css.slice(css.indexOf('--band-cell-base:'))
    expect(base.slice(0, base.indexOf(';'))).toContain('180deg')
    expect(declaration('background-image').join(' ')).not.toContain('radial-gradient')
  })

  // Removed on 2026-09-23 at Gautham's request: no cyan rule under any band.
  it('has no accent underline on the band', () => {
    expect(declaration('background-image').join(' ')).not.toContain('--band-line')
    expect(css).not.toContain('.nav-band-surface::after')
  })
})
