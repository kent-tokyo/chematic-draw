import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import { readFileSync, writeFileSync, existsSync, unlinkSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createSettingsStore } from './lib/settingsStore';
import { buildRecentFilesSubmenu } from './lib/recentFilesMenu';
import { registerFileIpcHandlers } from './lib/ipcFileHandlers';
import { registerClipboardAutosaveIpcHandlers } from './lib/ipcClipboardAutosave';
import { svgPageSizeInches } from './lib/svgPageSize';
import { isSafeSvgForPdf } from './lib/pdfExportContract';
import { ENGINE_ID } from './engineMetadata';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow;
const AUTOSAVE_PATH = path.join(app.getPath('userData'), 'autosave.json');
const AUTOSAVE_TMP_PATH = `${AUTOSAVE_PATH}.tmp`;
const MAX_AUTOSAVE_JSON_LENGTH = 10_000_000;
const MAX_AUTOSAVE_ATOMS = 100_000;
const MAX_AUTOSAVE_BONDS = 200_000;
const MAX_AUTOSAVE_FILE_PATH_LENGTH = 4_096;
const MAX_FILE_TEXT_LENGTH = 10_000_000;
const MAX_FILE_BINARY_BYTES = 50_000_000;
const MAX_FILE_PATH_LENGTH = 4_096;
const MAX_IMPORT_TEXT_BYTES = 10_000_000;
const ALLOWED_EXTERNAL_HOSTS = new Set([
  'pubchem.ncbi.nlm.nih.gov',
  'www.chemspider.com',
]);
const settingsStore = createSettingsStore(app.getPath('userData'));

// Set only when the user confirms "Restore" in checkAutosaveRecovery(),
// consumed exactly once by the 'autosave:get-pending-recovery' IPC handler.
let pendingRecovery = null;
let autosaveWriteQueue = Promise.resolve();
// Renderer settings effects for theme, language, sidebar, and shortcuts all
// debounce to the same interval. Serialize read-modify-write operations so
// concurrent IPC calls cannot load the same old JSON and overwrite each
// other's keys (the sidebar-close smoke test exposed this as a lost
// `sidebarWidth: 0`).
let settingsWriteQueue = Promise.resolve();
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
  const bondIds = new Set();
  const bondsSafe = molecule.bonds.every((bond) => bond && Number.isInteger(bond.id)
    && !bondIds.has(bond.id)
    && Number.isInteger(bond.from) && atomIds.has(bond.from)
    && Number.isInteger(bond.to) && atomIds.has(bond.to)
    && [1, 2, 3, 4].includes(bond.order) && [0, 1, 2].includes(bond.stereo)
    && bondIds.add(bond.id));
  if (!bondsSafe) return false;
  if (molecule.drawing === undefined) return true;
  const drawing = molecule.drawing;
  if (!drawing || !Array.isArray(drawing.texts) || !Array.isArray(drawing.arrows) || !Array.isArray(drawing.brackets)) return false;
  if (drawing.texts.length + drawing.arrows.length + drawing.brackets.length > 10_000) return false;
  const finite = (...values) => values.every(Number.isFinite);
  return drawing.texts.every((item) => item && typeof item.id === 'string' && typeof item.text === 'string' && item.text.length <= 2_048 && finite(item.x, item.y))
    && drawing.arrows.every((item) => item && typeof item.id === 'string' && ['forward', 'equilibrium', 'retro'].includes(item.kind) && finite(item.x1, item.y1, item.x2, item.y2))
    && drawing.brackets.every((item) => item && typeof item.id === 'string' && finite(item.x1, item.y1, item.x2, item.y2));
};

const isSafeAutosaveSnapshot = (snapshot) => snapshot && typeof snapshot === 'object'
  && isSafeMolecule(snapshot.molecule)
  && (snapshot.filePath === undefined || snapshot.filePath === null
    || (typeof snapshot.filePath === 'string' && snapshot.filePath.length <= MAX_AUTOSAVE_FILE_PATH_LENGTH));

