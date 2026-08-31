import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Reaction verification', () => {
  test('shows an explicit not-verified state for an empty authored step', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();

    const verification = page.getByRole('status', { name: 'Reaction verification' });
    await expect(verification).toContainText('NOT VERIFIED');
    await expect(verification).toContainText('atom balance is not verified');
  });

  test('exposes the local RXN V2000 export for a single authored step', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByRole('button', { name: '▼ Export Scheme' }).click();
    await expect(page.getByRole('button', { name: 'RXN V2000 (single step)' })).toBeVisible();
  });
});
