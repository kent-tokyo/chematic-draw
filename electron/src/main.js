import { app, BrowserWindow, Menu, dialog, ipcMain, clipboard } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, renameSync } from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { svgPageSizeInches } from './lib/svgPageSize';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow;
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');
const AUTOSAVE_PATH = path.join(app.getPath('userData'), 'autosave.json');
const AUTOSAVE_TMP_PATH = `${AUTOSAVE_PATH}.tmp`;
const MAX_AUTOSAVE_JSON_LENGTH = 10_000_000;
const MAX_AUTOSAVE_ATOMS = 100_000;
const MAX_AUTOSAVE_BONDS = 200_000;
const MAX_AUTOSAVE_FILE_PATH_LENGTH = 4_096;

// Set only when the user confirms "Restore" in checkAutosaveRecovery(),
// consumed exactly once by the 'autosave:get-pending-recovery' IPC handler.
let pendingRecovery = null;
let autosaveWriteQueue = Promise.resolve();
let quittingAfterAutosaveFlush = false;

const isSafeMolecule = (molecule) => {
  if (!molecule || !Array.isArray(molecule.atoms) || !Array.isArray(molecule.bonds)) return false;
  if (molecule.atoms.length > MAX_AUTOSAVE_ATOMS || molecule.bonds.length > MAX_AUTOSAVE_BONDS) return false;
  const atomIds = new Set();
  for (const atom of molecule.atoms) {
    if (!atom || !Number.isInteger(atom.id) || atomIds.has(atom.id) || typeof atom.element !== 'string'
      || atom.element.length === 0 || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)
      || !Number.isInteger(atom.charge) || !Number.isInteger(atom.atom_map)) return false;
    if (atom.isotope !== undefined && (!Number.isInteger(atom.isotope) || atom.isotope < 1)) return false;
    if (atom.hydrogen_count !== undefined && (!Number.isInteger(atom.hydrogen_count) || atom.hydrogen_count < 0)) return false;
    atomIds.add(atom.id);
  }
  return molecule.bonds.every((bond) => bond && Number.isInteger(bond.id)
    && Number.isInteger(bond.from) && atomIds.has(bond.from)
    && Number.isInteger(bond.to) && atomIds.has(bond.to)
    && [1, 2, 3, 4].includes(bond.order) && [0, 1, 2].includes(bond.stereo));
};

const isSafeAutosaveSnapshot = (snapshot) => snapshot && typeof snapshot === 'object'
  && isSafeMolecule(snapshot.molecule)
  && (snapshot.filePath === undefined || snapshot.filePath === null
    || (typeof snapshot.filePath === 'string' && snapshot.filePath.length <= MAX_AUTOSAVE_FILE_PATH_LENGTH));

const isTrustedRendererEvent = (event) => Boolean(mainWindow && event?.sender === mainWindow.webContents);

// Helper functions for settings persistence
const loadSettings = () => {
  if (!existsSync(SETTINGS_PATH)) return {};
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch (err) {
    console.error('Failed to load settings:', err);
    return {};
  }
};

