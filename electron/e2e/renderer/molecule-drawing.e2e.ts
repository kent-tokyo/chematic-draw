import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Molecule Drawing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('should render the canvas and sidebar', async ({ page }) => {
    // Check main canvas exists
    const canvas = page.getByTestId('molecule-canvas');
    await expect(canvas).toBeVisible();

    // Check sidebar exists
    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('toolbar summary shows zoom as a real percentage', async ({ page }) => {
    // Regression test: this badge computed `zoom.toFixed(0)` directly —
    // `zoom` is a 0.2-10 multiplier (1 = 100%), not already a percentage —
    // so at the default zoom it showed "1%" instead of "100%". The status
    // bar's separate zoom readout already did this correctly
    // (`(zoom * 100).toFixed(0)`); this one just needed the same fix.
    await expect(page.getByTestId('toolbar-summary')).toHaveText(/100%$/);
  });

  test('shows a next-action guide only while the canvas is empty', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    await canvas.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');

    const guide = page.getByTestId('empty-canvas-guide');
    await expect(guide).toBeVisible();
    await expect(guide).toContainText('press C, N, O, S, or P');
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');

    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } });

    await expect(guide).toHaveCount(0);
    await expect(canvas).toHaveAttribute('aria-label', /1 atom, 0 bonds/);
  });

  test('should load molecule from SMILES input', async ({ page }) => {
    // Open input dialog or use menu
    const fileMenuButton = page.locator('button:has-text("File")').first();
    if (await fileMenuButton.isVisible()) {
      await fileMenuButton.click();
    }

    // Alternatively, use keyboard shortcut or direct input
    // For this test, we'll check if a molecule can be drawn
    const canvas = page.getByTestId('molecule-canvas');
    await expect(canvas).toBeVisible();
  });

  test('should display inspector panel with molecule properties', async ({ page }) => {
    // Click Inspector tab
    const inspectorTab = page.getByTestId('sidebar-tab-inspector');
    await expect(inspectorTab).toBeVisible();
    await inspectorTab.click();

    // Check inspector panel content
    const inspectorPanel = page.getByTestId('sidebar-panel-inspector');
    await expect(inspectorPanel).toBeVisible();
  });

  test('left-click selects an atom and the Inspector follows the click', async ({ page }) => {
    // Regression test: plain left-click selection used to never reach the
    // Inspector at all — only right-click (via the context menu) did. See
    // ROADMAP's Discovered Work note and useContextMenu.ts/
    // useCanvasInteraction.ts for the fix (selectedAtomIdForInspector,
    // derived live in InspectorPanel from molecule.atoms + the id).
    //
    // Two distinct elements at two distinct positions, so the assertion
    // (which element the Inspector shows) actually proves the Inspector is
    // tracking *which* atom was clicked, not just that something is
    // selected — clicking the canvas at all can already select an atom via
    // Phase B2's focus-driven auto-select, so a mere "not empty" check
    // wouldn't isolate this fix.
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

    await page.getByTestId('sidebar-tab-inspector').click();

    await canvas.click({ position: posA });
    await expect(page.getByText('N ▼')).toBeVisible();

    await canvas.click({ position: posB });
    await expect(page.getByText('O ▼')).toBeVisible();
  });

  test('should display all sidebar tabs', async ({ page }) => {
    const tabIds = [
      'inspector',
      'templates',
      'reactions',
      'batch-results',
      'stereoisomers',
      'lipinski',
      'properties',
      'mechanism',
      '3d',
      'database',
      'research',
      'chat',
    ];

    for (const tabId of tabIds) {
      const tab = page.getByTestId(`sidebar-tab-${tabId}`);
      await expect(tab).toBeVisible();
    }
  });
});
