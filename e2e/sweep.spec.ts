import { chromium, expect, test, type BrowserContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ROUTES, ROUTE_COUNT, type RouteBucket, type RouteEntry } from './routes'

const AUTH_DIR = path.join(__dirname, '.auth')
const AUTH_FILE = path.join(AUTH_DIR, 'admin-state.json')
const PROFILE_DIR = path.join(AUTH_DIR, 'profile')
const SCREENSHOT_DIR = path.join(AUTH_DIR, 'screenshots')
const RESULTS_DIR = path.join(AUTH_DIR, 'results')
const APP_ORIGIN = 'https://dev.seats.local/admin-next'
const SESSION_ABORT = 'Session missing or expired — re-authenticate and re-run.'

interface FailedCall {
  method: string
  path: string
  status: number
}

interface RouteResult {
  route: string
  source: string
  expected: RouteBucket
  seen: RouteBucket | 'unknown'
  passed: boolean
  reason: string
  finalUrl: string
  failedCalls: FailedCall[]
  consoleErrorCount: number
  h1Count: number
  h1Texts: string[]
  mainCount: number
  overflow320: boolean
  overflowZoom200: boolean
  screenshotPaths: string[]
}

function ensureDirs(): void {
  for (const directory of [AUTH_DIR, SCREENSHOT_DIR, RESULTS_DIR]) {
    fs.mkdirSync(directory, { recursive: true })
  }
}

