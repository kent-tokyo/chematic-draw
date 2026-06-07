import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow;

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
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
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
        ...(isMac ? [{ role: 'close' }] : [{ role: 'quit' }]),
      ],
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: isMac ? 'Cmd+Z' : 'Ctrl+Z' },
        { role: 'redo', accelerator: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z' },
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
