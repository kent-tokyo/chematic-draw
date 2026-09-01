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

  test('File > Export exposes the importable JSON session bundle', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const exportLabels = await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const fileMenu = menu?.items.find((item) => item.label === 'File');
      const exportMenu = fileMenu?.submenu?.items.find((item) => item.label === 'Export');
      return exportMenu?.submenu?.items.map((item) => item.label) ?? [];
    });
    expect(exportLabels).toContain('Export session bundle (JSON)...');

    await electronApp.close();
  });

  test('file export IPC rejects invalid paths and oversized payloads', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const results = await window.evaluate(() => {
      const api = (window as unknown as {
        electronAPI: {
          fileWrite: (filePath: string, content: string) => Promise<{ success: boolean }>;
          fileWriteBinary: (filePath: string, content: string) => Promise<{ success: boolean }>;
          exportPdf: (filePath: string, content: string) => Promise<{ success: boolean }>;
        };
      }).electronAPI;
      return Promise.all([
        api.fileWrite('', 'valid but pathless'),
        api.fileWrite('/tmp/chematic-too-large.txt', 'x'.repeat(10_000_001)),
        api.fileWriteBinary('/tmp/chematic-invalid.bin', 'not base64'),
        api.exportPdf('/tmp/chematic-too-large.pdf', '<svg>'.concat('x'.repeat(10_000_001), '</svg>')),
      ]);
    });

    expect(results.every(({ success }) => success === false)).toBe(true);
    await electronApp.close();
  });

  test('packaged renderer cannot navigate or open an arbitrary popup', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const appUrl = await window.url();
    const popupWasDenied = await window.evaluate(() => window.open('https://example.com') === null);
    await window.waitForTimeout(250);

    expect(popupWasDenied).toBe(true);
    expect(await electronApp.windows()).toHaveLength(1);
    expect(await window.url()).toBe(appUrl);

    await electronApp.close();
  });

  test('recent-file IPC rejects malformed renderer paths', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const results = await window.evaluate(() => {
      const recordRecentFile = (window as unknown as {
        electronAPI: {
          recordRecentFile: (filePath: string) => Promise<{ success: boolean }>;
        };
      }).electronAPI.recordRecentFile;
      return Promise.all([
        recordRecentFile(''),
        recordRecentFile('x'.repeat(4_097)),
      ]);
    });

    expect(results.every(({ success }) => success === false)).toBe(true);
    await electronApp.close();
  });

  test('clipboard and settings IPC reject malformed renderer arguments', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const results = await window.evaluate(() => {
      const api = (window as unknown as {
        electronAPI: {
          copyToClipboard: (format: string, content: string) => Promise<{ success: boolean }>;
          saveSettings: (key: string, value: unknown) => Promise<{ success: boolean }>;
          loadSettings: (key: string) => Promise<{ success: boolean }>;
        };
      }).electronAPI;
      return Promise.all([
        api.copyToClipboard('text/html', '<script>bad</script>'),
        api.saveSettings('__proto__', { polluted: true }),
        api.saveSettings('theme', 'neon'),
        api.saveSettings('sidebarWidth', 999),
        api.loadSettings('unknown-setting'),
      ]);
    });

    expect(results.every(({ success }) => success === false)).toBe(true);
    await electronApp.close();
  });

  test('packaged app migrates a v1 session bundle on open', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const legacyPath = path.join(os.tmpdir(), `chematic-v1-session-${Date.now()}.schematic.json`);
    const legacyBundle = JSON.stringify({
      schema: 'chematic-draw/session-bundle',
      schema_version: 1,
      app: { name: 'chematic-draw', engine: 'chematic 0.35.0' },
      source: { file_path: null },
      molecule: { atoms: [{ id: 0, element: 'N', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] },
    });

    await electronApp.evaluate(({ BrowserWindow }, data) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:open-file', data);
    }, { path: legacyPath, content: legacyBundle });

    await expect(window.getByText(/^1a • 0b/)).toBeVisible({ timeout: 10000 });
    await expect(window.getByTestId('molecule-canvas')).toHaveAttribute('aria-label', /1 atom, 0 bonds/);
    await electronApp.close();
  });

  test('Edit > Select All menu item actually selects everything', async () => {
    // Same dead-wiring bug class as the Shortcuts modal test above, found
    // by the same sweep once that fix landed: main.js sends 'menu:select-all'
    // on click, preload.js exposes onMenuSelectAll, but renderer.tsx never
    // subscribed — the menu item (and its Cmd/Ctrl+A accelerator, insofar
    // as it reaches the renderer at all) did nothing. Proven here via
    // Delete: selecting everything then deleting must empty the canvas;
    // with the bug, Delete would have nothing selected to act on.
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });
    await expect(window.getByTestId('molecule-canvas')).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:select-all');
    });
    await window.getByTestId('molecule-canvas').focus();
    await window.keyboard.press('Delete');

    await expect(window.getByTestId('molecule-canvas')).toHaveAttribute(
      'aria-label',
      'Molecular structure canvas, empty'
    );

    await electronApp.close();
  });

  test('Edit > Undo/Redo menu items actually undo/redo the molecule', async () => {
    // main.js's Edit > Undo/Redo used to be Electron's built-in
    // role: 'undo'/'redo' — a MenuItem's `click` is ignored whenever
    // `role` is set, so there was no way to route it to the app's real
    // moleculeStore.undo()/redo(); clicking it invoked a real Chromium
    // execCommand instead, confirmed empirically (via
    // electronApp.evaluate calling webContents.undo() directly) to be a
    // complete no-op on this app's own molecule-edit history. Fixed with
    // custom label/click items — deliberately with NO accelerator, since
    // giving them one would re-register Cmd+Z/Cmd+Shift+Z as a native
    // menu shortcut, and whether a matching menu accelerator prevents the
    // keystroke from also reaching the page's own DOM keydown listener
    // (useKeyboard.ts, which already correctly calls undo()/redo())
    // couldn't be verified in this environment — Playwright's key
    // injection bypasses native menu accelerator dispatch entirely. This
    // test only proves the menu *click* path (previously a silent no-op,
    // now real): the actual Cmd+Z/Cmd+Shift+Z keyboard shortcuts are
    // unaffected by this menu and were already covered by this session's
    // earlier undo-coverage tests.
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });
    await expect(window.getByTestId('molecule-canvas')).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    const canvas = window.getByTestId('molecule-canvas');
    await window.locator('button[title="C [C]"]').click();
    await canvas.click({ position: { x: 50, y: 50 } });
    await expect(canvas).toHaveAttribute('aria-label', /7 atoms, 6 bonds/);

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:undo');
    });
    await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:redo');
    });
    await expect(canvas).toHaveAttribute('aria-label', /7 atoms, 6 bonds/);

    await electronApp.close();
  });

  test('a successful batch transformation is one undoable document change', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    const canvas = window.getByTestId('molecule-canvas');
    await window.locator('button[title="C [C]"]').click();
    await canvas.click({ position: { x: 50, y: 50 } });
    await expect(canvas).toHaveAttribute('aria-label', /7 atoms, 6 bonds/);

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:batch-process');
    });
    const dialog = window.getByRole('dialog', { name: 'Batch Process Molecules' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Process', exact: true }).click();
    await expect(dialog).toBeHidden();

    // The batch result is currently identical for this standardize operation,
    // so use the following undo as the observable proof that batch itself
    // captured a checkpoint: it must leave the 7-atom document unchanged.
    await window.keyboard.press('Control+z');
    await expect(canvas).toHaveAttribute('aria-label', /7 atoms, 6 bonds/);
    await window.keyboard.press('Control+z');
    await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    await electronApp.close();
  });

  test('the batch dialog exposes property calculation results', async () => {
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:batch-process');
    });
    const dialog = window.getByRole('dialog', { name: 'Batch Process Molecules' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Properties', exact: true }).click();
    await dialog.getByRole('button', { name: 'Process', exact: true }).click();
    await expect(dialog).toBeHidden();

    await window.getByTestId('sidebar-tab-batch-results').click();
    await expect(window.getByText('Last Operation: properties')).toBeVisible();
    await expect(window.getByLabel('Batch result hash')).toContainText('fnv1a-32:');

    await electronApp.close();
  });

  test('electronAPI.pasteFromClipboard() resolves instead of hanging forever', async () => {
    // Found while investigating an unrelated menu issue (Edit > Copy/Paste
    // being wired to Electron's built-in role, not real app logic) —
    // main.js's clipboard:read IPC handler did `const text =
    // clipboard.readText(); return { success: true, content: text };`
    // without awaiting. On this Electron build, clipboard.readText()
    // itself returns a genuine Promise (confirmed empirically — logged
    // its constructor.name as 'Promise'), not the plain string its docs
    // describe. Embedding that live, unresolved Promise directly in this
    // handler's IPC response fails Electron's structured-clone
    // serialization ("Error occurred in handler for 'clipboard:read':
    // Error: An object could not be cloned", confirmed via the main
    // process's own stderr) — and that failure happens *after* the
    // handler already returned, so nothing in this file's own try/catch
    // ever saw it. The renderer's ipcRenderer.invoke('clipboard:read')
    // call — and therefore electronAPI.pasteFromClipboard(), and
    // therefore useKeyboard.ts's own Ctrl+V handler, completely
    // independent of any menu — just hung forever with no error and no
    // resolution. Paste-from-the-real-OS-clipboard never worked in the
    // packaged app, via keyboard or menu, before this fix.
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });

    await electronApp.evaluate(({ clipboard }) => clipboard.writeText('CCO'));
    const result = await window.evaluate(() => (window as any).electronAPI.pasteFromClipboard());

    expect(result).toEqual({ success: true, content: 'CCO' });

    await electronApp.close();
  });

  test('Edit > Copy/Paste menu items actually copy/paste the molecule', async () => {
    // Same bug class and same fix as the Undo/Redo menu test above:
    // role: 'copy'/'paste' invoke webContents.copy()/paste() (real
    // Chromium execCommands), confirmed empirically (via
    // electronApp.evaluate calling them directly, with a sentinel value
    // pre-seeded on the OS clipboard) to be complete no-ops when the
    // canvas — not a text field — has focus: Edit > Copy never put the
    // molecule's SMILES on the clipboard, and Edit > Paste never parsed
    // clipboard content into the molecule. Fixed the same way, with the
    // same no-accelerator reasoning (Cmd+C/Cmd+V are unaffected, already
    // covered by useKeyboard.ts's own listener).
    const electronApp = await electron.launch({
      args: [path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', {
      timeout: 15000,
    });
    const canvas = window.getByTestId('molecule-canvas');
    await expect(canvas).toHaveAttribute('aria-label', /6 atoms, 6 bonds/);

    await electronApp.evaluate(({ clipboard }) => clipboard.writeText('SENTINEL'));
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:copy');
    });
    await expect
      .poll(() => electronApp.evaluate(({ clipboard }) => clipboard.readText()))
      .not.toBe('SENTINEL');
    const copied = await electronApp.evaluate(({ clipboard }) => clipboard.readText());
    expect(copied.toLowerCase()).toContain('c1ccccc1');

    await electronApp.evaluate(({ clipboard }) => clipboard.writeText('CCO'));
    await electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].webContents.send('menu:paste');
    });
    await expect(canvas).toHaveAttribute('aria-label', /3 atoms, 2 bonds/);

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

  test('a non-object settings root falls back to safe defaults', async () => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chematic-invalid-settings-root-'));
    fs.writeFileSync(path.join(userDataDir, 'settings.json'), JSON.stringify(['invalid']), 'utf-8');

    const electronApp = await electron.launch({
      args: [`--user-data-dir=${userDataDir}`, path.resolve(__dirname, '..', '..')],
    });
    const window = await electronApp.firstWindow();
    await expect(window.getByTestId('app-root')).toHaveAttribute('data-ready', 'true', { timeout: 15000 });
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
