import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Research panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('MW updates live when an atom is transmuted in place while the tab stays open', async ({ page }) => {
    // Regression test: ResearchPanel.tsx gated its property-recompute effect
    // on `molKey`, a coarse `${atoms.length}:${bonds.length}` fingerprint —
    // an eslint-disable-next-line silenced the exhaustive-deps warning that
    // the effect actually reads the fuller `molecule`. Clicking an existing
    // atom with an atom tool selected (useCanvasInteraction.ts) transmutes
    // it via updateAtom() without changing atom/bond counts, so with the
    // Research tab already open and the canvas still interactive underneath
    // it, that edit never re-triggered the effect — the panel kept showing
    // the pre-edit molecule's properties indefinitely.
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const pos = { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 };

    // Start from an empty canvas for a deterministic single-atom molecule.
    await canvas.focus();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: pos });
    await expect(canvas).toHaveAttribute('aria-label', /1 atom, 0 bonds/);

    await page.getByTestId('sidebar-tab-research').click();
    const mw = page.getByTestId('research-mw');
    await expect(mw).not.toHaveText('', { timeout: 10000 });
    const carbonMw = await mw.textContent();

    // Transmute the same atom to Nitrogen without ever leaving the
    // Research tab — the exact path the stale `molKey` missed.
    await page.locator('button[title="N [N]"]').click();
    await canvas.click({ position: pos });

    await expect(mw).not.toHaveText(carbonMw ?? '', { timeout: 10000 });
  });

  test('shows generated InChI identifiers for the current molecule', async ({ page }) => {
    await page.getByTestId('sidebar-tab-research').click();

    const identifiers = page.getByTestId('research-identifiers');
    await expect(identifiers).toBeVisible();
    await expect(page.getByTestId('research-inchi')).not.toHaveText('Unavailable');
    await expect(page.getByTestId('research-inchi')).toContainText('InChI=');
    await expect(page.getByTestId('research-inchikey')).not.toHaveText('Unavailable');
    await expect(identifiers).toContainText('approximation');
  });
});
