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

  test('Set Element and Charge +1 change the atom through the real context menu', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Set Element…' }).click();
    const elementPicker = page.getByTestId('context-element-picker');
    await expect(elementPicker).toBeVisible();
    await elementPicker.getByRole('button', { name: 'C ▼', exact: true }).click();
    await elementPicker.getByRole('button', { name: 'N', exact: true }).click();

    // The menu closes after the mutation and the canvas renders the new
    // element. The Inspector is the user-visible DOM proof of the same atom.
    await page.getByTestId('sidebar-tab-inspector').click();
    await expect(page.getByText('N ▼')).toBeVisible();

    await canvas.click({ position: atomPos, button: 'right' });

    await page.getByRole('button', { name: 'Charge +1' }).click();

    // The Inspector derives its atom live from molecule.atoms + the tracked
    // id on every render, so the charge update is reflected immediately —
    // no need to re-click to "refresh" a stale snapshot.
    const plusOneButton = page.getByRole('button', { name: '+1', exact: true });
    await expect(plusOneButton).toHaveCSS('background-color', 'rgb(77, 141, 255)');
  });

  test('right-clicking empty canvas after selecting an atom shows the canvas menu, not atom items', async ({ page }) => {
    // Regression test: ContextMenu.tsx used to branch on uiStore's
    // selectedAtomIdForInspector/selectedBondForInspector (the "what should
    // the Inspector show" state) instead of contextMenu's own atomId/bondId
    // (the "what was just right-clicked" state). Once any atom had ever
    // been selected in the session, selectedAtomIdForInspector stayed
    // non-null forever, so the atom-menu branch always won — right-clicking
    // empty canvas (or a bond) after selecting any atom would still show
    // "Charge +1"/"Delete Atom" instead of the canvas or bond menu.
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const atomPos = { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 };
    const emptyPos = { x: canvasBox.width * 0.05, y: canvasBox.height * 0.95 };

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: atomPos });
    await page.locator('button[title="Select [ESC]"]').click();
    await canvas.click({ position: atomPos });

    await canvas.click({ position: emptyPos, button: 'right' });

    await expect(page.getByRole('button', { name: 'Clean Layout' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Charge +1' })).toHaveCount(0);
  });

  test('right-clicking a different atom updates the Inspector to it, even while another atom stays selected', async ({ page }) => {
    // Regression test: InspectorPanel used to fall back to whichever atom
    // was marked `selected` (the mouse/keyboard multi-select flag) whenever
    // the right-clicked atom itself wasn't part of that set — right-click
    // never touches `selected`, so right-clicking atom B while atom A was
    // still selected from an earlier left-click showed A's details, not B's.
    //
    // Right-clicking with the Select tool active doesn't isolate this:
    // useCanvasInteraction's onMouseDown doesn't filter by mouse button, so
    // a Select-tool right-click ALSO calls selectAtom (same as a left-click
    // would) in addition to useContextMenu's own handler — both end up
    // targeting the same atom, masking the bug. A non-Select tool's
    // onMouseDown branch doesn't call selectAtom at all, isolating
    // useContextMenu's independent path.
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const posA = { x: canvasBox.width * 0.2, y: canvasBox.height * 0.2 };
    const posB = { x: canvasBox.width * 0.8, y: canvasBox.height * 0.8 };

    await page.locator('button[title="N [N]"]').click();
    await canvas.click({ position: posA });
    await page.locator('button[title="O [O]"]').click();
    await canvas.click({ position: posB });
    await page.locator('button[title="Select [ESC]"]').click();

    // Left-click leaves N (posA) as the `selected` atom.
    await canvas.click({ position: posA });

    // Switch off the Select tool, then right-click O (posB) — never
    // left-clicked, so never `selected`.
    await page.locator('button[title="─ [1]"]').click();
    await canvas.click({ position: posB, button: 'right' });

    await page.getByTestId('sidebar-tab-inspector').click();
    await expect(page.getByText('O ▼')).toBeVisible();
  });

  test('selecting a bond after an atom clears the atom out of the Inspector', async ({ page }) => {
    // Regression test: the atom and bond Inspector selection ids
    // are independent uiStore fields — nothing cleared either one when the
    // other was set. Left-click an atom (sets the atom id), then right-click
    // a bond (sets the bond) left both non-null, so InspectorPanel rendered
    // the atom's Element/Charge/Isotope fields stacked above the bond's
    // order/stereo controls at the same time.
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const posA = { x: canvasBox.width * 0.2, y: canvasBox.height * 0.2 };
    const posB = { x: canvasBox.width * 0.4, y: canvasBox.height * 0.2 };

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: posA });
    await canvas.click({ position: posB });

    await page.locator('button[title="─ [1]"]').click();
    await page.mouse.move(canvasBox.x + posA.x, canvasBox.y + posA.y);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + posB.x, canvasBox.y + posB.y);
    await page.mouse.up();

    await page.locator('button[title="Select [ESC]"]').click();
    await canvas.click({ position: posA });

    await page.getByTestId('sidebar-tab-inspector').click();
    await expect(page.getByText('Atom ID:')).toBeVisible();

    const bondMid = { x: (posA.x + posB.x) / 2, y: posA.y };
    await canvas.click({ position: bondMid, button: 'right' });

    await expect(page.getByRole('button', { name: 'Single Bond', exact: true })).toBeVisible();
    await expect(page.getByText('Atom ID:')).toHaveCount(0);
  });

  test('editing a bond keeps the Inspector values live', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const posA = { x: canvasBox.width * 0.25, y: canvasBox.height * 0.5 };
    const posB = { x: canvasBox.width * 0.45, y: canvasBox.height * 0.5 };

    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: posA });
    await canvas.click({ position: posB });
    await page.locator('button[title="─ [1]"]').click();
    await page.mouse.move(canvasBox.x + posA.x, canvasBox.y + posA.y);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + posB.x, canvasBox.y + posB.y);
    await page.mouse.up();

    await page.locator('button[title="Select [ESC]"]').click();
    await page.getByTestId('sidebar-tab-inspector').click();
    const bondMid = { x: (posA.x + posB.x) / 2, y: posA.y };
    await canvas.click({ position: bondMid, button: 'right' });
    await page.getByRole('button', { name: 'Double Bond', exact: true }).click();

    // The context-menu mutation updates molecule state. Inspector must derive
    // the selected bond from that state instead of retaining the old object.
    await expect(page.locator('select')).toHaveValue('2');

    await canvas.click({ position: bondMid, button: 'right' });
    await page.getByRole('button', { name: 'Dash Down', exact: true }).click();
    await expect(page.getByRole('button', { name: '⌞ Dash', exact: true })).toHaveCSS('background-color', 'rgb(77, 141, 255)');
  });
});
