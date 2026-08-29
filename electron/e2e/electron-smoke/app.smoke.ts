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

  test('opening a file records it in Recent Files — persisted AND in the live menu', async () => {
    // Regression test: main.js has a full Recent Files implementation —
    // recent-file:add IPC handler, menu rebuild, click-to-reopen, Clear
    // Recent Files — and preload.js exposes it as
    // electronAPI.recordRecentFile, but nothing in renderer.tsx ever
    // called it. The list was permanently empty in practice. Found via a
    // sweep cross-checking every preload-exposed function against its
    // actual renderer.tsx call sites (recordRecentFile: 0) after
    // discovering the same dead-wiring pattern for the Shortcuts menu item
    // above.
    //
    // Wiring the caller up surfaced a second, deeper, pre-existing bug:
    // updateFileMenu() tried to patch a live MenuItem's `submenu` property
    // directly — Electron makes that read-only, so it threw on every call
    // ("Cannot assign to read only property 'submenu'"), silently caught
    // by the IPC handler's try/catch. settings.json persistence still
    // succeeded (that write happens before the throw), so a test checking
    // only the settings file would go green while the actual on-screen
    // Recent Files submenu stayed permanently empty in every session,
    // including a fresh relaunch (createMenu()'s own template never read
    // saved recentFiles at startup either). Fixed by making the "Recent
    // Files" submenu part of the same template createMenu() feeds
    // Menu.buildFromTemplate() on every call (a full rebuild, which is
    // what Electron actually supports), rather than a later in-place
    // patch — createMenu() now takes recentFiles as a parameter (defaulted
    // from saved settings, so a relaunch shows them too), and the IPC
    // handler calls createMenu(recentFiles) instead of the broken helper.
    //
    // This test checks both halves: settings.json (persistence) and the
    // real Menu's actual item labels (the part the first version of this
    // fix didn't verify and would have shipped broken).
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

    const menuState = await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const fileMenu = menu?.items.find((i) => i.label === 'File');
      const recent = fileMenu?.submenu?.items.find((i) => i.label === 'Recent Files');
      return {
        topLevel: menu?.items.map((i) => i.label) ?? [],
        recentLabels: recent?.submenu?.items.map((i) => i.label) ?? [],
      };
    });
    expect(menuState.topLevel).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);
    expect(menuState.recentLabels[0]).toBe(`1. ${path.basename(openedPath)}`);

    await electronApp.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  test('a corrupted recentFiles in settings.json does not break the whole application menu', async () => {
    // Regression test for a bug introduced by the previous fix, caught by
    // a follow-up advisor review pass: createMenu() moved from being only
    // reachable inside the recent-file:add IPC handler's try/catch to also
    // being the default-parameter path used at app startup
    // (createMenu() with no args, called from app.whenReady()). settings.json
    // is a user-editable file on disk, not just written by saveSettings() —
    // a hand-edited or corrupted recentFiles (wrong type, e.g. a string
    // instead of an array) used to throw inside createMenu()'s .map() call,
    // unguarded, at startup. Electron doesn't crash on that (the promise
    // chain has no .catch()), but it never reaches Menu.setApplicationMenu()
    // either, so it silently falls back to Electron's own default menu
    // template — wrong top-level labels, and every custom File/Edit/View/
    // Tools/Help item (Export, Recent Files, Batch Process, the Tools
    // panels, Keyboard Shortcuts) missing, not just Recent Files.
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chematic-corrupt-settings-test-'));
    fs.writeFileSync(
      path.join(userDataDir, 'settings.json'),
      JSON.stringify({ recentFiles: 'not-an-array' }),
      'utf-8'
    );

    const electronApp = await electron.launch({
      args: [`--user-data-dir=${userDataDir}`, path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const topLevel = await electronApp.evaluate(
      ({ Menu }) => Menu.getApplicationMenu()?.items.map((i) => i.label) ?? []
    );
    expect(topLevel).toEqual(['File', 'Edit', 'View', 'Tools', 'Help']);

    await electronApp.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });

  test('closing the sidebar persists across a relaunch', async () => {
    // Regression test: the settings-hydration effect checked
    // `savedSidebarWidth.value` for truthiness before restoring, but a
    // closed sidebar is persisted as sidebarWidth: 0 (there's no separate
    // sidebarOpen setting — 0 encodes "closed"). 0 is falsy, so the restore
    // branch was skipped entirely and the sidebar silently reopened at its
    // default width on every relaunch, even though settings.json correctly
    // recorded the closed state the whole time. Found via a sweep of the
    // settings-hydration code adjacent to this round's other fixes.
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chematic-sidebar-test-'));
    const settingsPath = path.join(userDataDir, 'settings.json');

    const firstApp = await electron.launch({
      args: [`--user-data-dir=${userDataDir}`, path.resolve(__dirname, '..', '..')],
    });
    const firstWindow = await firstApp.firstWindow();
    await expect(firstWindow.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await expect(firstWindow.getByTestId('sidebar')).toBeVisible();
    await firstWindow.getByRole('button', { name: 'Close sidebar' }).click();
    await expect(firstWindow.getByTestId('sidebar')).not.toBeVisible();

    // The settings save effect debounces 500ms before writing.
    await expect
      .poll(() => {
        if (!fs.existsSync(settingsPath)) return null;
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')).sidebarWidth;
      })
      .toBe(0);

    await firstApp.close();

    const secondApp = await electron.launch({
      args: [`--user-data-dir=${userDataDir}`, path.resolve(__dirname, '..', '..')],
    });
    const secondWindow = await secondApp.firstWindow();
    await expect(secondWindow.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await expect(secondWindow.getByTestId('sidebar')).not.toBeVisible({ timeout: 5000 });

    await secondApp.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  });
});
