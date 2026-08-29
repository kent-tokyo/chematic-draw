import { Page, expect } from '@playwright/test';

/**
 * Wait for the app's WASM module to finish loading, using the explicit
 * data-ready attribute on #app-root rather than networkidle — networkidle
 * only proves the network went quiet, not that wasmBridge.initWasm()
 * actually resolved and the UI reflects it.
 *
 * data-ready flipping true only proves that render committed — it doesn't
 * prove React has flushed the useEffects that run just after (e.g.
 * useKeyboard's window keydown listener attaching). A key press sent in
 * that gap is silently dropped, no error, nothing to retry: found as
 * intermittent "F1 didn't open the Shortcuts modal" failures that got
 * more frequent (not caused) as more hook work landed in the same
 * component tree per render, widening the window. The double
 * requestAnimationFrame round-trip reliably waits past React's
 * post-commit effect flush without an arbitrary magic-number sleep.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
    timeout: 15000,
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))))
  );
}
