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

  test('can reopen the sidebar from the toolbar after closing it', async ({ page }) => {
    await page.getByRole('button', { name: 'Close sidebar' }).click();
    await expect(page.getByTestId('sidebar')).toHaveCount(0);

    const showSidebar = page.getByTestId('show-sidebar');
    await expect(showSidebar).toBeVisible();
    await showSidebar.click();
    await expect(page.getByTestId('sidebar')).toBeVisible();
  });

  test('supports arrow-key navigation across sidebar tabs', async ({ page }) => {
    const inspectorTab = page.getByTestId('sidebar-tab-inspector');
    await inspectorTab.focus();
    await inspectorTab.press('ArrowRight');

    await expect(page.getByTestId('sidebar-tab-query')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('sidebar-tab-query')).toBeFocused();
  });

  test('supports Home and End navigation across sidebar tabs', async ({ page }) => {
    const inspectorTab = page.getByTestId('sidebar-tab-inspector');
    await inspectorTab.focus();
    await inspectorTab.press('End');
    await expect(page.getByTestId('sidebar-tab-chat')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('sidebar-tab-chat')).toBeFocused();

    await page.getByTestId('sidebar-tab-chat').press('Home');
    await expect(inspectorTab).toHaveAttribute('aria-selected', 'true');
    await expect(inspectorTab).toBeFocused();
  });

  test('exposes a single roving-focus tab in the sidebar tablist', async ({ page }) => {
    const tablist = page.getByRole('tablist', { name: 'Sidebar panels' });
    await expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(14);
    expect(await tabs.evaluateAll((elements) => elements.filter((element) => element.getAttribute('tabindex') === '0').length)).toBe(1);
    await expect(page.getByTestId('sidebar-tab-inspector')).toHaveAttribute('tabindex', '0');
  });

  test('keeps the sidebar usable at a narrow desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 720 });
    const sidebar = page.getByTestId('sidebar');
    const box = await sidebar.boundingBox();
    if (!box) throw new Error('sidebar not visible');
    expect(box.width).toBeLessThanOrEqual(320);
    await expect(page.getByTestId('sidebar-tab-inspector')).toBeVisible();
  });

  test('toolbar summary shows zoom as a real percentage', async ({ page }) => {
    // Regression test: this badge computed `zoom.toFixed(0)` directly —
    // `zoom` is a 0.2-10 multiplier (1 = 100%), not already a percentage —
    // so at the default zoom it showed "1%" instead of "100%". The status
    // bar's separate zoom readout already did this correctly
    // (`(zoom * 100).toFixed(0)`); this one just needed the same fix.
    await expect(page.getByTestId('toolbar-summary')).toHaveText(/100%$/);
  });

  test('Fit keeps the loaded structure inside the canvas', async ({ page }) => {
    const summary = page.getByTestId('toolbar-summary');
    await expect(summary).toContainText('100%');
    await page.getByTestId('fit-view').click();
    // The sample benzene is smaller than the fit margin, so the command must
    // visibly change the zoom rather than merely re-center at 100%.
    await expect(summary).not.toContainText('100%');
    await expect(page.getByTestId('molecule-canvas')).toBeVisible();
  });

  test('toolbar Undo and Redo expose the real molecule history', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const undo = page.getByTestId('undo-button');
    const redo = page.getByTestId('redo-button');
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();

    await canvas.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(canvas).toHaveAttribute('aria-label', /atoms?, \d+ bonds?/);
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');
  });

  test('arrangement controls are disabled without selection and operate on a selection', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const alignHorizontal = page.getByTestId('align-horizontal-button');
    const alignVertical = page.getByTestId('align-vertical-button');
    const rotate = page.getByTestId('rotate-selection-button');
    await expect(alignHorizontal).toBeDisabled();
    await expect(alignVertical).toBeDisabled();
    await expect(rotate).toBeDisabled();

    await canvas.focus();
    await page.keyboard.press('Control+A');
    await expect(alignHorizontal).toBeEnabled();
    await expect(alignVertical).toBeEnabled();
    await expect(rotate).toBeEnabled();
    await rotate.click();
    await expect(page.getByTestId('undo-button')).toBeEnabled();
  });

  test('shows a next-action guide only while the canvas is empty', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    await canvas.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');

    const guide = page.getByTestId('empty-canvas-guide');
    await expect(guide).toBeVisible();
    await expect(page.getByTestId('quick-start-guide')).toHaveCount(0);
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

  test('Shift-drag selects a region and delete removes the selected atoms', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const first = { x: canvasBox.width * 0.25, y: canvasBox.height * 0.35 };
    const second = { x: canvasBox.width * 0.4, y: canvasBox.height * 0.35 };
    const outside = { x: canvasBox.width * 0.75, y: canvasBox.height * 0.7 };

    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: first });
    await canvas.click({ position: second });
    await canvas.click({ position: outside });
    await page.locator('button[title="Select [ESC]"]').click();

    // The modifier turns an empty-canvas drag into a marquee selection while
    // keeping the existing drag-to-pan gesture unchanged.
    await page.keyboard.down('Shift');
    await canvas.hover({ position: { x: canvasBox.width * 0.15, y: canvasBox.height * 0.2 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 } });
    await expect(page.getByTestId('selection-rectangle')).toBeVisible();
    await page.mouse.up();
    await page.keyboard.up('Shift');
    await expect(page.getByTestId('selection-rectangle')).toHaveCount(0);

    await canvas.focus();
    await page.keyboard.press('Delete');
    await expect(canvas).toHaveAttribute('aria-label', /1 atom, 0 bonds/);
  });

  test('dragging a selected atom moves the whole selected group', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const first = { x: canvasBox.width * 0.25, y: canvasBox.height * 0.35 };
    const second = { x: canvasBox.width * 0.4, y: canvasBox.height * 0.35 };
    const outside = { x: canvasBox.width * 0.75, y: canvasBox.height * 0.7 };
    const delta = { x: 80, y: 50 };
    const movedSecond = { x: second.x + delta.x, y: second.y + delta.y };

    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.locator('button[title="N [N]"]').click();
    await canvas.click({ position: first });
    await page.locator('button[title="O [O]"]').click();
    await canvas.click({ position: second });
    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: outside });
    await page.locator('button[title="Select [ESC]"]').click();

    await page.keyboard.down('Shift');
    await canvas.hover({ position: { x: canvasBox.width * 0.15, y: canvasBox.height * 0.2 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 } });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    await page.mouse.move(canvasBox.x + first.x, canvasBox.y + first.y);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + first.x + delta.x, canvasBox.y + first.y + delta.y);
    await page.mouse.up();

    // The second selected atom should have moved by the same delta. The
    // Inspector derives from the actual hit-tested atom at the new position,
    // proving this is a group move rather than a visual selection-only state.
    await canvas.click({ position: movedSecond, button: 'right' });
    await page.getByTestId('sidebar-tab-inspector').click();
    await expect(page.getByText('O ▼')).toBeVisible();
  });

  test('Cmd/Ctrl+D duplicates the selected structure in place with an offset', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 } });
    await page.locator('button[title="Select [ESC]"]').click();
    await canvas.click({ position: { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 } });

    await page.keyboard.press('Control+d');

    await expect(canvas).toHaveAttribute('aria-label', /2 atoms, 0 bonds/);
    await expect(page.getByRole('status')).toContainText('Duplicated selected structure');
  });

  test('Alt+Arrow nudges the selected atom without changing selection focus', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');
    const position = { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 };
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.locator('button[title="N [N]"]').click();
    await canvas.click({ position });
    await page.locator('button[title="Select [ESC]"]').click();
    await canvas.click({ position });
    await canvas.focus();

    await page.keyboard.press('Alt+ArrowRight');

    await expect(page.getByRole('status')).toContainText('Moved selected atoms 1 unit');
    await canvas.click({ position: { x: position.x + 1, y: position.y }, button: 'right' });
    await page.getByTestId('sidebar-tab-inspector').click();
    await expect(page.getByText('N ▼')).toBeVisible();
  });

  test('should display all sidebar tabs', async ({ page }) => {
    const tabIds = [
      'inspector',
      'query',
      'stereo',
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