const isTrustedRendererEvent = (event) => Boolean(mainWindow && event?.sender === mainWindow.webContents);
const isValidFilePath = (filePath) => typeof filePath === 'string'
  && filePath.length > 0 && filePath.length <= MAX_FILE_PATH_LENGTH;
const isValidBase64 = (value) => typeof value === 'string'
  && value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
const readImportText = (filePath) => {
  if (!isValidFilePath(filePath)) throw new Error('File read rejected an invalid file path.');
  const fileSize = statSync(filePath).size;
  if (fileSize > MAX_IMPORT_TEXT_BYTES) throw new Error('File read rejected an oversized input.');
  return readFileSync(filePath, 'utf-8');
};
const writeFileAtomically = (filePath, data, options) => {
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(temporaryPath, data, options);
    renameSync(temporaryPath, filePath);
  } finally {
    try {
      if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
    } catch {
      // The destination may have been replaced successfully; cleanup is best effort.
    }
  }
};

registerFileIpcHandlers({
  ipcMain,
  BrowserWindow,
  dialog,
  isTrustedRendererEvent,
  isValidFilePath,
  isValidBase64,
  readImportText,
  writeFileAtomically,
  svgPageSizeInches,
  isSafeSvgForPdf,
  maxTextBytes: MAX_FILE_TEXT_LENGTH,
  maxBinaryBytes: MAX_FILE_BINARY_BYTES,
  getMainWindow: () => mainWindow,
});

