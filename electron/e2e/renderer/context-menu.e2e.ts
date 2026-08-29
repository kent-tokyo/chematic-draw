import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test for a real bug found while auditing docs/TUTORIAL.md: the
// atom right-click context menu's "Set Element"/"Charge +1"/"Charge -1"
// items only called console.log and did nothing visible. "Set Element" was
// removed (it needs the full ElementPicker widget, not a single menu
// action); Charge +1/-1 were wired to the real updateAtom action.
test.describe('Atom context menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Set Element is gone; Charge +1 actually changes the atom charge', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');

    const atomPos = { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 };

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: atomPos });
    await page.locator('button[title="Select [ESC]"]').click();

    await canvas.click({ position: atomPos, button: 'right' });

    await expect(page.getByRole('button', { name: 'Charge +1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Charge -1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Atom' })).toBeVisible();
    await expect(page.getByText('Set Element')).toHaveCount(0);

    await page.getByRole('button', { name: 'Charge +1' }).click();

    // The Inspector's `selectedAtomForInspector` is only ever populated by
    // the context-menu right-click handler (a separate, real gap from this
    // fix — plain left-click selection never touches it) and is a snapshot,
    // not a live reference, so it still shows the pre-update charge. Right-
    // click the same atom again to refresh it with the atom's current state,
    // then confirm the Inspector's +1 charge button is now the active one.
    await canvas.click({ position: atomPos, button: 'right' });
    await page.keyboard.press('Escape');
    const plusOneButton = page.getByRole('button', { name: '+1', exact: true });
    await expect(plusOneButton).toHaveCSS('background-color', 'rgb(77, 141, 255)');
  });
});
