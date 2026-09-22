import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Offline molecule assistant', () => {
  test('answers a structure question with local WASM analysis', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-chat').click();

    const panel = page.getByTestId('sidebar-panel-chat');
    await expect(panel).toContainText('Offline molecule assistant');
    await panel.getByRole('textbox', { name: 'Ask about the molecule' }).fill('What is the molecular weight?');
    await panel.getByRole('button', { name: 'Send message' }).click();

    await expect(panel.getByRole('log')).toContainText('Molecular weight:', { timeout: 10000 });
    await expect(panel).not.toContainText('coming soon');
  });

  test('explains its local scope for unsupported questions', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-chat').click();
    const panel = page.getByTestId('sidebar-panel-chat');
    await panel.getByRole('textbox', { name: 'Ask about the molecule' }).fill('Explain the mechanism');
    await panel.getByRole('button', { name: 'Send message' }).click();

    await expect(panel.getByRole('log')).toContainText('Try: molecular formula', { timeout: 10000 });
  });
});
