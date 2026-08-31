import { test, expect, Locator, Page } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression tests for accessibility Phase B2 (`/greenlane` autonomous work,
// user-approved design: "Roving focus + Shift modifier"). The canvas is a
// raster <canvas> with no per-atom DOM nodes to query, so these tests
// observe behavior through the two text channels the feature itself
// produces: the role="status" live-region announcer (wired to
// useUIStore's setStatus, Phase B2) and the canvas's own aria-label atom/
// bond-count summary (Phase B1).
async function clearCanvas(page: Page, canvas: Locator) {
  await canvas.focus();
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');
}

test.describe('Canvas keyboard editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('focusing the canvas auto-selects and announces the first atom', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');

    await canvas.focus();
    // Default sample is benzene — every atom is Carbon bonded to 2 others,
    // so this is true regardless of which specific atom id loads first.
    await expect(status).toHaveText('Canvas focused. Carbon, bonded to 2 atoms.');
  });

  test('Shift+element adds atoms bonded to the focused one, building a chain', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    await page.keyboard.press('Shift+C');
    await expect(status).toHaveText('Added Carbon.');
    await expect(canvas).toHaveAttribute('aria-label', /1 atom, 0 bonds/);

    await page.keyboard.press('Shift+N');
    await expect(status).toHaveText('Added Nitrogen, bonded to 1 atom.');
    await expect(canvas).toHaveAttribute('aria-label', /2 atoms, 1 bond/);

    await page.keyboard.press('Shift+O');
    await expect(status).toHaveText('Added Oxygen, bonded to 1 atom.');
    await expect(canvas).toHaveAttribute('aria-label', /3 atoms, 2 bonds/);
  });

  test('undo and redo announce the resulting structure summary', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    await page.keyboard.press('Shift+C');
    await page.keyboard.press('Shift+N');
    await expect(canvas).toHaveAttribute('aria-label', /2 atoms, 1 bond/);

    await page.keyboard.press('Control+z');
    await expect(status).toHaveText('Undid last edit. 1 atom, 0 bonds.');
    await expect(canvas).toHaveAttribute('aria-label', /1 atom, 0 bonds/);

    await page.keyboard.press('Control+Shift+z');
    await expect(status).toHaveText('Redid last edit. 2 atoms, 1 bond.');
    await expect(canvas).toHaveAttribute('aria-label', /2 atoms, 1 bond/);
  });

  test('arrow keys move the roving atom focus between distinct atoms', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    // Selection follows the newly added atom, so after this we're focused
    // on Nitrogen (the 2nd, most recently added atom).
    await page.keyboard.press('Shift+C');
    await page.keyboard.press('Shift+N');
    await expect(status).toHaveText('Added Nitrogen, bonded to 1 atom.');

    await page.keyboard.press('ArrowLeft');
    await expect(status).toHaveText('Carbon, bonded to 1 atom');

    await page.keyboard.press('ArrowRight');
    await expect(status).toHaveText('Nitrogen, bonded to 1 atom');
  });

  test('Enter starts bond mode; arrow keys choose a target; a number key confirms the bond order', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    // Chain: Carbon(1) - Nitrogen(2) - Oxygen(3). Focus ends on Oxygen.
    await page.keyboard.press('Shift+C');
    await page.keyboard.press('Shift+N');
    await page.keyboard.press('Shift+O');
    await expect(canvas).toHaveAttribute('aria-label', /3 atoms, 2 bonds/);

    // Move focus to Carbon, the chain's other end — not yet bonded to Oxygen.
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(status).toHaveText('Carbon, bonded to 1 atom');

    await page.keyboard.press('Enter');
    await expect(status).toHaveText(
      'Bond mode from Carbon, bonded to 1 atom. Arrow keys choose a target, 1-4 sets bond order, Escape cancels.'
    );

    // Cycle the bond-target candidate — Nitrogen (already bonded to Carbon)
    // comes first in id order, Oxygen second.
    await page.keyboard.press('ArrowRight');
    await expect(status).toHaveText('Bond target: Nitrogen, bonded to 2 atoms. Press 1-4 for bond order, Escape to cancel.');
    await page.keyboard.press('ArrowRight');
    await expect(status).toHaveText('Bond target: Oxygen, bonded to 1 atom. Press 1-4 for bond order, Escape to cancel.');

    await page.keyboard.press('2'); // double bond, closing the ring
    await expect(status).toHaveText('Bonded to Oxygen.');
    await expect(canvas).toHaveAttribute('aria-label', /3 atoms, 3 bonds/);
  });

  test('confirming a bond to an already-bonded atom reports it instead of duplicating', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    await page.keyboard.press('Shift+C');
    await page.keyboard.press('Shift+N'); // Carbon-Nitrogen bond exists; focus on Nitrogen
    await page.keyboard.press('ArrowLeft'); // back to Carbon
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight'); // only other atom is Nitrogen, already bonded
    await page.keyboard.press('1');

    await expect(status).toHaveText('These atoms are already bonded.');
    await expect(canvas).toHaveAttribute('aria-label', /2 atoms, 1 bond/); // unchanged, no duplicate bond
  });

  test('Escape cancels bond mode without creating a bond', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    await page.keyboard.press('Shift+C');
    await page.keyboard.press('Shift+N');
    await page.keyboard.press('Shift+O');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft'); // focus on Carbon
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');

    await expect(status).toHaveText('Bond creation cancelled.');
    await expect(canvas).toHaveAttribute('aria-label', /3 atoms, 2 bonds/); // unchanged
  });

  test('bare letter-key tool switching is unaffected by Shift+letter atom-adding', async ({ page }) => {
    // Regression guard: useKeyboard.ts's tool-switch map is keyed on the
    // lowercase letter, so it must never fire for Shift+letter, and
    // Shift+letter must never fire for a bare letter press.
    const canvas = page.getByTestId('molecule-canvas');
    const status = page.getByRole('status');
    await clearCanvas(page, canvas);

    await page.keyboard.press('c'); // bare — switches active tool only
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');
    await expect(status).not.toHaveText(/^Added/);
  });
});