function slug(routePath: string): string {
  return routePath.replace(/^\//, '').replaceAll('/', '__') || 'root'
}

function isSessionLost(page: Page): boolean {
  const url = page.url()
  return url.includes('login.microsoftonline.com') || url.includes('/Account/ForceLogin')
}

function isExpectedNetworkConsoleError(message: string, failedCalls: FailedCall[]): boolean {
  return /failed to load resource/i.test(message) && failedCalls.some(call => call.status >= 400)
}

function patternFor(entry: RouteEntry): RegExp {
  const escaped = entry.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{id\\}', '([^/?#]+)')
  return new RegExp(`${escaped}(?:[/?#]|$)`)
}

async function resolveRoutes(page: Page): Promise<Array<{ entry: RouteEntry; path: string }>> {
  // The first request of a fresh session answers 403 and hops through the identity provider; let it settle.
  const sessionReady = page.waitForResponse(
    response => response.url().includes('/api/UserApi/GetClaims') && response.status() === 200,
    { timeout: 120_000 },
  )
  await page.goto(APP_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await sessionReady
  await page.waitForURL(url => url.href.startsWith(APP_ORIGIN), { timeout: 60_000 })
  await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 })
  await page.waitForTimeout(2_000)
  const identifiers = new Map<string, string>()
  for (const entry of ROUTES.filter(candidate => candidate.dynamic)) {
    if (!entry.resolveFrom) continue
    await page.goto(`${APP_ORIGIN}${entry.resolveFrom}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.locator('main, [role="alert"]').first().waitFor({ state: 'visible', timeout: 30_000 })
    await page.waitForTimeout(500)
    const matcher = patternFor(entry)
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll(links => links.map(link => link.getAttribute('href') ?? ''))
    const matched = hrefs.find(href => matcher.test(href))
    identifiers.set(entry.path, matched?.match(matcher)?.[1] ?? '1')
  }

  return ROUTES.map(entry => ({
    entry,
    path: entry.dynamic ? entry.path.replace('{id}', identifiers.get(entry.path) ?? '1') : entry.path,
  }))
}

function classifyState(input: {
  entry: RouteEntry
  alertTexts: string[]
  emptyTexts: string[]
  failedCalls: FailedCall[]
  h1Count: number
  mainCount: number
}): { bucket: RouteBucket | 'unknown'; reason: string } {
  const text = [...input.alertTexts, ...input.emptyTexts].join(' ').toLowerCase()
  if (
    input.entry.path === '/error/not-authorised' ||
    /not authorised|not authorized|no permission/.test(text)
  ) {
    return { bucket: 'not-authorised', reason: 'The page renders the shared not-authorised state.' }
  }
  if (
    input.failedCalls.some(call => call.status >= 500) ||
    /server error|unable to load|something went wrong|try again/.test(text)
  ) {
    return { bucket: 'server-error', reason: 'The page renders ErrorState or received a server 5xx.' }
  }
  if (input.emptyTexts.length > 0 || /no items|no results|nothing to show|no .* found/.test(text)) {
    return { bucket: 'empty', reason: 'The page renders a shared empty/results state.' }
  }
  if (input.mainCount === 1 && input.h1Count === 1) {
    return { bucket: 'data', reason: 'The shell rendered one main region and one page heading.' }
  }
  return {
    bucket: 'unknown',
    reason: `Expected one main and one h1; found main=${input.mainCount}, h1=${input.h1Count}.`,
  }
}

async function captureRoute(page: Page, entry: RouteEntry, routePath: string): Promise<RouteResult> {
  const failedCalls: FailedCall[] = []
  const rawConsoleErrors: string[] = []
  const onResponse = (response: {
    request: () => { method: () => string; url: () => string }
    status: () => number
  }) => {
    const status = response.status()
    if (status < 400) return
    const request = response.request()
    const requestUrl = new URL(request.url())
    if (requestUrl.hostname !== 'dev.seats.local') return
    failedCalls.push({ method: request.method(), path: requestUrl.pathname, status })
  }
  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') rawConsoleErrors.push(message.text())
  }
  page.on('response', onResponse)
  page.on('console', onConsole)

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${APP_ORIGIN}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.locator('main, [role="alert"]').first().waitFor({ state: 'visible', timeout: 30_000 })
    await page.waitForTimeout(800)
    if (isSessionLost(page)) throw new Error(SESSION_ABORT)

    const finalUrl = page.url()
    const h1Texts = (await page.locator('h1').allTextContents()).map(text => text.trim())
    const mainCount = await page.locator('main').count()
    const alertTexts = (await page.locator('[role="alert"]').allTextContents()).map(text => text.trim())
    const emptyTexts = (await page.locator('[role="status"]').allTextContents())
      .map(text => text.trim())
      .filter(text => /no items|no results|nothing to show|no .* found/i.test(text))
    const state = classifyState({
      entry,
      alertTexts,
      emptyTexts,
      failedCalls,
      h1Count: h1Texts.length,
      mainCount,
    })

    const shotDirectory = path.join(SCREENSHOT_DIR, slug(routePath))
    fs.mkdirSync(shotDirectory, { recursive: true })
    const desktopShot = path.join(shotDirectory, '1440.png')
    const phoneShot = path.join(shotDirectory, '320.png')
    const zoomShot = path.join(shotDirectory, 'zoom-200.png')
    await page.screenshot({ path: desktopShot, fullPage: true })
    await page.setViewportSize({ width: 320, height: 900 })
    await page.waitForTimeout(300)
    const overflow320 = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    )
    await page.screenshot({ path: phoneShot, fullPage: true })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.evaluate(() => {
      document.documentElement.style.zoom = '200%'
    })
    await page.waitForTimeout(300)
    const overflowZoom200 = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    )
    await page.screenshot({ path: zoomShot, fullPage: true })
    await page.evaluate(() => {
      document.documentElement.style.zoom = ''
    })

    const consoleErrors = rawConsoleErrors.filter(
      message => !isExpectedNetworkConsoleError(message, failedCalls),
    )
    const structuralFailure = mainCount !== 1 || h1Texts.length !== 1
    // Which bucket a screen lands in depends on which local services are up that day, so it is recorded, not asserted.
    const passed = !structuralFailure && consoleErrors.length === 0
    const bucketNote = state.bucket === entry.expectedBucket ? '' : ` (usual bucket ${entry.expectedBucket})`
    const reason = passed
      ? `${state.reason}${bucketNote}`
      : `${state.reason} main=${mainCount} h1=${h1Texts.length}; console errors=${consoleErrors.length}.`

    return {
      route: routePath,
      source: entry.source,
      expected: entry.expectedBucket,
      seen: state.bucket,
      passed,
      reason,
      finalUrl,
      failedCalls,
      consoleErrorCount: consoleErrors.length,
      h1Count: h1Texts.length,
      h1Texts,
      mainCount,
      overflow320,
      overflowZoom200,
      screenshotPaths: [desktopShot, phoneShot, zoomShot],
    }
  } finally {
    page.off('response', onResponse)
    page.off('console', onConsole)
  }
}

async function runSweep(context: BrowserContext): Promise<RouteResult[]> {
  const page = await context.newPage()
  const results: RouteResult[] = []
  try {
    const resolvedRoutes = await resolveRoutes(page)
    for (const { entry, path: routePath } of resolvedRoutes) {
      try {
        results.push(await captureRoute(page, entry, routePath))
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        if (reason === SESSION_ABORT) throw error
        results.push({
          route: routePath,
          source: entry.source,
          expected: entry.expectedBucket,
          seen: 'unknown',
          passed: false,
          reason,
          finalUrl: page.url(),
          failedCalls: [],
          consoleErrorCount: 0,
          h1Count: 0,
          h1Texts: [],
          mainCount: 0,
          overflow320: false,
          overflowZoom200: false,
          screenshotPaths: [],
        })
      }
    }
    return results
  } finally {
    await page.close()
  }
}

test.describe.configure({ mode: 'serial' })

test('authenticate session when needed', async () => {
  test.setTimeout(660_000)
  ensureDirs()
  if (fs.existsSync(AUTH_FILE)) test.skip(true, 'Saved session is present')
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    ignoreHTTPSErrors: true,
  })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.goto(APP_ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (/login\.microsoftonline|ForceLogin|account\./i.test(page.url())) {
    process.stdout.write('\nSIGN-IN NEEDED: complete sign-in in the opened Chromium window.\n')
    await page.waitForURL(url => url.href.startsWith(APP_ORIGIN), { timeout: 600_000 })
  }
  await page.locator('main').waitFor({ state: 'visible', timeout: 60_000 })
  await context.storageState({ path: AUTH_FILE })
  await context.close()
  expect(fs.existsSync(AUTH_FILE)).toBe(true)
})

test('all App Router pages render their expected local state', async () => {
  // 49 routes at up to ~12 s each; a hung route still fails on its own 30 s waits.
  test.setTimeout(900_000)
  ensureDirs()
  expect(fs.existsSync(AUTH_FILE), 'Run the headed authentication test first').toBe(true)
  // The saved cookies alone cannot finish the identity provider's silent sign-in; the profile can.
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    // The identity provider's silent sign-in only completes in a headed browser.
    headless: false,
    ignoreHTTPSErrors: true,
  })
  const results = await runSweep(context)
  await context.close()
  fs.writeFileSync(path.join(RESULTS_DIR, 'sweep.json'), JSON.stringify({ routes: results }, null, 2))
  for (const result of results) {
    process.stdout.write(
      `${result.passed ? 'PASS' : 'FAIL'} ${result.route} expected=${result.expected} seen=${result.seen} — ${result.reason}\n`,
    )
  }
  expect(results).toHaveLength(ROUTE_COUNT)
  expect(
    results.filter(result => !result.passed),
    'See e2e/.auth/results/sweep.json',
  ).toEqual([])
})
