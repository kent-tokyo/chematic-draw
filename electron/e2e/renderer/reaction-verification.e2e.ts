import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Reaction verification', () => {
  test('shows a guided reaction workflow and lets the host jump to export', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();

    const workflow = page.getByTestId('reaction-workflow');
    await expect(workflow).toBeVisible();
    await expect(workflow.getByRole('button', { name: '1. Components' })).toHaveAttribute('aria-current', 'step');
    await expect(workflow.getByRole('button', { name: '2. Mapping' })).toBeVisible();
    await expect(workflow.getByRole('button', { name: '3. Validation' })).toBeVisible();
    await expect(workflow.getByRole('button', { name: '4. Mechanism / conditions' })).toBeVisible();
    await expect(workflow.getByRole('button', { name: '5. Review' })).toBeVisible();
    await workflow.getByRole('button', { name: '6. Export' }).click();
    await expect(workflow.getByRole('button', { name: '6. Export' })).toHaveAttribute('aria-current', 'step');
  });

  test('shows an explicit not-verified state for an empty authored step', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();

    const verification = page.getByRole('status', { name: 'Reaction verification' });
    await expect(verification).toContainText('NOT VERIFIED');
    await expect(verification).toContainText('atom balance is not verified');
    await expect(page.getByTestId('reaction-integrity-steps')).toContainText('Step 1: atoms ⚠ · charge ⚠ · mapping ⚠');
    await expect(page.getByTestId('reaction-verification-scope')).toContainText('mechanism correctness');
  });

  test('exposes the local RXN V2000 export for a single authored step', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByRole('button', { name: '▼ Export Scheme' }).click();
    await expect(page.getByRole('button', { name: 'RXN V2000 (single step)' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF (publication)' })).toBeVisible();
  });

  test('publication export exposes an explicit page-size choice', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByRole('button', { name: '▼ Export Scheme' }).click();
    const pageSize = page.getByTestId('publication-page-size');
    const fontScale = page.getByTestId('publication-font-scale');
    await expect(pageSize).toHaveValue('auto');
    await expect(pageSize.locator('option')).toHaveText(['Auto', 'A4', 'Letter']);
    await expect(fontScale).toHaveValue('standard');
    await expect(fontScale.locator('option')).toHaveText(['Compact', 'Standard', 'Large']);
    await fontScale.selectOption('large');
    await expect(fontScale).toHaveValue('large');
    await pageSize.selectOption('a4');
    await expect(pageSize).toHaveValue('a4');
  });

  test('suggests bounded stoichiometric coefficients from authored components', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    const atom = (id: number, element: string) => ({ id, element, x: id, y: 0, charge: 0, atom_map: 0 });
    const scheme = {
      id: 'coefficient-suggestion', title: 'Water', description: '', currentStepIndex: 0, viewMode: 'step',
      steps: [{
        id: 'step-1',
        reactants: [
          { atoms: [atom(1, 'H'), atom(2, 'H')], bonds: [] },
          { atoms: [atom(3, 'O'), atom(4, 'O')], bonds: [] },
        ],
        products: [{ atoms: [atom(5, 'H'), atom(6, 'H'), atom(7, 'O')], bonds: [] }],
        arrows: [], mechanismType: 'sn2', conditions: {}, arrowType: 'single',
      }],
    };
    await page.locator('input[type="file"]').setInputFiles({ name: 'coefficients.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ scheme })) });
    await expect(page.getByRole('status', { name: 'Reaction export status' })).toContainText('Imported scheme');
    await page.getByRole('button', { name: /Step 1/ }).click();
    await page.getByRole('button', { name: 'Suggest coefficients' }).click();
    await expect(page.getByRole('status', { name: 'Reaction export status' })).toContainText('Suggested coefficients');
    await expect(page.getByRole('textbox', { name: 'Step 1 reactant coefficients' })).toHaveValue('2, 1');
    await expect(page.getByRole('textbox', { name: 'Step 1 product coefficients' })).toHaveValue('2');
  });

  test('gives an actionable error when multi-reactant input has too few lines', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByTestId('multi-reactant-smiles').fill('C');
    await page.getByRole('button', { name: 'Run multi-reactant SMIRKS' }).click();
    await expect(page.locator('text=Enter between 2 and 8 reactant SMILES lines.')).toBeVisible();
  });

  test('shows disconnected multi-step continuity as not verified', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await expect(page.getByRole('status', { name: 'Reaction verification' })).toContainText('reaction-step continuity is not verified');
    await expect(page.getByTestId('reaction-integrity-continuity')).toContainText('Step 1 → 2: 0 authored intermediates');
  });

  test('blocks RXN export for a multi-step scheme with an explicit status', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByRole('button', { name: '▼ Export Scheme' }).click();
    await page.getByRole('button', { name: 'RXN V2000 (single step)' }).click();
    await expect(page.getByRole('status', { name: 'Reaction export status' }))
      .toContainText('RXN export supports one authored step; use JSON for multi-step schemes');
  });

  test('renders authored molecule previews inside the full scheme canvas', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await page.getByTestId('sidebar-tab-reactions').click();

    const molecule = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'O', x: 1.5, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [{ id: 0, from: 0, to: 1, order: 1, stereo: 0 }],
    };
    const scheme = {
      id: 'preview-regression',
      title: 'Preview regression',
      description: '',
      currentStepIndex: 0,
      viewMode: 'scheme',
      steps: [{
        id: 'step-1',
        reactants: [molecule],
        products: [{
          ...molecule,
          atoms: molecule.atoms.map((atom) => ({ ...atom, element: atom.id === 0 ? 'N' : atom.element })),
        }],
        arrows: [],
        mechanismType: 'sn2',
        conditions: {},
        arrowType: 'single',
      }],
    };
    await page.locator('input[type="file"]').setInputFiles({
      name: 'preview-regression.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ scheme })),
    });
    await expect(page.getByRole('status', { name: 'Reaction export status' })).toContainText('Imported scheme');
    await expect(page.getByRole('img', { name: 'Reaction scheme canvas: 1 step' }))
      .toHaveAccessibleDescription('Step 1: 1 reactant, 1 product');

    const canvas = page.getByTestId('molecule-canvas');
    const previewPixels = await canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D canvas context unavailable');
      // The first step starts at x=20 and the preview starts at x=175.
      const image = context.getImageData(175, 124, 135, 44).data;
      let darkPixels = 0;
      for (let index = 0; index < image.length; index += 4) {
        if (image[index] < 150 && image[index + 1] < 150 && image[index + 2] < 150 && image[index + 3] > 0) darkPixels += 1;
      }
      return darkPixels;
    });
    expect(previewPixels).toBeGreaterThan(10);
  });
});
