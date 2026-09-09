import { defineConfig } from '@playwright/test';

// Electron smoke tests launch the packaged application themselves. Keeping
// this config separate prevents Playwright from starting the renderer-only
// Vite dev server, which is both unnecessary and a source of false failures
// when the environment disallows binding localhost ports.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  expect: { timeout: 5000 },
  projects: [{
    name: 'electron-smoke',
    testMatch: 'electron-smoke/**/*.smoke.ts',
    use: {
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
  }],
});