registerClipboardAutosaveIpcHandlers({
  ipcMain,
  isTrustedRendererEvent,
  maxTextLength: MAX_FILE_TEXT_LENGTH,
  maxAutosaveJsonLength: MAX_AUTOSAVE_JSON_LENGTH,
  maxAutosaveFilePathLength: MAX_AUTOSAVE_FILE_PATH_LENGTH,
  autosavePath: AUTOSAVE_PATH,
  autosaveTmpPath: AUTOSAVE_TMP_PATH,
  isSafeMolecule,
  getPendingRecovery: () => pendingRecovery,
  clearPendingRecovery: () => { pendingRecovery = null; },
  getAutosaveWriteQueue: () => autosaveWriteQueue,
  setAutosaveWriteQueue: (queue) => { autosaveWriteQueue = queue; },
});

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

  const appDevOrigin = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
    : null;
  const isAppNavigation = (url) => {
    if (appDevOrigin) {
      try {
        return new URL(url).origin === appDevOrigin;
      } catch {
        return false;
      }
    }
    return url.startsWith('file://');
  };

  // The renderer is the trusted app UI, but links and document content can
  // still attempt to navigate it or create a privileged child window. Keep
  // the app window on its own origin and send only the two deliberate
  // database links to the user's normal browser. All other popups are
  // denied, including javascript: and unknown HTTPS destinations.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppNavigation(url)) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTS.has(parsed.hostname)) {
        void shell.openExternal(parsed.toString());
      }
    } catch {
      // Malformed URLs are simply denied.
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
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
const createMenu = (recentFiles = settingsStore.load().recentFiles) => {
  const isMac = process.platform === 'darwin';

  // settings.json is user-editable on disk, not just written by
  // saveSettings() — a hand-edited or corrupted `recentFiles` (wrong type,
  // non-string entries) previously only reached this function from inside
  // the IPC handler's try/catch. It's now also reachable, unguarded, from
  // app.whenReady()'s startup call: a throw here means Electron falls back
  // to its own default menu template (wrong labels, missing every custom
  // File/Edit/View/Object/Structure/Search/Window/Help item) instead of ours, not just a broken
  // Recent Files submenu.
  const recentFilesSubmenu = buildRecentFilesSubmenu({
    recentFiles,
    isValidFilePath,
    loadSettings: settingsStore.load,
    saveSettings: settingsStore.save,
    readImportText,
    sendToRenderer: (channel, payload) => mainWindow.webContents.send(channel, payload),
    showError: (title, message) => dialog.showErrorBox(title, message),
    rebuildMenu: createMenu,
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
                const content = readImportText(filePath);
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
        {
          label: 'Print...',
          accelerator: isMac ? 'Cmd+P' : 'Ctrl+P',
          click: () => mainWindow.webContents.print({ printBackground: true }),
        },
        { type: 'separator' },
        {
          label: 'Batch Process...',
          click: () => mainWindow.webContents.send('menu:batch-process'),
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
        // A role-based cut invokes Chromium's DOM editing command, which is
        // a no-op for the canvas. Route it to the app's selection-aware cut
        // handler, just like Copy and Paste below.
        {
          label: 'Cut',
          click: () => mainWindow.webContents.send('menu:cut'),
        },
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
        {
          label: 'Fit to Window',
          click: () => mainWindow.webContents.send('menu:fit-view'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Sidebar',
          accelerator: isMac ? 'Cmd+B' : 'Ctrl+B',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar'),
        },
        {
          label: 'Show/Hide Main Tools',
          click: () => mainWindow.webContents.send('menu:toggle-main-tools'),
        },
        {
          label: 'Show/Hide General Toolbar',
          click: () => mainWindow.webContents.send('menu:toggle-general-toolbar'),
        },
        {
          label: 'Show/Hide Status Bar',
          click: () => mainWindow.webContents.send('menu:toggle-status-bar'),
        },
        {
          label: 'Toggle Theme',
          accelerator: isMac ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
          click: () => mainWindow.webContents.send('menu:toggle-theme'),
        },
        {
          label: 'Workspace',
          submenu: [
            { label: 'ChemDraw Familiar', click: () => mainWindow.webContents.send('menu:set-workspace-profile', 'chemdraw') },
            { label: 'Compact', click: () => mainWindow.webContents.send('menu:set-workspace-profile', 'compact') },
            { type: 'separator' },
            { label: 'Reset Workspace', click: () => mainWindow.webContents.send('menu:reset-workspace') },
          ],
        },
        { type: 'separator' },
        { role: 'toggleDevTools', accelerator: isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I' },
      ],
    },

    // ChemDraw-familiar command geography. Every visible item routes to a
    // renderer action with observable state; unsupported lookalike menus are
    // intentionally omitted instead of shipping dead destinations.
    {
      label: 'Object',
      submenu: [
        {
          label: 'Align Horizontally',
          click: () => mainWindow.webContents.send('menu:object-align-horizontal'),
        },
        {
          label: 'Align Vertically',
          click: () => mainWindow.webContents.send('menu:object-align-vertical'),
        },
        { type: 'separator' },
        { label: 'Distribute Horizontally', click: () => mainWindow.webContents.send('menu:object-distribute-horizontal') },
        { label: 'Distribute Vertically', click: () => mainWindow.webContents.send('menu:object-distribute-vertical') },
        { type: 'separator' },
        { label: 'Flip Horizontal', click: () => mainWindow.webContents.send('menu:object-flip-horizontal') },
        { label: 'Flip Vertical', click: () => mainWindow.webContents.send('menu:object-flip-vertical') },
        {
          label: 'Rotate 90° Clockwise',
          click: () => mainWindow.webContents.send('menu:object-rotate'),
        },
      ],
    },
    {
      label: 'Structure',
      submenu: [
        {
          label: 'Clean Up Structure',
          click: () => mainWindow.webContents.send('menu:structure-clean'),
        },
        {
          label: 'Check Structure',
          click: () => mainWindow.webContents.send('menu:show-panel', 'inspector'),
        },
        {
          label: 'Selection Properties',
          click: () => mainWindow.webContents.send('menu:show-panel', 'inspector'),
        },
        {
          label: 'Bond Stereo',
          click: () => mainWindow.webContents.send('menu:show-panel', 'stereo'),
        },
        { type: 'separator' },
        {
          label: 'Stereoisomers',
          click: () => mainWindow.webContents.send('menu:tool-stereoisomers'),
        },
        {
          label: 'Lipinski Rules',
          click: () => mainWindow.webContents.send('menu:tool-lipinski'),
        },
        {
          label: 'Property Prediction',
          click: () => mainWindow.webContents.send('menu:tool-properties'),
        },
        {
          label: 'Reaction Mechanism',
          click: () => mainWindow.webContents.send('menu:tool-mechanism'),
        },
      ],
    },
    {
      label: 'Search',
      submenu: [
        {
          label: 'Database Search...',
          click: () => mainWindow.webContents.send('menu:tool-database'),
        },
        {
          label: 'SMARTS Query...',
          click: () => mainWindow.webContents.send('menu:show-panel', 'query'),
        },
        {
          label: 'Identifiers and MCS...',
          click: () => mainWindow.webContents.send('menu:search-research'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Inspector', click: () => mainWindow.webContents.send('menu:show-panel', 'inspector') },
        { label: 'Query', click: () => mainWindow.webContents.send('menu:show-panel', 'query') },
        { label: 'Stereo', click: () => mainWindow.webContents.send('menu:show-panel', 'stereo') },
        { label: 'Templates', click: () => mainWindow.webContents.send('menu:show-panel', 'templates') },
        { label: 'Reactions', click: () => mainWindow.webContents.send('menu:show-panel', 'reactions') },
        { label: 'Mechanism', click: () => mainWindow.webContents.send('menu:show-panel', 'mechanism') },
        { type: 'separator' },
        { label: '3D Viewer', click: () => mainWindow.webContents.send('menu:show-panel', '3d') },
        { label: 'NMR Spectrum', click: () => mainWindow.webContents.send('menu:show-panel', 'nmr') },
        { label: 'Batch Results', click: () => mainWindow.webContents.send('menu:show-panel', 'batch-results') },
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
              detail: `Open-source chemical structure editor\nPowered by ${ENGINE_ID}`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// IPC Handlers for Settings Persistence
ipcMain.handle('settings:save', async (event, key, value) => {
  const write = settingsWriteQueue.then(() => {
    try {
      if (!isTrustedRendererEvent(event)) throw new Error('Settings request came from an untrusted renderer.');
      if (!settingsStore.isSafeKey(key) || !settingsStore.isSafeValue(key, value)) {
        throw new Error('Settings request rejected an invalid key or oversized value.');
      }
      const settings = settingsStore.load();
      settings[key] = value;
      settingsStore.save(settings);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  settingsWriteQueue = write.then(() => undefined, () => undefined);
  return write;
});

ipcMain.handle('settings:load', async (event, key) => {
  try {
    if (!isTrustedRendererEvent(event)) throw new Error('Settings request came from an untrusted renderer.');
    if (!settingsStore.isSafeKey(key)) throw new Error('Settings request rejected an invalid key.');
    const settings = settingsStore.load();
    if (settings[key] !== undefined && !settingsStore.isSafeValue(key, settings[key])) {
      throw new Error('Stored setting failed validation.');
    }
    return { success: true, value: settings[key] };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    if (!isTrustedRendererEvent(event)) throw new Error('Recent-file request came from an untrusted renderer.');
    if (!isValidFilePath(filePath)) throw new Error('Recent-file request rejected an invalid file path.');
    const settings = settingsStore.load();
    let recentFiles = settings.recentFiles || [];
    // Remove duplicate, add to front, keep last 10
    recentFiles = [filePath, ...recentFiles.filter(isValidFilePath).filter(f => f !== filePath)].slice(0, 10);
    settings.recentFiles = recentFiles;
    settingsStore.save(settings);
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