const saveSettings = (data) => {
  const dir = path.dirname(SETTINGS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf-8');
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // Only auto-open DevTools in dev mode — a packaged/production build
    // shouldn't launch with DevTools already open. This was previously
    // unconditional, which also meant DevTools' own window could be the
    // first BrowserWindow Playwright's _electron.firstWindow() observed.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

// Create application menu
// Building the "Recent Files" submenu is deliberately part of the same
// template createMenu() feeds to Menu.buildFromTemplate() on every call,
// not a later in-place patch — MenuItem.submenu is a real Menu instance
// once built, and Electron makes it read-only. Assigning a new array to it
// throws ("Cannot assign to read only property 'submenu'"), which is
// exactly what the previous updateFileMenu() helper did on every call,
// silently (caught by the IPC handler's try/catch) — the Recent Files
// submenu never actually updated, in any session, ever. A full rebuild via
// buildFromTemplate is the only way Electron supports changing it.
const createMenu = (recentFiles = loadSettings().recentFiles) => {
  const isMac = process.platform === 'darwin';

  // settings.json is user-editable on disk, not just written by
  // saveSettings() — a hand-edited or corrupted `recentFiles` (wrong type,
  // non-string entries) previously only reached this function from inside
  // the IPC handler's try/catch. It's now also reachable, unguarded, from
  // app.whenReady()'s startup call: a throw here means Electron falls back
  // to its own default menu template (wrong labels, missing every custom
  // File/Edit/View/Tools/Help item) instead of ours, not just a broken
  // Recent Files submenu.
  const safeRecentFiles = Array.isArray(recentFiles)
    ? recentFiles.filter((f) => typeof f === 'string')
    : [];

  const recentFilesSubmenu = safeRecentFiles.map((filePath, idx) => ({
    label: `${idx + 1}. ${path.basename(filePath)}`,
    accelerator: `Ctrl+${idx + 1}`,
    click: async () => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        mainWindow.webContents.send('menu:open-file', { path: filePath, content });
      } catch (err) {
        dialog.showErrorBox('Error', `Failed to open: ${err.message}`);
      }
    },
  }));
  if (recentFilesSubmenu.length > 0) {
    recentFilesSubmenu.push({ type: 'separator' });
  }
  recentFilesSubmenu.push({
    label: 'Clear Recent Files',
    click: () => {
      const settings = loadSettings();
      settings.recentFiles = [];
      saveSettings(settings);
      createMenu([]);
    },
  });

  const template = [
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: () => mainWindow.webContents.send('menu:new'),
        },
        {
          label: 'Open...',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'Molecule and session files', extensions: ['mol', 'smi', 'sdf', 'cml', 'cdxml', 'json'] },
                { name: 'All Files', extensions: ['*'] },
              ],
              properties: ['openFile'],
            });
            if (!canceled && filePaths.length > 0) {
              const filePath = filePaths[0];
              try {
                const content = readFileSync(filePath, 'utf-8');
                mainWindow.webContents.send('menu:open-file', { path: filePath, content });
              } catch (err) {
                dialog.showErrorBox('Error', `Failed to open file: ${err.message}`);
              }
            }
          },
        },
        {
          label: 'Save',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: () => mainWindow.webContents.send('menu:save'),
        },
        {
          label: 'Save As...',
          accelerator: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
          click: async () => {
            mainWindow.webContents.send('menu:save-as');
          },
        },
        { type: 'separator' },
        {
          label: 'Export',
          submenu: [
            {
              label: 'Export as SVG...',
              click: () => mainWindow.webContents.send('menu:export-svg'),
            },
            {
              label: 'Export as PNG...',
              click: () => mainWindow.webContents.send('menu:export-png'),
            },
            {
              label: 'Export as PDF...',
              click: () => mainWindow.webContents.send('menu:export-pdf'),
            },
            {
              label: 'Export as MOL V2000...',
              click: () => mainWindow.webContents.send('menu:export-mol'),
            },
            {
              label: 'Export as SMILES...',
              click: () => mainWindow.webContents.send('menu:export-smiles'),
            },
            {
              label: 'Export session bundle (JSON)...',
              click: () => mainWindow.webContents.send('menu:export-json'),
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Recent Files',
          submenu: recentFilesSubmenu,
        },
        { type: 'separator' },
        ...(isMac ? [{ role: 'close' }] : [{ role: 'quit' }]),
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        // Deliberately custom items with NO accelerator, not Electron's
        // built-in role: 'undo'/'redo' — those invoke webContents.undo()/
        // redo() (a real Chromium execCommand, confirmed empirically to be
        // a complete no-op on this app's own molecule-edit history, which
        // isn't DOM-editing-based), and a MenuItem's `click` is ignored
        // whenever `role` is set, so there was no way to route a role-based
        // item to the app's real undo/redo at all. Giving these an
        // accelerator here would re-register Cmd+Z/Cmd+Shift+Z as a native
        // menu shortcut — on every desktop platform, a matching menu
        // accelerator is handled by the OS/native menu layer, which may or
        // may not also let the keystroke reach the page's own DOM keydown
        // listener depending on platform and Electron version, and that
        // couldn't be verified in this environment (Playwright's key
        // injection bypasses native menu dispatch entirely, so it can't
        // distinguish the two cases). Leaving accelerator unset avoids that
        // ambiguity outright: Cmd+Z/Cmd+Shift+Z keep working exactly as
        // before, via useKeyboard.ts's own DOM-level keydown listener
        // (which does correctly call the app's real undo()/redo(), see
        // Discovered Work), completely independent of this menu — and
        // clicking the menu item now also works, which it silently never
        // did before.
        {
          label: 'Undo',
          click: () => mainWindow.webContents.send('menu:undo'),
        },
        {
          label: 'Redo',
          click: () => mainWindow.webContents.send('menu:redo'),
        },
        {
          label: 'Undo Timeline',
          accelerator: isMac ? 'Cmd+Ctrl+Z' : 'Ctrl+Alt+Z',
          click: () => mainWindow.webContents.send('menu:undo-timeline'),
        },
        { type: 'separator' },
        // role: 'cut' left as-is — no app-level Cut feature exists for it
        // to shadow (useKeyboard.ts has no Ctrl+X handler), unlike Copy/
        // Paste below.
        { role: 'cut', accelerator: isMac ? 'Cmd+X' : 'Ctrl+X' },
        // Same fix as Undo/Redo above, same reason: role: 'copy'/'paste'
        // invoke webContents.copy()/paste() (real Chromium execCommands),
        // confirmed empirically to be complete no-ops when the canvas
        // (not a text field) has focus — clicking Edit > Copy never put
        // the molecule's SMILES on the clipboard, and Edit > Paste never
        // parsed clipboard content into the molecule, silently doing
        // nothing instead of routing to useKeyboard.ts's real
        // clipboard.copyMoleculeSmiles()/pasteFromClipboard() logic
        // (`click` is ignored outright whenever `role` is set). No
        // accelerator, for the same reason as Undo/Redo: Cmd+C/Cmd+V stay
        // exactly as they already work today, entirely via
        // useKeyboard.ts's own keydown listener.
        {
          label: 'Copy',
          click: () => mainWindow.webContents.send('menu:copy'),
        },
        {
          label: 'Paste',
          click: () => mainWindow.webContents.send('menu:paste'),
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: isMac ? 'Cmd+A' : 'Ctrl+A',
          click: () => mainWindow.webContents.send('menu:select-all'),
        },
        { type: 'separator' },
        {
          label: 'Batch Process...',
          click: () => mainWindow.webContents.send('menu:batch-process'),
        },
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: isMac ? 'Cmd+=' : 'Ctrl+=',
          click: () => mainWindow.webContents.send('menu:zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: isMac ? 'Cmd+-' : 'Ctrl+-',
          click: () => mainWindow.webContents.send('menu:zoom-out'),
        },
        {
          label: 'Reset Zoom',
          accelerator: isMac ? 'Cmd+0' : 'Ctrl+0',
          click: () => mainWindow.webContents.send('menu:zoom-reset'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: isMac ? 'Cmd+B' : 'Ctrl+B',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar'),
        },
        {
          label: 'Toggle Theme',
          accelerator: isMac ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
          click: () => mainWindow.webContents.send('menu:toggle-theme'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools', accelerator: isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I' },
      ],
    },

    // Tools menu (Phases 6-10)
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Stereoisomers (Phase 6)',
          click: () => mainWindow.webContents.send('menu:tool-stereoisomers'),
        },
        {
          label: 'Lipinski Rules (Phase 7)',
          click: () => mainWindow.webContents.send('menu:tool-lipinski'),
        },
        {
          label: 'Property Prediction (Phase 8)',
          click: () => mainWindow.webContents.send('menu:tool-properties'),
        },
        {
          label: 'Reaction Mechanism (Phase 9)',
          click: () => mainWindow.webContents.send('menu:tool-mechanism'),
        },
        {
          label: 'Database Search (Phase 10)',
          click: () => mainWindow.webContents.send('menu:tool-database'),
        },
      ],
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          click: () => mainWindow.webContents.send('menu:shortcuts'),
        },
        {
          label: 'About chematic-draw',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About chematic-draw',
              // app.getVersion() reads package.json's real version, so this
              // never goes stale the way a hardcoded string did (was
              // "v0.1.0" against an actual 0.2.2-rc.1). The chematic crate
              // version has no equivalent runtime accessor from this
              // process — kept as a literal, matching the same
              // manually-updated pattern already used for it elsewhere
              // (e.g. docs/API.md).
              message: `chematic-draw v${app.getVersion()}`,
              detail: 'Open-source chemical structure editor\nPowered by chematic 0.20.1',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// IPC Handlers for File Operations
ipcMain.handle('file:save-dialog', async (event, defaultPath) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'MOL V2000', extensions: ['mol'] },
      { name: 'SMILES', extensions: ['smi'] },
      { name: 'SDF', extensions: ['sdf'] },
      { name: 'SVG', extensions: ['svg'] },
      { name: 'PNG', extensions: ['png'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return { canceled, filePath };
});

ipcMain.handle('file:write', async (event, filePath, content) => {
  try {
    writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Separate from file:write because that handler always encodes as utf-8 —
// passing PNG bytes through it would corrupt the file. base64Content is
// decoded to a raw Buffer here instead.
ipcMain.handle('file:write-binary', async (event, filePath, base64Content) => {
  try {
    writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Renders the molecule's own SVG into a dedicated hidden window (not the
// live editing canvas) and prints that to PDF, so the export is unaffected
// by canvas zoom/pan/selection highlighting.
ipcMain.handle('export:pdf', async (event, filePath, svgText) => {
  const { width, height } = svgPageSizeInches(svgText);
  const html = `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0}</style></head><body>${svgText}</body></html>`;
  const pdfWindow = new BrowserWindow({ show: false });
  try {
    await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const buffer = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: { width, height },
      margins: { marginType: 'none' },
    });
    writeFileSync(filePath, buffer);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    pdfWindow.destroy();
  }
});

// IPC Handlers for Clipboard
ipcMain.handle('clipboard:write', async (event, format, content) => {
  try {
    // Awaited, not fire-and-forget: on this Electron build,
    // clipboard.readText() below was found to actually return a Promise
    // (not the plain string its docs describe), not just for read — an
    // un-awaited async clipboard call here would let this handler return
    // {success: true} before the write is confirmed to have landed.
    await clipboard.writeText(content);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clipboard:read', async (_event) => {
  try {
    // Must be awaited: clipboard.readText() returns a genuine Promise on
    // this platform/Electron build, not the plain string its docs
    // describe (confirmed empirically — logged its constructor.name as
    // 'Promise'). An un-awaited `text` here embeds that live Promise
    // object directly in this handler's IPC response, which Electron's
    // structured-clone serialization cannot handle ("An object could not
    // be cloned") — that throw happens *after* this handler already
    // returned, so it never reaches the try/catch here; the renderer's
    // ipcRenderer.invoke('clipboard:read') call just hangs forever with
    // no error and no resolution. Paste-from-clipboard never worked in
    // the packaged app as a result — found while investigating an
    // unrelated menu issue (Edit > Copy/Paste), not by looking for this.
    const text = await clipboard.readText();
    return { success: true, content: text };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handlers for Settings Persistence
ipcMain.handle('settings:save', async (event, key, value) => {
  try {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('settings:load', async (event, key) => {
  try {
    const settings = loadSettings();
    return { success: true, value: settings[key] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handlers for Autosave / Crash Recovery
//
// This is deliberately NOT "restore unsaved changes" — the app has no
// dirty-tracking, so it can't tell a saved molecule from an edited one.
// It's "restore whatever was open last time," offered only when
// autosave.json still exists at launch, which only happens when the
// previous run didn't reach a clean quit (before-quit below always clears
// it). A crash mid-write would otherwise leave a truncated, unparseable
// JSON file, which is worse than no recovery at all — so the write goes to
// a temp file first and only replaces the real one via an atomic rename.
ipcMain.handle('autosave:write', async (event, molecule, filePath) => {
  if (!isTrustedRendererEvent(event)) return { success: false, error: 'Autosave request came from an untrusted renderer.' };
  const writeSnapshot = () => {
    const normalizedFilePath = filePath ?? null;
    if (!isSafeMolecule(molecule)) throw new Error('Autosave rejected an invalid or oversized molecule.');
    if (normalizedFilePath !== null && (typeof normalizedFilePath !== 'string' || normalizedFilePath.length > MAX_AUTOSAVE_FILE_PATH_LENGTH)) {
      throw new Error('Autosave rejected an invalid file path.');
    }
    const snapshotText = JSON.stringify({ molecule, filePath: normalizedFilePath });
    if (snapshotText.length > MAX_AUTOSAVE_JSON_LENGTH) throw new Error('Autosave snapshot exceeds its size limit.');
    const dir = path.dirname(AUTOSAVE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(AUTOSAVE_TMP_PATH, snapshotText, 'utf-8');
    renameSync(AUTOSAVE_TMP_PATH, AUTOSAVE_PATH);
  };
  // Serialize writes with quit cleanup. This closes the small race where
  // before-quit could unlink the old snapshot between writeFileSync and the
  // atomic rename, leaving stale recovery data behind.
  autosaveWriteQueue = autosaveWriteQueue.then(writeSnapshot, writeSnapshot);
  try {
    await autosaveWriteQueue;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// One-shot pull: the renderer calls this once, after WASM (and therefore
// setMolecule) is ready, instead of main.js pushing at an uncertain time.
ipcMain.handle('autosave:get-pending-recovery', async (event) => {
  if (!isTrustedRendererEvent(event)) return null;
  const snapshot = pendingRecovery;
  pendingRecovery = null;
  return snapshot;
});

// Asks the user, via a native confirm dialog, whether to restore the
// snapshot left behind by a previous run that didn't exit cleanly. Runs
// once at startup, before the renderer can have registered anything —
// the answer is stashed in pendingRecovery for the renderer to pull once
// it's actually ready to accept a molecule.
const checkAutosaveRecovery = async () => {
  if (!existsSync(AUTOSAVE_PATH)) return;
  try {
    const snapshot = JSON.parse(readFileSync(AUTOSAVE_PATH, 'utf-8'));
    if (!isSafeAutosaveSnapshot(snapshot)) throw new Error('Autosave snapshot failed validation.');
    // Native OS dialogs can't be driven by Playwright's _electron automation
    // (no CDP access outside the web content) — e2e coverage of this branch
    // answers via this env var instead of the real dialog. Never set outside
    // tests, so production behavior always goes through the real dialog.
    const response = process.env.CHEMATIC_E2E_AUTOSAVE_ANSWER
      ? (process.env.CHEMATIC_E2E_AUTOSAVE_ANSWER === 'restore' ? 0 : 1)
      : (await dialog.showMessageBox(mainWindow, {
          type: 'question',
          buttons: ['Restore', 'Discard'],
          defaultId: 0,
          cancelId: 1,
          title: 'Restore last session?',
          message: "chematic-draw didn't exit cleanly last time.",
          detail: 'Restore the molecule that was open when it closed?',
        })).response;
    if (response === 0) {
      pendingRecovery = snapshot;
    }
  } catch (err) {
    console.error('Failed to read autosave snapshot:', err);
  } finally {
    // Already captured in memory (or unreadable) either way — the file's
    // only job was surviving until this check, and a fresh one gets
    // written again as soon as the user makes their next edit.
    try {
      unlinkSync(AUTOSAVE_PATH);
    } catch {
      // already gone
    }
  }
};

// IPC Handler for Recent Files
ipcMain.handle('recent-file:add', async (event, filePath) => {
  try {
    const settings = loadSettings();
    let recentFiles = settings.recentFiles || [];
    // Remove duplicate, add to front, keep last 10
    recentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10);
    settings.recentFiles = recentFiles;
    saveSettings(settings);
    createMenu(recentFiles);
    return { success: true, recentFiles };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  createWindow();
  createMenu();
  await checkAutosaveRecovery();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createMenu();
    }
  });
});

// A clean quit (menu Quit, Cmd+Q, closing the last window on
// Windows/Linux) always reaches here, so clearing the snapshot here is
// what makes its presence at next launch mean "didn't exit cleanly" — a
// crash or force-kill skips this handler, leaving it behind. Wait for any
// queued atomic write before clearing it so a write cannot recreate the file
// after cleanup.
app.on('before-quit', (event) => {
  if (quittingAfterAutosaveFlush) {
    try {
      if (existsSync(AUTOSAVE_PATH)) unlinkSync(AUTOSAVE_PATH);
    } catch (err) {
      console.error('Failed to clear autosave snapshot on quit:', err);
    }
    return;
  }
  event.preventDefault();
  quittingAfterAutosaveFlush = true;
  autosaveWriteQueue.then(() => app.quit(), () => app.quit());
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
