import { test, expect } from '@playwright/test';
import { waitForAppReady } from './helpers';

// Regression test for the accessibility Phase A work (`/greenlane`
// autonomous work, user-scoped): these position:fixed overlay modals had no
// role="dialog"/aria-modal, no focus trap, and (UndoTimeline/BatchProcess)
// no Escape-to-close — a keyboard/screen-reader user tabbing past one fell
// straight through to controls hidden behind the backdrop. Fixed via a
// shared useFocusTrap hook.
test.describe('Modal accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Shortcuts modal traps focus, exposes dialog semantics, and Escape closes it', async ({ page }) => {
    // F1 opens it without needing the Electron menu bridge (see useKeyboard.ts) —
    // this suite drives a plain Chromium page against the Vite dev server, with
    // no window.electronAPI.
    await page.keyboard.press('F1');

    const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Focus should have landed inside the dialog, not stayed on <body>.
    // Scoped to the dialog: getByRole name-matching is substring-based, so
    // an unscoped "Close" also matches the sidebar's "Close sidebar" button.
    const closeButton = dialog.getByRole('button', { name: 'Close', exact: true });
    await expect(closeButton).toBeFocused();

    // Shift+Tab from the first focusable element should wrap to the last
    // one, not escape the dialog to whatever's behind the backdrop.
    await page.keyboard.press('Shift+Tab');
    const focusedIsInsideDialog = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]');
      return dialogEl?.contains(document.activeElement) ?? false;
    });
    expect(focusedIsInsideDialog).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('Shortcuts modal exposes category tabs and an associated tabpanel', async ({ page }) => {
    await page.keyboard.press('F1');

    const dialog = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    const tablist = dialog.getByRole('tablist', { name: 'Shortcut categories' });
    const tabs = tablist.getByRole('tab');
    await expect(tabs).not.toHaveCount(0);

    const firstTab = tabs.first();
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
    await expect(firstTab).toHaveAttribute('aria-controls', 'shortcut-panel-0');
    const panel = dialog.getByRole('tabpanel');
    await expect(panel).toHaveAttribute('aria-labelledby', 'shortcut-tab-0');

    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(panel).toHaveAttribute('aria-labelledby', 'shortcut-tab-1');
    }
  });

  test('Undo Timeline modal has dialog semantics and closes on Escape (previously had no Escape handler at all)', async ({ page }) => {
    // renderer.tsx's shortcut checks navigator.platform to decide the
    // modifier combo (Cmd+Ctrl+Z on macOS, Ctrl+Alt+Z elsewhere) — mirror
    // that here rather than hardcoding one, since this suite runs both
    // locally (macOS) and in CI (ubuntu-latest).
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+Control+z' : 'Control+Alt+z');

    const dialog = page.getByRole('dialog', { name: 'Undo/Redo Timeline' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
