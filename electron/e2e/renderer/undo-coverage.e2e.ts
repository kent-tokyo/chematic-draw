import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression tests for a class of bugs found by cross-referencing every
// mutating moleculeStore action (addAtom/updateAtom/removeAtom/addBond/
// updateBond/removeBond/setMolecule) against pushUndo() call sites.
// pushUndo() snapshots the pre-mutation molecule onto undoStack — any
// mutation not preceded by it is invisible to Ctrl+Z, and worse, makes the
// *next* real Ctrl+Z jump further back than the user expects, since the
// un-pushed edit's "before" state was never captured.
test.describe('Undo coverage for previously un-pushed mutations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('dragging an atom to reposition it is undoable', async ({ page }) => {
    // useCanvasInteraction.ts's onMouseMove updated an atom's x/y on every
    // tick of a Select-tool drag with no pushUndo() anywhere in the drag
    // lifecycle (not at mousedown, not at mouseup) — a repositioned atom
    // could never be moved back with Ctrl+Z.
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const posA = { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 };
    const posB = { x: canvasBox.width * 0.7, y: canvasBox.height * 0.7 };

    await canvas.focus();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: posA });

    await page.locator('button[title="Select [ESC]"]').click();
    await page.getByTestId('sidebar-tab-inspector').click();

    const info = page.getByText(/Position: \(/);

    // mousedown on the atom both selects it (populating the Inspector)
    // and starts the drag, exactly like a real user's click-and-drag.
    await page.mouse.move(canvasBox.x + posA.x, canvasBox.y + posA.y);
    await page.mouse.down();
    await expect(info).toBeVisible();
    const before = await info.textContent();

    await page.mouse.move(canvasBox.x + posB.x, canvasBox.y + posB.y);
    await page.mouse.up();
    await expect(info).not.toHaveText(before ?? '');

    await page.keyboard.press('Control+z');
    await expect(info).toHaveText(before ?? '');
  });

  test('changing an atom element via the Inspector is undoable', async ({ page }) => {
    // Representative case for the other previously-un-pushed sites found by
    // the same sweep: InspectorPanel.tsx's handleAtomUpdate/handleBondUpdate
    // (Element/Charge/Isotope, bond order/stereo) and StereoisomerPanel.tsx's
    // "use this isomer" button all called a mutating store action with no
    // pushUndo() at all — every edit made through them was permanently
    // un-undoable, not just imprecise like the drag case above. Fixed
    // identically in each: pushUndo() right before the mutation.
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const pos = { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 };

    await canvas.focus();
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: pos });

    await page.locator('button[title="Select [ESC]"]').click();
    await canvas.click({ position: pos });
    await page.getByTestId('sidebar-tab-inspector').click();

    const elementButton = page.getByText('C ▼');
    await expect(elementButton).toBeVisible();

    await elementButton.click();
    await page.getByRole('button', { name: 'N', exact: true }).click();
    await expect(page.getByText('N ▼')).toBeVisible();

    await page.keyboard.press('Control+z');
    await expect(page.getByText('C ▼')).toBeVisible();
  });
});
