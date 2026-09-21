import '@testing-library/jest-dom'

if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: jest.fn(),
  })
}

// jsdom ships neither observer; the popper-positioned menus look for both, and no layout means nothing to report.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverStub implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserverStub implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = '0px'
    readonly thresholds: ReadonlyArray<number> = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return []
    }
  }
}

// nwsapi's :fullscreen and :modal checks recurse in jsdom 26; nothing under test is ever either, so answer false.
const RECURSIVE_STATES = new Set([':fullscreen', ':modal'])
if (typeof Element !== 'undefined') {
  const realMatches = Element.prototype.matches
  Element.prototype.matches = function matches(this: Element, selector: string) {
    if (RECURSIVE_STATES.has(selector)) return false
    return realMatches.call(this, selector)
  }
}
