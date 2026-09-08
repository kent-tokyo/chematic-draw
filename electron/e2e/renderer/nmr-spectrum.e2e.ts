import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('NMR spectrum panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-nmr').click();
  });

  test('renders the loss-aware panel and preserves the last valid plot on reject', async ({ page }) => {
    const panel = page.getByTestId('sidebar-panel-nmr');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('img', { name: '1H spectrum plot' })).toBeVisible();

    await panel.getByRole('textbox', { name: 'NMR spectrum JSON' }).fill('{"schema":"chematic-draw/nmr-spectrum","schema_version":1,"nucleus":"13C","peaks":[{"id":"bad","shiftPpm":null}],"provenance":{"kind":"manual-entry"}}');
    await panel.getByRole('button', { name: 'Validate and display' }).click();

    await expect(panel.getByRole('alert')).toContainText('peaks[0].shiftPpm');
    await expect(panel.getByRole('img', { name: '1H spectrum plot' })).toBeVisible();
  });

  test('accepts a valid experimental spectrum contract', async ({ page }) => {
    const panel = page.getByTestId('sidebar-panel-nmr');
    await panel.getByRole('textbox', { name: 'NMR spectrum JSON' }).fill(JSON.stringify({
      schema: 'chematic-draw/nmr-spectrum', schema_version: 1, nucleus: '13C',
      peaks: [{ id: 'c1', shiftPpm: 77, intensity: 1 }],
      provenance: { kind: 'experimental-import', source: 'fixture.json' },
    }));
    await panel.getByRole('button', { name: 'Validate and display' }).click();
    await expect(panel.getByLabel('13C NMR spectrum')).toBeVisible();
    await expect(panel.getByRole('img', { name: '13C spectrum plot' })).toBeVisible();
  });
});
