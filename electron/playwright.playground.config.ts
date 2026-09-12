import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/playground',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'line',
  timeout: 30000,
  expect: { timeout: 8000 },
  webServer: {
    command: 'node scripts/serve-playground.mjs',
    url: 'http://127.0.0.1:4174/chematic-draw/playground/',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [{
    name: 'playground-built-site',
    testMatch: '**/*.e2e.ts',
    use: {
      ...devices['Desktop Chrome'],
      baseURL: 'http://127.0.0.1:4174/chematic-draw/playground/',
      permissions: ['clipboard-read', 'clipboard-write'],
      screenshot: 'only-on-failure',
      trace: 'on-first-retry',
    },
  }],
});
