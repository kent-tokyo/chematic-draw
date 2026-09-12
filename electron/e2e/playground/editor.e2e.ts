import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('built Playground provides the drawing workspace and browser document actions', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('toolbar-summary')).toContainText('6a • 6b');
  await expect(page.getByTestId('browser-open')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Carbon atom' })).toBeVisible();

  await page.getByRole('button', { name: 'Carbon atom' }).click();
  const canvas = page.getByTestId('molecule-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width - 80, y: box!.height - 80 } });
  await expect(page.getByTestId('toolbar-summary')).toContainText('7a • 6b');

  await page.getByTestId('undo-button').click();
  await expect(page.getByTestId('toolbar-summary')).toContainText('6a • 6b');
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('browser-save').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.schematic\.json$/);
  await page.getByTestId('browser-new').click();
  await expect(page.getByTestId('toolbar-summary')).toContainText('0a • 0b');
  const savedPath = await download.path();
  expect(savedPath).not.toBeNull();
  await page.getByRole('group', { name: /Browser document actions|ブラウザ文書操作/ }).locator('input[type="file"]').setInputFiles({
    name: 'roundtrip.schematic.json', mimeType: 'application/json', buffer: await readFile(savedPath!),
  });
  await expect(page.getByRole('status')).toContainText(/Opened|開きました/, { timeout: 8000 });
  await expect(page.getByTestId('toolbar-summary')).toContainText('6a • 6b');
  const molDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('browser-export-mol').click();
  expect((await molDownloadPromise).suggestedFilename()).toBe('chematic-structure.mol');
  await page.getByTestId('browser-copy-smiles').click();
  await expect(page.getByRole('status')).toContainText(/SMILES copied|SMILESをコピーしました/, { timeout: 8000 });
  await page.waitForTimeout(2200);
  page.on('dialog', (dialog) => void dialog.accept());
  await page.reload();
  await expect(page.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
  await expect(page.getByTestId('toolbar-summary')).toContainText('6a • 6b');
  await page.getByTestId('sidebar-tab-3d').click();
  await expect(page.getByTestId('sidebar-panel-3d')).toBeVisible();
  await page.getByRole('button', { name: '3D 生成' }).click();
  await expect(page.getByTestId('viewer-3d-canvas')).toBeVisible();
  await expect(page.getByTestId('sidebar-panel-3d')).toContainText(/XYZ/);
  await page.getByTestId('sidebar-tab-reactions').click();
  await expect(page.getByTestId('reaction-workflow')).toBeVisible();
  await page.getByTestId('reaction-title').fill('Browser candidate reaction');
  await page.getByTestId('reaction-add-step').click();
  await page.getByTestId('reaction-add-step').click();
  await expect(page.getByTestId('sidebar-panel-reactions')).toContainText('MULTI-STEP');
  await page.getByRole('button', { name: /Step 1/ }).click();
  await page.getByTestId('reaction-step-1-temperature').fill('reflux');
  await page.getByTestId('reaction-step-1-agent').fill('O');
  await page.getByTestId('reaction-step-1-add-agent').click();
  await expect(page.getByTestId('sidebar-panel-reactions')).toContainText('Added: 1 agent(s)');

  const atom = (id: number, element: string) => ({ id, element, x: id, y: 0, charge: 0, atom_map: 0 });
  const molecule = { atoms: [atom(1, 'C')], bonds: [] };
  const scheme = {
    id: 'browser-roundtrip', title: 'Browser roundtrip', description: 'two authored steps', currentStepIndex: 0, viewMode: 'scheme',
    steps: [1, 2].map((step) => ({
      id: `step-${step}`, reactants: [molecule], products: [molecule], arrows: [], mechanismType: 'sn2', conditions: { temperature: 'RT' }, arrowType: 'single',
    })),
  };
  const reactionFile = page.getByTestId('reaction-import-file');
  await reactionFile.setInputFiles({ name: 'browser-roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ scheme })) });
  await expect(page.getByTestId('sidebar-panel-reactions')).toContainText('Browser roundtrip');
  await expect(page.getByTestId('sidebar-panel-reactions')).toContainText('Step 1 of 2');
  await page.getByRole('button', { name: '▼ Export Scheme' }).click();
  const reactionDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('reaction-export-json').click();
  const reactionDownload = await reactionDownloadPromise;
  const reactionPath = await reactionDownload.path();
  expect(reactionPath).not.toBeNull();
  await reactionFile.setInputFiles({ name: 'browser-roundtrip-reopened.json', mimeType: 'application/json', buffer: await readFile(reactionPath!) });
  await expect(page.getByTestId('sidebar-panel-reactions')).toContainText('Browser roundtrip');
  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByTestId('browser-export-png').click();
  expect((await pngDownloadPromise).suggestedFilename()).toBe('chematic-structure.png');
  page.on('dialog', (dialog) => void dialog.accept());
  await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('[aria-label="Browser document actions"]');
    if (!host) throw new Error('Browser document host not found');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['C'], 'dropped.smi', { type: 'text/plain' }));
    host.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
  });
  await expect(page.locator('[aria-live="polite"][role="status"]')).toContainText(/Opened dropped.smi|dropped.smi を開きました/);
});
