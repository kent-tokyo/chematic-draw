import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Offline MCS search', () => {
  test('compares the loaded molecule with a SMILES input and shows the real result', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.getByTestId('sidebar-tab-database').click();
    const panel = page.getByTestId('mcs-search');
    await expect(panel).toBeVisible();
    await panel.getByRole('textbox', { name: 'MCS comparison SMILES' }).fill('Cc1ccccc1');
    await panel.getByTestId('mcs-search-button').click();

    const result = page.getByTestId('mcs-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('MCS result');
    await expect(result).toContainText('Similarity:');
    await expect(result).toContainText('Common atoms:');
    await expect(result).toContainText('Search budget: 5000 ms');
  });

  test('reports malformed comparison input without hiding the existing panel', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    await page.getByTestId('sidebar-tab-database').click();
    const panel = page.getByTestId('mcs-search');
    await panel.getByRole('textbox', { name: 'MCS comparison SMILES' }).fill('not a molecule');
    await panel.getByTestId('mcs-search-button').click();

    await expect(panel.getByRole('alert')).toContainText('MCS search failed:');
    await expect(panel.getByTestId('mcs-result')).toHaveCount(0);
  });
});
