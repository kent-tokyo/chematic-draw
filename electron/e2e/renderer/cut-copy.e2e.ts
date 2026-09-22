import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test('cuts the selected structure as one undoable edit', async ({ page }) => {
  await page.goto('/');
  await waitForAppReady(page);

  const canvas = page.getByTestId('molecule-canvas');
  await canvas.focus();
  await page.keyboard.press('Control+a');
  await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);
  await page.keyboard.press('Control+x');
  await expect(canvas).toHaveAttribute('aria-label', 'Molecular structure canvas, empty');

  await page.keyboard.press('Control+z');
  await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);
});
