import { test, expect } from '@playwright/test';

// Exercises the app-level init boundary (renderer.tsx + wasmBridge.ts's
// idle/loading/ready/failed state machine) end to end, against the real
// WASM binary and a real Chromium page — not a mocked unit test. Complements
// wasmInit.test.ts (pure state-machine logic) and wasmContract.test.ts (real
// WASM calls without the app shell): this file is the only place that
// proves the *rendering* contract (no WASM-dependent UI before ready, a
// real failure panel instead of infinite loading) actually holds.
test.describe('WASM initialization contract', () => {
  test('does not render WASM-dependent UI before WASM is ready', async ({ page }) => {
    // Delay the .wasm binary fetch so the 'loading' window is wide enough
    // to assert on — on a fast local run the real init can otherwise
    // resolve before Playwright gets a chance to observe it.
    await page.route('**/*.wasm', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto('/');
    const root = page.getByTestId('app-root');

    await expect(root).toHaveAttribute('data-wasm-status', 'loading');
    await expect(page.getByTestId('wasm-loading')).toBeVisible();
    await expect(page.getByTestId('molecule-canvas')).toHaveCount(0);
    await expect(page.getByTestId('sidebar')).toHaveCount(0);

    await expect(root).toHaveAttribute('data-wasm-status', 'ready', { timeout: 15000 });
    await expect(page.getByTestId('molecule-canvas')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('shows a real error panel, not infinite loading, when WASM init fails', async ({ page }) => {
    await page.route('**/*.wasm', (route) => route.abort('failed'));

    await page.goto('/');
    const root = page.getByTestId('app-root');

    await expect(root).toHaveAttribute('data-wasm-status', 'failed', { timeout: 15000 });
    await expect(page.getByTestId('wasm-failed')).toBeVisible();
    await expect(page.getByTestId('wasm-loading')).toHaveCount(0);
    await expect(page.getByTestId('molecule-canvas')).toHaveCount(0);
    await expect(page.getByTestId('sidebar')).toHaveCount(0);
  });
});
