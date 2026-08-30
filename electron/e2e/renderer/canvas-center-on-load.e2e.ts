import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test: canvasStore's `offset` defaulted to {x:0, y:0} with no
// centering logic at all — a freshly-loaded molecule rendered at its raw
// parsed world coordinates, which for the default benzene sample land very
// close to the canvas's top-left corner (partially clipped even before any
// resize). Fixed by computing the molecule's rendered-pixel centroid and
// asserting it's near the canvas's true center — not just "some pixel is
// non-background" (a corner-hugging ring would pass that trivially), and
// not a single center-pixel sample (a hexagonal ring's own geometric
// center is empty space, inside the ring itself).
async function renderedContentCentroid(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="molecule-canvas"]') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 120 || data[i + 1] > 120 || data[i + 2] > 120) {
        const pixelIndex = i / 4;
        sumX += pixelIndex % width;
        sumY += Math.floor(pixelIndex / width);
        count++;
      }
    }
    return { centroidX: sumX / count, centroidY: sumY / count, width, height };
  });
}

test.describe('Canvas centers content on load', () => {
  test('the default sample molecule is centered in the canvas, not tucked in a corner', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    // Give the ResizeObserver + pendingCenter effect a tick to settle.
    await page.waitForTimeout(300);

    const { centroidX, centroidY, width, height } = await renderedContentCentroid(page);

    // Within 20% of true center on each axis — loose enough to tolerate
    // the ring's own asymmetric pixel distribution (labels, bond lines),
    // tight enough that "still in the top-left corner" clearly fails it.
    expect(centroidX).toBeGreaterThan(width * 0.3);
    expect(centroidX).toBeLessThan(width * 0.7);
    expect(centroidY).toBeGreaterThan(height * 0.3);
    expect(centroidY).toBeLessThan(height * 0.7);
  });
});
