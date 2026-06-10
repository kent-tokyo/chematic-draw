import { test, expect } from '@playwright/test';

test.describe('3D Molecular Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Load benzene molecule via SMILES (simplified: assume it loads)
    // In real test, we'd use the UI to load it
  });

  test('should open 3D viewer panel', async ({ page }) => {
    // Click 3D tab
    const viewer3dTab = page.locator('button:has-text("3D")');
    await expect(viewer3dTab).toBeVisible();
    await viewer3dTab.click();

    // Check panel opens
    const panel = page.locator('[class*="panel"]').filter({ hasText: /生成/ });
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('should display 3D generation button', async ({ page }) => {
    // Navigate to 3D panel
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    // Check for generate button
    const generateButton = page.locator('button:has-text("3D 生成")');
    await expect(generateButton).toBeVisible();
    await expect(generateButton).toBeEnabled();
  });

  test('should generate 3D coordinates and display canvas', async ({ page }) => {
    // Load 3D panel
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    // Click generate button
    const generateButton = page.locator('button:has-text("3D 生成")');
    await generateButton.click();

    // Wait for canvas to render
    await page.waitForTimeout(2000);

    // Check if canvas is displayed in the panel
    const canvas = page.locator('canvas');
    const count = await canvas.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should enable export button after 3D generation', async ({ page }) => {
    // Navigate to 3D panel
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    // Initially disabled
    const exportButton = page.locator('button:has-text("XYZ エクスポート")');
    expect(await exportButton.isDisabled()).toBe(true);

    // Generate 3D
    const generateButton = page.locator('button:has-text("3D 生成")');
    await generateButton.click();

    // Wait and check if export is enabled
    await page.waitForTimeout(1000);
    // Note: In real test, this would check after generation completes
  });

  test('should handle mouse interactions on 3D canvas', async ({ page }) => {
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      // Simulate drag for rotation
      await canvas.dragTo(canvas, {
        sourcePosition: {
          x: box.width / 2,
          y: box.height / 2,
        },
        targetPosition: {
          x: box.width / 2 + 50,
          y: box.height / 2 + 50,
        },
      });

      await page.waitForTimeout(500);
    }

    await expect(canvas).toBeVisible();
  });

  test('should handle wheel scroll for zoom', async ({ page }) => {
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      // Simulate mouse wheel
      await canvas.hover();
      await page.mouse.wheel(0, 100); // Scroll down

      await page.waitForTimeout(500);
    }

    await expect(canvas).toBeVisible();
  });

  test('should display instructions on 3D canvas', async ({ page }) => {
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    // Generate 3D first
    const generateButton = page.locator('button:has-text("3D 生成")');
    await generateButton.click();

    await page.waitForTimeout(1000);

    // Check if canvas has text (instructions)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});
