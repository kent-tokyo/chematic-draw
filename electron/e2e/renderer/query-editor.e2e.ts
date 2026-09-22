import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('query editor contract', () => {
  test('edits atom and bond constraints through structured controls', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [{ id: 1, x: 0, y: 0, constraint: { elements: ['O'] } }, { id: 2, x: 1, y: 0, constraint: { elements: ['C'] } }],
      bonds: [{ id: 1, from: 1, to: 2, constraint: { order: 'single' } }],
    }, null, 2));
    await page.getByRole('combobox', { name: 'Query atom 1 element' }).selectOption('N');
    await page.getByRole('spinbutton', { name: 'Query atom 1 valence' }).fill('3');
    await page.getByRole('combobox', { name: 'Query atom 1 aromaticity' }).selectOption('aliphatic');
    await page.getByRole('combobox', { name: 'Query atom 1 ring' }).selectOption('ring');
    await page.getByRole('combobox', { name: 'Query bond 1 order' }).selectOption('double');
    await expect(editor).toContainText('"elements": [\n      "N"');
    await expect(editor).toContainText('"valence": 3');
    await expect(editor).toContainText('"aromatic": false');
    await expect(editor).toContainText('"ring": true');
    await expect(editor).toContainText('"order": "double"');
    await page.getByRole('button', { name: 'Undo query edit' }).click();
    await expect(editor).toContainText('"order": "single"');
    await page.getByRole('button', { name: 'Redo query edit' }).click();
    await expect(editor).toContainText('"order": "double"');
    await expect(page.getByRole('button', { name: 'Export query JSON' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import query JSON' })).toBeVisible();
  });

  test('round-trips a query document through the file import control', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    const query = { schema: 'chematic-draw/query-document', schema_version: 1, atoms: [{ id: 7, x: 0, y: 0, constraint: { wildcard: true } }], bonds: [] };
    await page.getByTestId('query-file-input').setInputFiles({
      name: 'saved.query.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(query)),
    });
    await expect(page.getByRole('status').filter({ hasText: 'Loaded query JSON' })).toBeVisible();
    await expect(editor).toContainText('"id": 7');
    await expect(editor).toContainText('"wildcard": true');
  });

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

  test('generates a ring SMARTS pattern from the loaded molecule without losing connectivity', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    await page.getByRole('button', { name: 'Validate / SMARTS' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Valid query; SMARTS:/ })).toContainText('1');
  });

  test('explains why disconnected SMARTS components are not executable yet', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [
        { id: 1, x: 0, y: 0, constraint: { elements: ['C'] } },
        { id: 2, x: 2, y: 0, constraint: { elements: ['O'] } },
      ],
      bonds: [],
    }, null, 2));
    await page.getByRole('button', { name: 'Validate / SMARTS' }).click();
    await expect(page.getByRole('status').filter({ hasText: /disconnected components/ })).toBeVisible();
  });

  test('exposes a safe polymer repeat expansion control without flattening query data', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [
        { id: 1, x: 0, y: 0, constraint: { elements: ['C'] } },
        { id: 2, x: 1, y: 0, constraint: { elements: ['C'] } },
      ],
      bonds: [{ id: 1, from: 1, to: 2, constraint: { order: 'single' } }],
      polymers: [{ id: 'poly-1', repeatUnitAtomIds: [1, 2], linkageBondIds: [1], attachmentAtomIds: [1, 2] }],
    }, null, 2));
    await expect(page.getByRole('status').filter({ hasText: 'special-chemistry item' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'poly-1 repeat count' }).fill('3');
    await page.getByRole('button', { name: 'Expand', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Expanded the polymer repeat unit 3 times' })).toBeVisible();
    await expect(editor).toContainText('"polymers"');
  });

  test('lets users choose an allowed Markush substituent without flattening the query', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [1, 2, 3, 4, 5, 6].map((id) => ({ id, x: id, y: 0, constraint: { wildcard: true } })),
      bonds: [1, 2, 3, 4, 5, 6].map((id) => ({ id, from: id, to: id === 6 ? 1 : id + 1, constraint: { order: 'single' as const } })),
      markush: [{ id: 'R1', label: 'R', attachmentAtomIds: [1], allowedSubstituentSmarts: ['C', 'N'] }],
    }, null, 2));
    const substituent = page.getByRole('combobox', { name: 'R1 substituent' });
    await expect(substituent).toBeVisible();
    await substituent.selectOption('N');
    await expect(page.getByRole('status').filter({ hasText: 'Selected N for Markush R1' })).toBeVisible();
    await expect(editor).toContainText('"markush"');
  });

  test('expands a selected Markush substituent through the semantic WASM contract', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [{ id: 1, x: 0, y: 0, constraint: { wildcard: true } }], bonds: [],
      markush: [{ id: 'R1', label: 'R', attachmentAtomIds: [1], allowedSubstituentSmarts: ['[*]O'] }],
    }, null, 2));
    await page.getByRole('combobox', { name: 'R1 substituent' }).selectOption('[*]O');
    await page.getByRole('button', { name: 'Expand R1', exact: true }).click();
    const result = page.getByTestId('markush-expansion-R1');
    await expect(result).toBeVisible();
    await expect(result).toContainText('Expanded SMILES');
    await expect(result).toContainText('O');
    await expect(result).toContainText('source mappings');
    await page.getByRole('button', { name: 'Apply R1 expansion', exact: true }).click();
    await expect(page.getByRole('img', { name: /C6H7O/ })).toBeVisible();
    await page.getByText('Advanced query tools', { exact: true }).click();
    await expect(editor).toContainText('"markush"');
  });

  test('expands a multi-attachment Markush substituent and reports all source mappings', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [1, 2, 3, 4, 5, 6].map((id) => ({ id, x: id, y: 0, constraint: { wildcard: true } })),
      bonds: [1, 2, 3, 4, 5, 6].map((id) => ({ id, from: id, to: id === 6 ? 1 : id + 1, constraint: { order: 'single' as const } })),
      markush: [{ id: 'R2', label: 'R2', attachmentAtomIds: [1, 2], allowedSubstituentSmarts: ['[*]O[*]'] }],
    }, null, 2));
    await expect(page.getByText('Markush R2 (2 attachments)', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'R2 substituent' }).selectOption('[*]O[*]');
    await page.getByRole('button', { name: 'Expand R2', exact: true }).click();
    const result = page.getByTestId('markush-expansion-R2');
    await expect(result).toBeVisible();
    await expect(result).toContainText('source mappings');
    await expect(result).toContainText('O');
  });

  test('edits nucleic-acid residue metadata without inferring a concrete molecule', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByText('Advanced query tools', { exact: true }).click();
    const editor = page.getByLabel('Query document editor');
    await editor.fill(JSON.stringify({
      schema: 'chematic-draw/query-document', schema_version: 1,
      atoms: [{ id: 1, x: 0, y: 0, constraint: { elements: ['P'] } }], bonds: [],
      nucleicAcids: [{ id: 'na-1', residueIds: ['rA'], backboneBondIds: [], residues: [{ id: 'rA', base: 'A', sugar: 'ribose', atomIds: [1], phosphateAttached: false }] }],
    }, null, 2));
    await page.getByRole('combobox', { name: 'rA base' }).selectOption('G');
    await page.getByRole('combobox', { name: 'rA sugar' }).selectOption('deoxyribose');
    await page.getByRole('checkbox', { name: 'rA phosphate attached' }).check();
    await expect(page.getByRole('status').filter({ hasText: 'Updated nucleic-acid residue rA' })).toBeVisible();
    await expect(editor).toContainText('"nucleicAcids"');
    await expect(editor).toContainText('"deoxyribose"');
  });
});
