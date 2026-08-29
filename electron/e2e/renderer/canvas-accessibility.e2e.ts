import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test for accessibility Phase B1 (`/greenlane` autonomous work,
// user-scoped as the minimum-viable canvas fix): MoleculeCanvas is a raw
// HTML5 <canvas> — atoms/bonds have zero DOM representation, so a screen
// reader could perceive nothing here at all before this. role="img" +
// aria-label gives it a discoverable, real chemical description instead.
test.describe('Canvas accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('exposes an accessible name describing the loaded molecule', async ({ page }) => {
    const canvas = page.getByRole('img', { name: /Molecular structure/ });
    await expect(canvas).toBeVisible();

    // Cheap atom/bond-count summary is available immediately (no WASM call).
    await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    // The formula/MW half needs a debounced WASM call (see MoleculeCanvas.tsx)
    // so it can't be instant — benzene loads by default on mount.
    await expect(canvas).toHaveAttribute('aria-label', /C6H6/, { timeout: 3000 });
  });

  test('the accessible name updates after an edit, not just on first load', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    // Select-all + Delete empties the canvas without needing exact
    // atom-placement click coordinates. useKeyboard.ts's handler is a
    // window-level listener and accepts either Ctrl or Cmd for select-all
    // (e.ctrlKey || e.metaKey), so this combo works on both platforms.
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');

    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');
  });
});
