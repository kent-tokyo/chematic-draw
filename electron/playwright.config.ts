import { defineConfig, devices } from '@playwright/test';

// Two genuinely different kinds of E2E test live here, split into separate
// projects rather than one config pretending to be Electron:
//
// - renderer-e2e: a real Chromium browser (not Electron) driving the
//   renderer against a standalone Vite dev server. Fast, no build step
//   required, but never touches preload.js/contextBridge/window.electronAPI
//   — it can't prove anything about the actual Electron app shell.
// - electron-smoke: launches the real, built Electron app via Playwright's
//   _electron API. Requires `npm run package` (or `make`) first — running
//   `npm start` (dev mode) beforehand instead leaves `.vite/build/main.js`
//   bundled with MAIN_WINDOW_VITE_DEV_SERVER_URL truthy, so main.js's own
//   (correct) dev-only DevTools guard fires for real: the freshly-launched
//   app opens DevTools as its first window, and this suite's
//   `firstWindow()` picks that up instead of the app window, failing with
//   `expect(page).toHaveTitle('chematic-draw')` received `"DevTools"` — a
//   stale-build symptom, not an app bug. Re-run `npm run package` if you
//   see that failure. This is the only suite that actually exercises the
//   main process and preload bridge.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  expect: { timeout: 5000 },

  webServer: {
    // Standalone renderer dev server only — not `npm start` (which also
    // launches a full, unused Electron process; renderer-e2e drives its own
    // Chromium page against this URL, it never touches that window).
    command: 'npx vite --config vite.renderer.config.mjs',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },

  projects: [
    {
      name: 'renderer-e2e',
      testMatch: 'renderer/**/*.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
    {
      name: 'electron-smoke',
      testMatch: 'electron-smoke/**/*.smoke.ts',
      // No webServer dependency and no browser device profile — this
      // project launches its own Electron process per test via _electron.
      use: {
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
      },
    },
  ],
});
