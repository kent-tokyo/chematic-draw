import { contextBridge, ipcRenderer } from 'electron';

// Expose controlled IPC methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu events (main → renderer)
  onMenuNew: (callback) => ipcRenderer.on('menu:new', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu:open-file', (event, data) => callback(data)),
  onMenuSave: (callback) => ipcRenderer.on('menu:save', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu:save-as', callback),
  onMenuExportSvg: (callback) => ipcRenderer.on('menu:export-svg', callback),
  onMenuExportMol: (callback) => ipcRenderer.on('menu:export-mol', callback),
  onMenuExportSmiles: (callback) => ipcRenderer.on('menu:export-smiles', callback),
  onMenuSelectAll: (callback) => ipcRenderer.on('menu:select-all', callback),
  onMenuZoomIn: (callback) => ipcRenderer.on('menu:zoom-in', callback),
  onMenuZoomOut: (callback) => ipcRenderer.on('menu:zoom-out', callback),
  onMenuZoomReset: (callback) => ipcRenderer.on('menu:zoom-reset', callback),
  onMenuToggleSidebar: (callback) => ipcRenderer.on('menu:toggle-sidebar', callback),
  onMenuToggleTheme: (callback) => ipcRenderer.on('menu:toggle-theme', callback),
  onMenuShortcuts: (callback) => ipcRenderer.on('menu:shortcuts', callback),

  // File operations (renderer → main)
  fileSaveDialog: (defaultPath) => ipcRenderer.invoke('file:save-dialog', defaultPath),
  fileWrite: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),

  // Clipboard operations (renderer → main)
  copyToClipboard: (format, content) => ipcRenderer.invoke('clipboard:write', format, content),
  pasteFromClipboard: () => ipcRenderer.invoke('clipboard:read'),

  // Settings persistence (renderer → main)
  saveSettings: (key, value) => ipcRenderer.invoke('settings:save', key, value),
  loadSettings: (key) => ipcRenderer.invoke('settings:load', key),
  recordRecentFile: (filePath) => ipcRenderer.invoke('recent-file:add', filePath),
});
