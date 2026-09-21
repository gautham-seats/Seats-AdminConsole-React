'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const SHOW_DELAY_MS = 180
const GAP = 10
const EDGE = 8
const STASH = 'data-frost-title'

type Tip = { el: HTMLElement; text: string }
type Place = { left: number; top: number; arrow: number; side: 'top' | 'bottom' }

const FIELD =
  '[data-filter-panel] :is(input:not([type=checkbox], [type=radio]), select, textarea, button[id])'
const ICON_ONLY = ':is(button, a)[aria-label]'

const titled = (node: EventTarget | null) => {
  if (!(node instanceof Element)) return null
  const withTitle = node.closest<HTMLElement>(`[title]:not(svg *), [${STASH}]`)
  if (withTitle) return withTitle
  const field = node.closest<HTMLElement>(FIELD)
  if (field) return field
  const icon = node.closest<HTMLElement>(ICON_ONLY)
  return icon && !icon.textContent?.trim() ? icon : null
}

const labelled = (el: HTMLElement) =>
  (el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLButtonElement) &&
  Boolean(el.labels?.length)

// True when the element is named by something other than its title.
const hasOwnName = (el: HTMLElement) =>
  Boolean(el.getAttribute('aria-label')?.trim()) ||
  el.hasAttribute('aria-labelledby') ||
  Boolean(el.textContent?.trim()) ||
  labelled(el)

const labelFor = (el: HTMLElement) => {
  const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null
  return (byFor?.textContent ?? el.getAttribute('aria-label') ?? '').trim()
}

const valueOf = (el: HTMLElement) => {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el.value || el.placeholder
  if (el instanceof HTMLSelectElement) return el.selectedOptions[0]?.textContent ?? ''
  return el.textContent ?? ''
}

// Filter fields show "Label: value"; icon-only buttons show their name.
const describe = (el: HTMLElement) => {
  if (!el.matches(FIELD)) return el.getAttribute('aria-label') ?? ''
  const label = labelFor(el)
  const value = valueOf(el).replace(/\s+/g, ' ').trim()
  if (!label) return value
  return value && value !== label ? `${label}: ${value}` : label
}

// Shows every native title, icon-only button name and filter field value as a Frost tooltip.
export function FrostTooltips() {
  const [tip, setTip] = useState<Tip | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [open, setOpen] = useState(false)
  const bubble = useRef<HTMLDivElement>(null)
  const current = useRef<HTMLElement | null>(null)
  const timer = useRef(0)

  useEffect(() => {
    const restore = () => {
      window.clearTimeout(timer.current)
      const el = current.current
      current.current = null
      setOpen(false)
      if (!el) return
      const text = el.getAttribute(STASH)
      el.removeAttribute(STASH)
      if (text !== null && !el.hasAttribute('title')) el.setAttribute('title', text)
    }

    // Hides the browser's own tooltip only on hover; keyboard focus never shows it, so no attribute changes.
    const stash = (el: HTMLElement) => {
      const native = el.getAttribute('title')
      if (native === null || !native.trim() || !hasOwnName(el)) return
      el.setAttribute(STASH, native)
      el.removeAttribute('title')
    }

    const start = (el: HTMLElement, pointer: boolean) => {
      if (current.current === el) {
        if (pointer) stash(el)
        return
      }
      restore()
      const native = el.getAttribute('title')
      current.current = el
      if (native !== null && !native.trim()) return
      // A title that is the only name stays put, so the name never changes; the native tooltip shows instead.
      if (pointer && native !== null && !hasOwnName(el)) return
      if (pointer) stash(el)
      timer.current = window.setTimeout(() => {
        if (current.current !== el || !el.isConnected) return
        const text = native ?? el.getAttribute(STASH) ?? describe(el)
        if (!text.trim() || el.getAttribute('aria-expanded') === 'true') return
        setPlace(null)
        setTip({ el, text })
      }, SHOW_DELAY_MS)
    }

    const onOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const el = titled(event.target)
      if (el) start(el, true)
      else if (current.current) restore()
    }
    const onOut = (event: PointerEvent) => {
      const el = current.current
      if (el && !(event.relatedTarget instanceof Node && el.contains(event.relatedTarget))) restore()
    }
    const onFocus = (event: FocusEvent) => {
      const el = titled(event.target)
      if (el && el === event.target && el.matches(':focus-visible')) start(el, false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') restore()
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointerdown', restore, true)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', restore)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', restore, true)
    window.addEventListener('blur', restore)
    return () => {
      restore()
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointerdown', restore, true)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', restore)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', restore, true)
      window.removeEventListener('blur', restore)
    }
  }, [])

  useLayoutEffect(() => {
    if (!tip || place || !bubble.current) return
    const target = tip.el.getBoundingClientRect()
    const box = bubble.current.getBoundingClientRect()
    const centre = target.left + target.width / 2
    const left = Math.max(EDGE, Math.min(centre - box.width / 2, window.innerWidth - box.width - EDGE))
    const side = target.top - box.height - GAP < EDGE ? 'bottom' : 'top'
    const top = side === 'top' ? target.top - box.height - GAP : target.bottom + GAP
    const arrow = Math.max(12, Math.min(centre - left, box.width - 12))
    setPlace({ left, top, arrow, side })
    requestAnimationFrame(() => setOpen(current.current === tip.el))
  }, [tip, place])

  if (!tip) return null
  return createPortal(
    <div
      ref={bubble}
      aria-hidden="true"
      className="frost-tip"
      data-side={place?.side ?? 'top'}
      data-open={open && place ? 'true' : 'false'}
      style={{
        left: place?.left ?? -9999,
        top: place?.top ?? -9999,
        ['--tip-arrow' as string]: `${place?.arrow ?? 0}px`,
      }}
    >
      {tip.text}
    </div>,
    document.body,
  )
}
