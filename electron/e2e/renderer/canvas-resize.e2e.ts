import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test: MoleculeCanvas.tsx's resize handler sets the <canvas>
// element's width/height attributes directly to match its parent's new
// size — an unavoidable side effect of that assignment is that it wipes
// the canvas's own drawing buffer (a standard <canvas> behavior, not a bug
// in this app). The separate render effect that actually draws the
// molecule didn't list the canvas's own size among its dependencies, so
// nothing told it to redraw after that wipe — the molecule stayed correct
// in application state (atom/bond counts, aria-label) while the canvas
// itself went visually blank until some unrelated state change (a hover,
// a selection) happened to also trigger that effect. Proven here by
// sampling actual rendered pixels, not just aria-label/state, since state
// was never wrong — only the pixels were.
async function canvasHasNonBackgroundPixel(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="molecule-canvas"]') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Dark theme background is #1e1e1e (30, 30, 30). Grid lines are also a
    // near-background gray, so require a real brightness jump, not just
    // "not exactly equal", to avoid false positives on grid pixels alone.
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 120 || data[i + 1] > 120 || data[i + 2] > 120) return true;
    }
    return false;
  });
}

test.describe('Canvas resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('the molecule stays visually rendered after the window is resized', async ({ page }) => {
    expect(await canvasHasNonBackgroundPixel(page)).toBe(true);

    await page.setViewportSize({ width: 1400, height: 900 });
    // The resize handler is synchronous, but give the ResizeObserver
    // callback and the subsequent React render/paint a tick.
    await page.waitForTimeout(300);

    expect(await canvasHasNonBackgroundPixel(page)).toBe(true);
  });
});
