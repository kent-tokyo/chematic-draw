import { Page, expect } from '@playwright/test';

/**
 * Wait for the app's WASM module to finish loading, using the explicit
 * data-ready attribute on #app-root rather than networkidle — networkidle
 * only proves the network went quiet, not that wasmBridge.initWasm()
 * actually resolved and the UI reflects it.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
    timeout: 15000,
  });
}
