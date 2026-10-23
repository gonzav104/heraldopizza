import { defineConfig, devices } from '@playwright/test'
import { localStackEnv } from './e2e/local-stack.ts'

// End-to-end tests (U5) run against the LOCAL Supabase stack only: Vite serves the app with the local stack's URL and
// publishable key (see e2e/local-stack.ts, which stops the run for any non-local API).

const PORT = 5199
// A second dev server whose BUILD ENVIRONMENT sets VITE_WHATSAPP_ENABLED=true, only for the specs that exercise the real
// link (P6b-2). It never touches a .env file and nothing outside this config enables the link; WhatsApp is intercepted.
const WHATSAPP_PORT = 5198
const WHATSAPP_SPEC = /whatsapp-habilitado\.spec\.ts/

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
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
    { name: 'mobile', testIgnore: WHATSAPP_SPEC, use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    // The link with the setting on, as a phone and as a desktop sees it. Only Chromium is installed: the iPhone is
    // emulated (viewport, user agent, touch) on Chromium, so it does not exercise Safari's own pop-up rules.
    ...[
      { name: 'whatsapp-android', device: devices['Pixel 7'] },
      { name: 'whatsapp-iphone', device: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' as const } },
      { name: 'whatsapp-escritorio', device: devices['Desktop Chrome'] },
    ].map(({ name, device }) => ({
      name,
      testMatch: WHATSAPP_SPEC,
      use: { ...device, baseURL: `http://localhost:${WHATSAPP_PORT}` },
    })),
  ],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      env: localStackEnv(),
    },
    {
      command: `npx vite --port ${WHATSAPP_PORT} --strictPort`,
      url: `http://localhost:${WHATSAPP_PORT}`,
      reuseExistingServer: false,
      env: { ...localStackEnv(), VITE_WHATSAPP_ENABLED: 'true' },
    },
  ],
})
