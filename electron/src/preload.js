import { contextBridge, ipcRenderer } from 'electron';

// Expose controlled IPC methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu events (main → renderer)
  // renderer.tsx re-registers these handlers when its stateful closures
  // change. Clear the previous subscriptions first so stale molecule
  // snapshots cannot race the current handler (notably on menu:copy).
  clearMenuListeners: () => {
    [
      'menu:new', 'menu:open-file', 'menu:save', 'menu:save-as',
      'menu:export-svg', 'menu:export-png', 'menu:export-pdf',
      'menu:export-mol', 'menu:export-smiles', 'menu:select-all',
      'menu:undo', 'menu:redo', 'menu:copy', 'menu:paste',
      'menu:zoom-in', 'menu:zoom-out', 'menu:zoom-reset',
      'menu:toggle-sidebar', 'menu:toggle-theme', 'menu:shortcuts',
      'menu:undo-timeline', 'menu:batch-process', 'menu:tool-stereoisomers',
      'menu:tool-lipinski', 'menu:tool-properties', 'menu:tool-mechanism',
      'menu:tool-database',
    ].forEach((channel) => ipcRenderer.removeAllListeners(channel));
  },
  onMenuNew: (callback) => ipcRenderer.on('menu:new', callback),
  onMenuOpenFile: (callback) => ipcRenderer.on('menu:open-file', (event, data) => callback(data)),
  onMenuSave: (callback) => ipcRenderer.on('menu:save', callback),
  onMenuSaveAs: (callback) => ipcRenderer.on('menu:save-as', callback),
  onMenuExportSvg: (callback) => ipcRenderer.on('menu:export-svg', callback),
  onMenuExportPng: (callback) => ipcRenderer.on('menu:export-png', callback),
  onMenuExportPdf: (callback) => ipcRenderer.on('menu:export-pdf', callback),
  onMenuExportMol: (callback) => ipcRenderer.on('menu:export-mol', callback),
  onMenuExportSmiles: (callback) => ipcRenderer.on('menu:export-smiles', callback),
  onMenuSelectAll: (callback) => ipcRenderer.on('menu:select-all', callback),
  onMenuUndo: (callback) => ipcRenderer.on('menu:undo', callback),
  onMenuRedo: (callback) => ipcRenderer.on('menu:redo', callback),
  onMenuCopy: (callback) => ipcRenderer.on('menu:copy', callback),
  onMenuPaste: (callback) => ipcRenderer.on('menu:paste', callback),
  onMenuZoomIn: (callback) => ipcRenderer.on('menu:zoom-in', callback),
  onMenuZoomOut: (callback) => ipcRenderer.on('menu:zoom-out', callback),
  onMenuZoomReset: (callback) => ipcRenderer.on('menu:zoom-reset', callback),
  onMenuToggleSidebar: (callback) => ipcRenderer.on('menu:toggle-sidebar', callback),
  onMenuToggleTheme: (callback) => ipcRenderer.on('menu:toggle-theme', callback),
  onMenuShortcuts: (callback) => ipcRenderer.on('menu:shortcuts', callback),
  onMenuUndoTimeline: (callback) => ipcRenderer.on('menu:undo-timeline', callback),
  onMenuBatchProcess: (callback) => ipcRenderer.on('menu:batch-process', callback),
  onMenuToolStereoisomers: (callback) => ipcRenderer.on('menu:tool-stereoisomers', callback),
  onMenuToolLipinski: (callback) => ipcRenderer.on('menu:tool-lipinski', callback),
  onMenuToolProperties: (callback) => ipcRenderer.on('menu:tool-properties', callback),
  onMenuToolMechanism: (callback) => ipcRenderer.on('menu:tool-mechanism', callback),
  onMenuToolDatabase: (callback) => ipcRenderer.on('menu:tool-database', callback),

  // File operations (renderer → main)
  fileSaveDialog: (defaultPath) => ipcRenderer.invoke('file:save-dialog', defaultPath),
  fileWrite: (filePath, content) => ipcRenderer.invoke('file:write', filePath, content),
  fileWriteBinary: (filePath, base64Content) => ipcRenderer.invoke('file:write-binary', filePath, base64Content),
  exportPdf: (filePath, svgText) => ipcRenderer.invoke('export:pdf', filePath, svgText),

  // Clipboard operations (renderer → main)
  copyToClipboard: (format, content) => ipcRenderer.invoke('clipboard:write', format, content),
  pasteFromClipboard: () => ipcRenderer.invoke('clipboard:read'),

  // Settings persistence (renderer → main)
  saveSettings: (key, value) => ipcRenderer.invoke('settings:save', key, value),
  loadSettings: (key) => ipcRenderer.invoke('settings:load', key),
  recordRecentFile: (filePath) => ipcRenderer.invoke('recent-file:add', filePath),

  // Autosave / crash recovery (renderer → main)
  autosaveWrite: (molecule, filePath) => ipcRenderer.invoke('autosave:write', molecule, filePath),
  getPendingRecovery: () => ipcRenderer.invoke('autosave:get-pending-recovery'),
});
