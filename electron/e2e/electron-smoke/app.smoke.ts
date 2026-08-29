import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

/**
 * Launches the real, packaged Electron app via Playwright's dedicated
 * _electron API — unlike the renderer-e2e suite (a plain Chromium page
 * pointed at the Vite dev server), this actually drives the app's main
 * process and BrowserWindow, so it's the only suite that exercises
 * preload.js's contextBridge (window.electronAPI) at all.
 *
 * Requires the app to already be built (npm run package or
 * electron-forge make) — that's what makes main.js/preload.js/renderer
 * resolvable via package.json's "main" field.
 */
test.describe('Electron Smoke', () => {
  test('app launches, renderer becomes ready, electronAPI is exposed, and it exits cleanly', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });

    const window = await electronApp.firstWindow();

    await expect(window).toHaveTitle('chematic-draw');

    // Same readiness signal the renderer-e2e suite waits on — proves the
    // WASM module actually finished loading inside the real app, not just
    // that a window appeared.
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const hasElectronAPI = await window.evaluate(
      () => typeof (window as unknown as { electronAPI?: unknown }).electronAPI !== 'undefined'
    );
    expect(hasElectronAPI).toBe(true);

    await electronApp.close();
  });

  test('Help > Keyboard Shortcuts menu item opens the Shortcuts modal', async () => {
    // Regression test: main.js's Help menu sends 'menu:shortcuts' on click
    // (mainWindow.webContents.send('menu:shortcuts')), and preload.js
    // exposes it as electronAPI.onMenuShortcuts — but nothing in
    // renderer.tsx's menu-handler effect ever subscribed to it, so the
    // event reached the renderer and was silently ignored. The modal only
    // opened via the F1/Ctrl+Alt+Z keyboard shortcuts. The real native
    // Menu can't be clicked via Playwright (no CDP access outside the web
    // content, same constraint as autosave's native confirm dialog) — this
    // sends the exact IPC event the menu item's click handler sends,
    // exercising the same renderer-side code path a real click would.
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:shortcuts');
    });

    await expect(window.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();

    await electronApp.close();
  });
});
