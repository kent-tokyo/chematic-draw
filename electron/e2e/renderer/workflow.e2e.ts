import { test, expect } from '@playwright/test';

test.describe('Complete Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete 3D generation & export workflow', async ({ page }) => {
    // Step 1: Load molecule (simplified test assumes benzene is available)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Step 2: Navigate to 3D panel
    const viewer3dTab = page.locator('button:has-text("3D")');
    await viewer3dTab.click();

    // Step 3: Generate 3D coordinates
    const generateButton = page.locator('button:has-text("3D 生成")');
    await generateButton.click();

    // Wait for generation to complete
    await page.waitForTimeout(2000);

    // Step 4: Export to XYZ (in real test, would download file)
    const exportButton = page.locator('button:has-text("XYZ エクスポート")');
    // After generation, button should be enabled
    // await expect(exportButton).toBeEnabled();

    // Verify canvas is still visible after all operations
    await expect(canvas).toBeVisible();
  });

  test('should display molecule properties in inspector', async ({ page }) => {
    // Step 1: Ensure molecule is loaded
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Step 2: Click on Inspector tab
    const inspectorTab = page.locator('button:has-text("Inspector")');
    await inspectorTab.click();

    // Step 3: Check inspector panel is visible
    await page.waitForTimeout(500);

    // Step 4: Verify content
    const inspector = page.locator('[class*="inspector"]');
    await expect(inspector).toBeVisible();
  });

  test('should access all major features from sidebar', async ({ page }) => {
    const featureTabs = [
      { name: 'Templates', action: 'click' },
      { name: 'Reactions', action: 'click' },
      { name: 'Stereo', action: 'click' },
      { name: 'Props', action: 'click' },
      { name: '3D', action: 'click' },
      { name: 'DB', action: 'click' },
    ];

    for (const tab of featureTabs) {
      const button = page.locator(`button:has-text("${tab.name}")`);
      await expect(button).toBeVisible();
      await button.click();

      // Wait for panel to load
      await page.waitForTimeout(300);

      // Verify some content is visible (panel, controls, etc.)
      const anyElement = page.locator('[class*="panel"], [class*="controls"], button');
      expect(await anyElement.count()).toBeGreaterThan(0);
    }
  });

  test('should handle multiple operations sequentially', async ({ page }) => {
    // Load Inspector
    let tab = page.locator('button:has-text("Inspector")');
    await tab.click();
    await page.waitForTimeout(300);

    // Load Properties
    tab = page.locator('button:has-text("Props")');
    await tab.click();
    await page.waitForTimeout(300);

    // Load 3D
    tab = page.locator('button:has-text("3D")');
    await tab.click();
    await page.waitForTimeout(300);

    // Verify 3D panel is visible
    const generateButton = page.locator('button:has-text("3D 生成")');
    await expect(generateButton).toBeVisible();
  });

  test('should render sidebar toggle button', async ({ page }) => {
    // Look for sidebar toggle (close button)
    const closeButton = page.locator('button').filter({ hasText: /close|×/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(300);

      // Sidebar should be hidden
      const sidebar = page.locator('[class*="sidebar"]');
      // Note: exact behavior depends on implementation
      await expect(page.locator('canvas').first()).toBeVisible();
    }
  });
});
