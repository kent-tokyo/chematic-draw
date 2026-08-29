import { app, BrowserWindow, Menu, dialog, ipcMain, clipboard } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow;
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

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
const createMenu = () => {
  const isMac = process.platform === 'darwin';

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
                { name: 'Molecule Files', extensions: ['mol', 'smi', 'sdf', 'cml', 'cdxml'] },
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
                dialog.showErrorDialog(mainWindow, 'Error', `Failed to open file: ${err.message}`);
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
              label: 'Export as MOL V2000...',
              click: () => mainWindow.webContents.send('menu:export-mol'),
            },
            {
              label: 'Export as SMILES...',
              click: () => mainWindow.webContents.send('menu:export-smiles'),
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Recent Files',
          submenu: [],
        },
        { type: 'separator' },
        ...(isMac ? [{ role: 'close' }] : [{ role: 'quit' }]),
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: isMac ? 'Cmd+Z' : 'Ctrl+Z' },
        { role: 'redo', accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z' },
        {
          label: 'Undo Timeline',
          accelerator: isMac ? 'Cmd+Ctrl+Z' : 'Ctrl+Alt+Z',
          click: () => mainWindow.webContents.send('menu:undo-timeline'),
        },
        { type: 'separator' },
        { role: 'cut', accelerator: isMac ? 'Cmd+X' : 'Ctrl+X' },
        { role: 'copy', accelerator: isMac ? 'Cmd+C' : 'Ctrl+C' },
        { role: 'paste', accelerator: isMac ? 'Cmd+V' : 'Ctrl+V' },
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
              message: 'chematic-draw v0.1.0',
              detail: 'Open-source chemical structure editor\nPowered by chematic 0.1.32',
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

// IPC Handlers for Clipboard
ipcMain.handle('clipboard:write', async (event, format, content) => {
  try {
    clipboard.writeText(content);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clipboard:read', async (_event) => {
  try {
    const text = clipboard.readText();
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

// IPC Handler for Recent Files
ipcMain.handle('recent-file:add', async (event, filePath) => {
  try {
    const settings = loadSettings();
    let recentFiles = settings.recentFiles || [];
    // Remove duplicate, add to front, keep last 10
    recentFiles = [filePath, ...recentFiles.filter(f => f !== filePath)].slice(0, 10);
    settings.recentFiles = recentFiles;
    saveSettings(settings);
    updateFileMenu(recentFiles);
    return { success: true, recentFiles };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Helper to rebuild File menu with recent files
const updateFileMenu = (recentFiles) => {
  const fileMenu = Menu.getApplicationMenu()?.items.find(item => item.label === 'File');
  if (!fileMenu) return;

  // Find "Recent Files" submenu position
  const recentIdx = fileMenu.submenu?.items.findIndex(item => item.label === 'Recent Files');
  if (recentIdx === undefined || recentIdx < 0) return;

  // Build recent files submenu
  const recentSubmenu = recentFiles.map((filePath, idx) => ({
    label: `${idx + 1}. ${path.basename(filePath)}`,
    accelerator: `Ctrl+${idx + 1}`,
    click: async () => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        mainWindow.webContents.send('menu:open-file', { path: filePath, content });
      } catch (err) {
        dialog.showErrorDialog(mainWindow, 'Error', `Failed to open: ${err.message}`);
      }
    },
  }));

  if (recentSubmenu.length > 0) {
    recentSubmenu.push({ type: 'separator' });
  }
  recentSubmenu.push({ label: 'Clear Recent Files', click: () => {
    const settings = loadSettings();
    settings.recentFiles = [];
    saveSettings(settings);
    updateFileMenu([]);
  }});

  fileMenu.submenu.items[recentIdx].submenu = recentSubmenu;
  Menu.setApplicationMenu(Menu.buildFromTemplate(Menu.getApplicationMenu().items));
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  createMenu();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createMenu();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
