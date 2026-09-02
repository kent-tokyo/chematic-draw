import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('query editor contract', () => {
  test('validates a SMARTS query in the renderer and exposes a non-lossy editor', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    const editor = page.getByLabel('Query document editor');
    await expect(editor).toBeVisible();
    await page.getByRole('button', { name: 'Validate / SMARTS' }).click();
    await expect(page.getByRole('status')).toContainText('Valid query; SMARTS:');
  });
});
