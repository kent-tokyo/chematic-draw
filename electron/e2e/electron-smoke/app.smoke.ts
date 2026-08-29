import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

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

  test('opening a file records it in the Recent Files list', async () => {
    // Regression test: main.js has a full Recent Files implementation —
    // recent-file:add IPC handler, menu rebuild, click-to-reopen, Clear
    // Recent Files — and preload.js exposes it as
    // electronAPI.recordRecentFile, but nothing in renderer.tsx ever
    // called it. The list was permanently empty in practice. Found via a
    // sweep cross-checking every preload-exposed function against its
    // actual renderer.tsx call sites (recordRecentFile: 0) after
    // discovering the same dead-wiring pattern for the Shortcuts menu item
    // above.
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chematic-recent-files-test-'));
    const settingsPath = path.join(userDataDir, 'settings.json');
    const openedPath = path.join(userDataDir, 'test-molecule.smi');

    const electronApp = await electron.launch({
      args: [`--user-data-dir=${userDataDir}`, path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    // SMILES content, not an actual .mol file — parseMolecule's parse_any
    // auto-detects format from content, not the file extension, and this
    // is the exact string the app's own default sample loads via.
    await electronApp.evaluate(
      ({ BrowserWindow }, { filePath }) => {
        BrowserWindow.getAllWindows()[0].webContents.send('menu:open-file', {
          path: filePath,
          content: 'c1ccccc1',
        });
      },
      { filePath: openedPath }
    );

    await expect(window.getByText(`Opened: ${openedPath}`)).toBeVisible();

    await expect
      .poll(() => {
        if (!fs.existsSync(settingsPath)) return null;
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')).recentFiles;
      })
      .toEqual([openedPath]);

    await electronApp.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });
});
