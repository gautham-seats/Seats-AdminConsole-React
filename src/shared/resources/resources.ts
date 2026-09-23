import { api } from '@/shared/api'
import { getUiCulture, setUiCulture } from '@/shared/i18n/culture'
import type { ScreenResourcesResponse } from '@/types/resources'

// One map per culture, so a culture switch never serves the previous language.
const caches = new Map<string, Map<string, string | null>>()
// Keys already on the wire, so components mounting together share one POST instead of repeating it.
const inFlight = new Map<string, Promise<Record<string, string>>>()
// Keys asked for in the current tick, per culture; they leave as one POST when the tick ends.
const pending = new Map<string, { keys: string[]; request: Promise<Record<string, string>> }>()

function cacheFor(culture: string): Map<string, string | null> {
  let cache = caches.get(culture)
  if (!cache) {
    cache = new Map()
    caches.set(culture, cache)
  }
  return cache
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export function unwrapScreenResources(response: unknown, requested?: string): Record<string, string> {
  if (!response || typeof response !== 'object') return {}
  const [name] = Object.keys(response as ScreenResourcesResponse)
  const [culture] = Object.values(response as ScreenResourcesResponse)
  // A late answer for a culture the user has since left must not switch the UI back.
  if (typeof name === 'string' && (requested === undefined || requested === getUiCulture()))
    setUiCulture(name)
  if (!culture || typeof culture !== 'object') return {}
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(culture)) {
    if (typeof value === 'string') values[key] = value
  }
  return values
}

function postBatch(culture: string, keys: readonly string[]): Promise<Record<string, string>> {
  // No signal: the answer is shared and cached, so one component's unmount must not cancel it for the rest.
  return api
    .post<ScreenResourcesResponse>('ResourceApi/GetResourcesForScreen', { body: keys })
    .then(response => {
      const stillCurrent = culture === getUiCulture()
      const values = unwrapScreenResources(response, culture)
      // Cached under the culture the answer belongs to: the server's name when this request was still
      // current, otherwise the one that was asked for, never a culture chosen after the request went out.
      const cache = cacheFor(stillCurrent ? getUiCulture() : culture)
      // A key the server did not return is remembered as a miss, so it is not asked for on every mount.
      for (const key of keys) cache.set(key, values[key] ?? null)
      return values
    })
}

// Every component in one render commit asks for its own keys in the same tick; the flush is deferred to
// a microtask so they leave as one POST. A macrotask timer would batch across the shell's and the
// page's separate commits too (one POST instead of two), but it resolves the read after a test's act()
// scope has closed, which surfaces as an unwrapped-update warning on any Radix control the read feeds.
// A microtask resolves within act, so the batch is per-commit: four POSTs a page become about two.
function enqueue(culture: string, missing: readonly string[]): Promise<Record<string, string>> {
  let batch = pending.get(culture)
  if (!batch) {
    const keys: string[] = []
    const { promise, resolve, reject } = deferred<Record<string, string>>()
    queueMicrotask(() => {
      pending.delete(culture)
      postBatch(culture, keys)
        .then(resolve, reject)
        .finally(() => {
          for (const key of keys)
            if (inFlight.get(`${culture}|${key}`) === promise) inFlight.delete(`${culture}|${key}`)
        })
    })
    batch = { keys, request: promise }
    pending.set(culture, batch)
  }
  for (const key of missing) {
    batch.keys.push(key)
    inFlight.set(`${culture}|${key}`, batch.request)
  }
  return batch.request
}

export async function loadScreenResources(
  keys: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const culture = getUiCulture()
  const cache = cacheFor(culture)
  const wanted = [...new Set(keys)].filter(key => !cache.has(key))
  const shared = wanted.map(key => inFlight.get(`${culture}|${key}`)).filter(Boolean) as Promise<unknown>[]
  const missing = wanted.filter(key => !inFlight.has(`${culture}|${key}`))
  if (missing.length > 0) shared.push(enqueue(culture, missing))
  await Promise.all(shared)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const current = cacheFor(getUiCulture())
  const result: Record<string, string> = {}
  for (const key of keys) {
    const value = current.get(key)
    if (typeof value === 'string') result[key] = value
  }
  return result
}

export function clearResourceCache(): void {
  caches.clear()
}
