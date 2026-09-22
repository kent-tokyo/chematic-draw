import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Database result import', () => {
  test('loads a PubChem canonical structure through the existing local parse worker', async ({ page }) => {
    await page.route('**/rest/pug/compound/inchikey/**', async (route) => {
      await route.fulfill({ json: { PC_Compounds: [{ id: { id: { cid: 2244 } } }] } });
    });
    await page.route('**/rest/pug/compound/cid/2244/property/**', async (route) => {
      await route.fulfill({ json: { PropertyTable: { Properties: [{ CID: 2244, IUPACName: 'ethanol', CanonicalSMILES: 'CCO', MolecularFormula: 'C2H6O', MolecularWeight: 46.07 }] } } });
    });

    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-database').click();
    await page.getByRole('button', { name: 'Search Compounds' }).click();

    const result = page.getByText('ethanol', { exact: true });
    await expect(result).toBeVisible();
    await page.getByRole('button', { name: 'Load structure' }).click();
    await expect(page.getByText('Loaded the structure for ethanol')).toBeVisible();
  });
});
