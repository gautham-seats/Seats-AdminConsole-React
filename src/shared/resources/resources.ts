import { api } from '@/shared/api'
import { getUiCulture, setUiCulture } from '@/shared/i18n/culture'
import type { ScreenResourcesResponse } from '@/types/resources'

// One map per culture, so a culture switch never serves the previous language.
const caches = new Map<string, Map<string, string | null>>()
// Keys already on the wire, so components mounting together share one POST instead of repeating it.
const inFlight = new Map<string, Promise<Record<string, string>>>()

function cacheFor(culture: string): Map<string, string | null> {
  let cache = caches.get(culture)
  if (!cache) {
    cache = new Map()
    caches.set(culture, cache)
  }
  return cache
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

export async function loadScreenResources(
  keys: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const culture = getUiCulture()
  let cache = cacheFor(culture)
  const wanted = [...new Set(keys)].filter(key => !cache.has(key))
  const shared = wanted.map(key => inFlight.get(`${culture}|${key}`)).filter(Boolean) as Promise<unknown>[]
  const missing = wanted.filter(key => !inFlight.has(`${culture}|${key}`))
  if (missing.length > 0) {
    // No signal: the answer is shared and cached, so one component's unmount must not cancel it for the rest.
    const request = api
      .post<ScreenResourcesResponse>('ResourceApi/GetResourcesForScreen', { body: missing })
      .then(response => {
        const stillCurrent = culture === getUiCulture()
        const values = unwrapScreenResources(response, culture)
        // Cached under the culture the answer belongs to: the server's name when this request was still
        // current, otherwise the one that was asked for, never a culture chosen after the request went out.
        cache = cacheFor(stillCurrent ? getUiCulture() : culture)
        // A key the server did not return is remembered as a miss, so it is not asked for on every mount.
        for (const key of missing) cache.set(key, values[key] ?? null)
        return values
      })
      .finally(() => {
        for (const key of missing)
          if (inFlight.get(`${culture}|${key}`) === request) inFlight.delete(`${culture}|${key}`)
      })
    for (const key of missing) inFlight.set(`${culture}|${key}`, request)
    shared.push(request)
  }
  await Promise.all(shared)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  cache = cacheFor(getUiCulture())
  const result: Record<string, string> = {}
  for (const key of keys) {
    const value = cache.get(key)
    if (typeof value === 'string') result[key] = value
  }
  return result
}

export function clearResourceCache(): void {
  caches.clear()
}
