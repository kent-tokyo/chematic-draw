import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Global keyboard shortcuts (useKeyboard)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('zoom keyboard shortcuts apply cumulatively across repeated presses', async ({ page }) => {
    // Regression test: useKeyboard.ts's keydown listener effect had an
    // empty dependency array, so the listener actually registered on
    // `window` only ever closed over the zoom (and molecule/focusMode)
    // value from the very first render. Every "+"/"-" press computed
    // `zoom * 1.2` from that permanently-stale initial value (always 1),
    // so repeated presses never compounded — zoom got stuck at 120% after
    // the first press no matter how many more followed. The same root
    // cause silently broke Ctrl+C (always copied the initial molecule,
    // not the current one) and Ctrl+Shift+F (focus mode could only ever
    // turn on via keyboard, never off) — flagged by
    // react-hooks/exhaustive-deps but never acted on.
    const zoomText = page.getByText(/^Zoom: \d+%$/);
    await expect(zoomText).toHaveText('Zoom: 100%');

    await page.keyboard.press('=');
    await expect(zoomText).toHaveText('Zoom: 120%');

    await page.keyboard.press('=');
    await expect(zoomText).toHaveText('Zoom: 144%'); // stale closure would stick at 120%

    await page.keyboard.press('=');
    await expect(zoomText).toHaveText('Zoom: 173%'); // 1 * 1.2^3, rounded
  });
});
