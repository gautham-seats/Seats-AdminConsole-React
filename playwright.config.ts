import { defineConfig, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const authFile = path.join(__dirname, 'e2e', '.auth', 'admin-state.json')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'e2e/.auth/playwright-report.json' }]],
  outputDir: 'e2e/.auth/test-results',
  use: {
    baseURL: 'https://dev.seats.local/admin-next',
    ignoreHTTPSErrors: true,
    storageState: fs.existsSync(authFile) ? authFile : undefined,
    trace: 'retain-on-failure',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
