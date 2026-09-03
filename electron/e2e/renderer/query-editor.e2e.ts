import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('query editor contract', () => {
  test('validates a SMARTS query in the renderer and exposes a non-lossy editor', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await expect(editor).toBeVisible();
    await editor.fill(JSON.stringify({ schema: 'chematic-draw/query-document', schema_version: 1, atoms: [{ id: 1, x: 0, y: 0, constraint: { elements: ['O'] } }], bonds: [] }, null, 2));
    await page.getByRole('button', { name: 'Validate / SMARTS' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Valid query; SMARTS:/ })).toBeVisible();
  });
});
