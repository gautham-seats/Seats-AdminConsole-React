import AxeBuilder from '@axe-core/playwright'
import { chromium, expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { ROUTES, ROUTE_COUNT, type RouteEntry } from './routes'

const APP_ORIGIN = 'https://dev.seats.local/admin-next'
const AUTH_FILE = path.join(__dirname, '.auth', 'admin-state.json')
const PROFILE_DIR = path.join(__dirname, '.auth', 'profile')
const RESULTS_DIR = path.join(__dirname, '.auth', 'results')

interface RouteAxeResult {
  route: string
  source: string
  violations: Array<{
    id: string
    impact: string | null
    help: string
    helpUrl: string
    nodes: Array<{ target: string[] }>
  }>
  error?: string
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

test('WCAG 2 A and AA scan reports every route', async () => {
  test.setTimeout(900_000)
  expect(fs.existsSync(AUTH_FILE), 'Run the headed authentication test first').toBe(true)
  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    // The identity provider's silent sign-in only completes in a headed browser.
    headless: false,
    ignoreHTTPSErrors: true,
  })
  const page = context.pages()[0] ?? (await context.newPage())
  const routeResults: RouteAxeResult[] = []
  const resolvedRoutes = await resolveRoutes(page)

  for (const { entry, path: routePath } of resolvedRoutes) {
    try {
      await page.goto(`${APP_ORIGIN}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.locator('main, [role="alert"]').first().waitFor({ state: 'visible', timeout: 30_000 })
      await page.waitForTimeout(800)
      if (page.url().includes('login.microsoftonline.com') || page.url().includes('/Account/ForceLogin')) {
        throw new Error('Session expired — re-authenticate before the axe run.')
      }
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      const violations = scan.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact ?? null,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({ target: node.target.map(String) })),
      }))
      routeResults.push({ route: routePath, source: entry.source, violations })
      process.stdout.write(`AXE ${routePath} violations=${violations.length}\n`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      routeResults.push({ route: routePath, source: entry.source, violations: [], error: message })
      process.stdout.write(`AXE ${routePath} scan-error=${message}\n`)
    }
  }

  await context.close()
  fs.writeFileSync(path.join(RESULTS_DIR, 'axe.json'), JSON.stringify({ routes: routeResults }, null, 2))
  expect(routeResults).toHaveLength(ROUTE_COUNT)
  expect(
    routeResults.filter(result => result.error),
    'See e2e/.auth/results/axe.json',
  ).toEqual([])
})
