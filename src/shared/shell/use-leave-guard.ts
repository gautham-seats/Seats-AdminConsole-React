'use client'

import { useEffect } from 'react'

type AskLeave = (message: string) => Promise<boolean>

let askLeave: AskLeave | null = null
let bypass = false
let bypassTimer: ReturnType<typeof setTimeout> | null = null
// Every dirty form registers here; one listener pair and one prompt serve them all.
const guards = new Map<symbol, string>()
let listening = false
// Back/Forward (SL-13): while a form is dirty a sentinel entry sits on top of the real one, so pressing Back
// lands on the same page and asks; Stay steps forward onto the sentinel again, Leave steps back for real.
const SENTINEL = { leaveGuard: true }
let sentinel = false
// A fold-away back() is in flight: its popstate must not be read as the user pressing Back.
let foldingTimer: ReturnType<typeof setTimeout> | null = null

// Lets the replayed navigation through, then clears itself: beforeunload runs after this task, and a
// destination that never unloads (mailto:, a download) must not leave the guard switched off.
function armBypass() {
  bypass = true
  if (bypassTimer) clearTimeout(bypassTimer)
  bypassTimer = setTimeout(() => {
    bypass = false
    bypassTimer = null
  }, 2000)
}

// The app shell registers its styled "leave page?" dialog; without it the browser confirm is used.
export function registerLeaveDialog(ask: AskLeave | null) {
  askLeave = ask
}

// Full navigation for a link that is gone by the time Leave is pressed (a nav menu closes and unmounts it).
export const leaveNavigation = {
  go: (href: string) => window.location.assign(href),
}

const currentMessage = () => [...guards.values()].at(-1) ?? ''

export function hasUnsavedChanges(): boolean {
  return guards.size > 0
}

// Asks once when any form is dirty; resolves true when the user may leave (or nothing is dirty).
function confirmLeave(): Promise<boolean> {
  if (bypass || guards.size === 0) return Promise.resolve(true)
  const message = currentMessage()
  if (askLeave) return askLeave(message)
  return Promise.resolve(window.confirm(message))
}

// Programmatic navigation (router.push, location.assign) goes through here so it asks like a link does.
export function guardedNavigate(navigate: () => void): Promise<boolean> {
  // Nothing dirty: navigate now, in the same task as the click that asked for it.
  if (bypass || guards.size === 0) {
    navigate()
    return Promise.resolve(true)
  }
  return confirmLeave().then(leave => {
    if (!leave) return false
    armBypass()
    navigate()
    return true
  })
}

// Same-page anchors, mail/phone links and downloads never leave the form.
function staysOnPage(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute('href') ?? ''
  if (href === '' || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return true
  if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') return true
  const here = window.location.href.split('#')[0]
  return link.href.split('#')[0] === here
}

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (bypass || guards.size === 0) return
  event.preventDefault()
  event.returnValue = currentMessage()
}

function onClick(event: MouseEvent) {
  if (
    bypass ||
    guards.size === 0 ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey
  )
    return
  const link = (event.target as Element | null)?.closest?.('a[href]')
  if (!(link instanceof HTMLAnchorElement) || staysOnPage(link)) return
  const message = currentMessage()
  if (askLeave) {
    event.preventDefault()
    event.stopPropagation()
    const href = link.getAttribute('href') ?? ''
    const target = link.href || href
    void askLeave(message).then(leave => {
      if (!leave) return
      if (link.isConnected) {
        armBypass()
        link.click()
        return
      }
      // The page unloads, so the unload prompt must not ask a second time.
      armBypass()
      leaveNavigation.go(target)
    })
    return
  }
  if (window.confirm(message)) return
  event.preventDefault()
  event.stopPropagation()
}

const isSentinel = () => {
  const state: unknown = window.history.state
  return !!state && typeof state === 'object' && (state as { leaveGuard?: boolean }).leaveGuard === true
}

// Landing on the sentinel (a forward step) or with nothing dirty needs no question.
function onPopState() {
  if (foldingTimer) {
    clearTimeout(foldingTimer)
    foldingTimer = null
    return
  }
  if (bypass || guards.size === 0 || isSentinel()) return
  // Landed on the real entry: ask, and either step onto the sentinel again or let the history move on.
  void confirmLeave().then(leave => {
    if (leave) {
      sentinel = false
      armBypass()
      window.history.back()
      return
    }
    window.history.forward()
  })
}

function placeSentinel() {
  if (sentinel || typeof window === 'undefined' || isSentinel()) return
  window.history.pushState(SENTINEL, '', window.location.href)
  sentinel = true
}

// addEventListener ignores a duplicate of the same function, so this is safe to call for every guard.
function listen() {
  if (typeof window === 'undefined') return
  listening = true
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('popstate', onPopState)
  document.addEventListener('click', onClick, true)
}

function unlisten() {
  if (!listening || guards.size > 0) return
  listening = false
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('popstate', onPopState)
  document.removeEventListener('click', onClick, true)
  // The form is clean: fold the sentinel away so Back is one press again.
  if (sentinel && isSentinel()) {
    if (foldingTimer) clearTimeout(foldingTimer)
    foldingTimer = setTimeout(() => {
      foldingTimer = null
    }, 500)
    window.history.back()
  }
  sentinel = false
}

// Asks before leaving a form with unsaved changes: browser unload, every in-app link, and guardedNavigate.
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return
    const id = Symbol('leave-guard')
    // A new guarded form means the last Leave is over, whether or not the page actually unloaded.
    bypass = false
    guards.set(id, message)
    listen()
    placeSentinel()
    return () => {
      guards.delete(id)
      unlisten()
    }
  }, [active, message])
}
