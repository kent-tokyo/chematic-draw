import { expect, test } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('ChemDraw-oriented workspace geography', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('places general commands above, drawing tools left, and properties right of the canvas', async ({ page }) => {
    const top = page.getByTestId('general-toolbar');
    const tools = page.getByTestId('main-tools-palette');
    const canvas = page.getByTestId('molecule-canvas-shell');
    const sidebar = page.getByTestId('sidebar');

    await expect(top).toBeVisible();
    await expect(tools).toHaveAttribute('aria-orientation', 'vertical');

    const [topBox, toolsBox, canvasBox, sidebarBox] = await Promise.all([
      top.boundingBox(), tools.boundingBox(), canvas.boundingBox(), sidebar.boundingBox(),
    ]);
    if (!topBox || !toolsBox || !canvasBox || !sidebarBox) throw new Error('workspace chrome is not visible');

    expect(topBox.y + topBox.height).toBeLessThanOrEqual(canvasBox.y + 1);
    expect(toolsBox.x + toolsBox.width).toBeLessThanOrEqual(canvasBox.x + 1);
    expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(sidebarBox.x + 1);
  });

  test('keeps the familiar select, bond, atom, and erase progression in the main tools palette', async ({ page }) => {
    const palette = page.getByTestId('main-tools-palette');
    const names = await palette.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label')),
    );

    expect(names).toEqual([
      'Select tool',
      'Single bond',
      'Double bond',
      'Triple bond',
      'Aromatic bond',
      'Six-membered ring',
      'Carbon atom',
      'Nitrogen atom',
      'Oxygen atom',
      'Sulfur atom',
      'Phosphorus atom',
      'Eraser',
    ]);
  });

  test('inserts a real six-membered ring as one undoable palette action', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');

    await page.getByRole('button', { name: 'Six-membered ring' }).click();
    await canvas.click({ position: { x: box.width * 0.18, y: box.height * 0.22 } });
    await expect(canvas).toHaveAttribute('aria-label', /12 atoms, 12 bonds/);

    await page.getByTestId('undo-button').click();
    await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);
  });

  test('moves selected atom and bond properties back to the Inspector', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');
    const first = { x: box.width * 0.2, y: box.height * 0.2 };
    const second = { x: box.width * 0.38, y: box.height * 0.2 };
    const midpoint = { x: (first.x + second.x) / 2, y: first.y };

    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await page.getByRole('button', { name: 'Carbon atom' }).click();
    await canvas.click({ position: first });
    await canvas.click({ position: second });
    await page.getByRole('button', { name: 'Single bond' }).click();
    await canvas.dragTo(canvas, { sourcePosition: first, targetPosition: second });
    await page.getByTestId('sidebar-tab-templates').click();
    await page.getByRole('button', { name: 'Select tool' }).click();
    await canvas.click({ position: first });

    await expect(page.getByTestId('sidebar-tab-inspector')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('sidebar-panel-inspector')).toBeVisible();
    await expect(page.getByText('C ▼')).toBeVisible();

    await page.getByTestId('sidebar-tab-templates').click();
    await canvas.click({ position: midpoint });
    await expect(page.getByTestId('sidebar-tab-inspector')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('combobox', { name: 'Bond order' })).toHaveValue('1');
  });

  test('offers ChemDraw familiar and compact profiles plus Reset Workspace', async ({ page }) => {
    await page.getByTestId('settings-button').click();
    await page.getByTestId('workspace-profile').selectOption('compact');
    await expect(page.getByTestId('app-root')).toHaveAttribute('data-workspace-profile', 'compact');

    await page.getByRole('dialog', { name: 'Settings' }).getByText('Close', { exact: true }).click();
    await page.getByRole('button', { name: 'Close sidebar' }).click();
    await expect(page.getByTestId('sidebar')).toHaveCount(0);

    await page.getByTestId('settings-button').click();
    await page.getByTestId('reset-workspace').click();
    await expect(page.getByTestId('app-root')).toHaveAttribute('data-workspace-profile', 'chemdraw');
    await expect(page.getByTestId('main-tools-palette')).toBeVisible();
    await expect(page.getByTestId('sidebar')).toBeVisible();
    await expect(page.getByTestId('sidebar-tab-inspector')).toHaveAttribute('aria-selected', 'true');
  });

  test('keeps the drawing workspace usable at migration target widths', async ({ page }) => {
    for (const width of [768, 1366, 1920]) {
      await page.setViewportSize({ width, height: width === 768 ? 768 : 1080 });

      const canvasBox = await page.getByTestId('molecule-canvas-shell').boundingBox();
      if (!canvasBox) throw new Error(`canvas not visible at ${width}px`);

      expect(canvasBox.width).toBeGreaterThanOrEqual(240);
      expect(canvasBox.height).toBeGreaterThanOrEqual(320);
      await expect(page.getByTestId('general-toolbar')).toBeVisible();
      await expect(page.getByTestId('main-tools-palette')).toBeVisible();
      await expect(page.getByTestId('sidebar-tab-inspector')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
});
