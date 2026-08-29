import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test for a bug found while fixing the ReactionPanel dual-state bug
// (see internal_docs/ROADMAP.md): once a reaction scheme exists (created lazily
// when the Reactions tab is opened), MechanismPanel used to write newly-drawn
// arrows exclusively into reactionSchemeStore, while the canvas / hit-testing /
// arrow list all read exclusively from mechanismStore — making every arrow drawn
// after visiting Reactions silently invisible. Fixed by always writing to
// mechanismStore and mirroring into the scheme only when steps exist.
test.describe('Mechanism arrows stay visible after a reaction scheme exists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('drawing an arrow after opening Reactions still shows up in the list', async ({ page }) => {
    const canvas = page.getByTestId('molecule-canvas');
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('canvas not visible');

    // Place two carbon atoms far enough apart to hit-test unambiguously.
    await page.locator('button[title="C [C]"]').click();
    await canvas.click({ position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.5 } });
    await canvas.click({ position: { x: canvasBox.width * 0.7, y: canvasBox.height * 0.5 } });
    await page.locator('button[title="Select [ESC]"]').click();

    // Opening Reactions creates the scheme; adding a step is what actually
    // triggered the bug (the broken branch only fired once scheme.steps.length > 0).
    await page.getByTestId('sidebar-tab-reactions').click();
    await page.getByRole('button', { name: '+ Add Reaction Step' }).click();
    await page.getByTestId('sidebar-tab-mechanism').click();

    await page.getByRole('button', { name: '+ Add Arrow' }).click();
    await canvas.click({ position: { x: canvasBox.width * 0.3, y: canvasBox.height * 0.5 } });
    await canvas.click({ position: { x: canvasBox.width * 0.7, y: canvasBox.height * 0.5 } });

    // Arrow type dialog should appear; pick "forward".
    await page.getByRole('button', { name: /forward/i }).first().click();

    await expect(page.getByText('Arrows (1)')).toBeVisible();
    await expect(page.getByText('No arrows yet')).not.toBeVisible();
  });
});
