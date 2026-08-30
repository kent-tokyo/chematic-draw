import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test: every unselected atom rendered as a flat white circle
// regardless of element (CanvasRenderer.ts's drawAtom used the same
// `colors.atom` fill for all of them) — only the text label distinguished
// C from N from O, hurting quick visual scanning of a structure the way
// real CPK element coloring is meant to help with.
test.describe('Canvas element colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('a Nitrogen atom is filled with its CPK color, not plain white', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');
    const posN = { x: Math.round(box.width * 0.3), y: Math.round(box.height * 0.5) };
    // Placing a second, unrelated atom elsewhere first: the atom-tool's
    // own most-recently-placed atom stays visually highlighted (orange,
    // the selected-state override) rather than its element color, which
    // this test isn't about — sampling this second atom avoids that
    // entirely instead of fighting it via an explicit deselect.
    const posO = { x: Math.round(box.width * 0.7), y: Math.round(box.height * 0.5) };

    await canvas.focus();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.locator('button[title="N [N]"]').click();
    await canvas.click({ position: posN });
    await page.locator('button[title="O [O]"]').click();
    await canvas.click({ position: posO });
    await expect(canvas).toHaveAttribute('aria-label', /2 atoms, 0 bonds/);

    // Sample a small ring of points around the Oxygen atom's center rather
    // than dead-center: the element label ("O") is drawn centered on that
    // exact point, so a single center-pixel sample lands on black glyph
    // pixels, not the surrounding fill color.
    const pixels = await page.evaluate(({ x, y }) => {
      const el = document.querySelector('[data-testid="molecule-canvas"]') as HTMLCanvasElement;
      const ctx = el.getContext('2d')!;
      const offsets = [
        [6, 0], [-6, 0], [0, 6], [0, -6],
        [4, 4], [-4, 4], [4, -4], [-4, -4],
      ];
      return offsets.map(([dx, dy]) => {
        const { data } = ctx.getImageData(x + dx, y + dy, 1, 1);
        return { r: data[0], g: data[1], b: data[2] };
      });
    }, posO);

    // Oxygen's assigned CPK color is #f28b82 (242, 139, 130) — a
    // distinctly red-tinted fill, clearly different from plain white
    // (255, 255, 255, where all three channels are equal) or the old flat
    // atom fill. Require at least one sampled point where red is clearly
    // the dominant channel over both green and blue, instead of asserting
    // an exact RGB triple at one exact pixel.
    const hasRedDominantPixel = pixels.some(
      (p) => p.r > p.g + 30 && p.r > p.b + 30 && p.r < 253
    );
    expect(hasRedDominantPixel).toBe(true);
  });
});
