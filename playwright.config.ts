import { defineConfig, devices } from '@playwright/test'
import { localStackEnv } from './e2e/local-stack.ts'

// End-to-end tests (U5) run against the LOCAL Supabase stack only: Vite serves the app with the local stack's URL and
// publishable key (see e2e/local-stack.ts, which stops the run for any non-local API).

const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: localStackEnv(),
  },
})
