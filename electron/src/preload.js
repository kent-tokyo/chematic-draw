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
      'menu:export-mol', 'menu:export-smiles', 'menu:export-json', 'menu:select-all',
      'menu:undo', 'menu:redo', 'menu:cut', 'menu:copy', 'menu:paste',
      'menu:zoom-in', 'menu:zoom-out', 'menu:zoom-reset', 'menu:fit-view',
      'menu:toggle-sidebar', 'menu:toggle-main-tools', 'menu:toggle-general-toolbar', 'menu:toggle-status-bar', 'menu:toggle-theme', 'menu:reset-workspace', 'menu:set-workspace-profile', 'menu:shortcuts',
      'menu:undo-timeline', 'menu:batch-process', 'menu:tool-stereoisomers',
      'menu:tool-lipinski', 'menu:tool-properties', 'menu:tool-mechanism',
      'menu:tool-database', 'menu:object-align-horizontal', 'menu:object-align-vertical',
      'menu:object-distribute-horizontal', 'menu:object-distribute-vertical', 'menu:object-flip-horizontal', 'menu:object-flip-vertical',
      'menu:object-rotate', 'menu:structure-clean', 'menu:search-research', 'menu:show-panel',
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
  onMenuExportJson: (callback) => ipcRenderer.on('menu:export-json', callback),
  onMenuSelectAll: (callback) => ipcRenderer.on('menu:select-all', callback),
  onMenuUndo: (callback) => ipcRenderer.on('menu:undo', callback),
  onMenuRedo: (callback) => ipcRenderer.on('menu:redo', callback),
  onMenuCut: (callback) => ipcRenderer.on('menu:cut', callback),
  onMenuCopy: (callback) => ipcRenderer.on('menu:copy', callback),
  onMenuPaste: (callback) => ipcRenderer.on('menu:paste', callback),
  onMenuZoomIn: (callback) => ipcRenderer.on('menu:zoom-in', callback),
  onMenuZoomOut: (callback) => ipcRenderer.on('menu:zoom-out', callback),
  onMenuZoomReset: (callback) => ipcRenderer.on('menu:zoom-reset', callback),
  onMenuFitView: (callback) => ipcRenderer.on('menu:fit-view', callback),
  onMenuToggleSidebar: (callback) => ipcRenderer.on('menu:toggle-sidebar', callback),
  onMenuToggleMainTools: (callback) => ipcRenderer.on('menu:toggle-main-tools', callback),
  onMenuToggleGeneralToolbar: (callback) => ipcRenderer.on('menu:toggle-general-toolbar', callback),
  onMenuToggleStatusBar: (callback) => ipcRenderer.on('menu:toggle-status-bar', callback),
  onMenuToggleTheme: (callback) => ipcRenderer.on('menu:toggle-theme', callback),
  onMenuResetWorkspace: (callback) => ipcRenderer.on('menu:reset-workspace', callback),
  onMenuSetWorkspaceProfile: (callback) => ipcRenderer.on('menu:set-workspace-profile', (_event, profile) => callback(profile)),
  onMenuShortcuts: (callback) => ipcRenderer.on('menu:shortcuts', callback),
  onMenuUndoTimeline: (callback) => ipcRenderer.on('menu:undo-timeline', callback),
  onMenuBatchProcess: (callback) => ipcRenderer.on('menu:batch-process', callback),
  onMenuToolStereoisomers: (callback) => ipcRenderer.on('menu:tool-stereoisomers', callback),
  onMenuToolLipinski: (callback) => ipcRenderer.on('menu:tool-lipinski', callback),
  onMenuToolProperties: (callback) => ipcRenderer.on('menu:tool-properties', callback),
  onMenuToolMechanism: (callback) => ipcRenderer.on('menu:tool-mechanism', callback),
  onMenuToolDatabase: (callback) => ipcRenderer.on('menu:tool-database', callback),
  onMenuObjectAlignHorizontal: (callback) => ipcRenderer.on('menu:object-align-horizontal', callback),
  onMenuObjectAlignVertical: (callback) => ipcRenderer.on('menu:object-align-vertical', callback),
  onMenuObjectDistributeHorizontal: (callback) => ipcRenderer.on('menu:object-distribute-horizontal', callback),
  onMenuObjectDistributeVertical: (callback) => ipcRenderer.on('menu:object-distribute-vertical', callback),
  onMenuObjectFlipHorizontal: (callback) => ipcRenderer.on('menu:object-flip-horizontal', callback),
  onMenuObjectFlipVertical: (callback) => ipcRenderer.on('menu:object-flip-vertical', callback),
  onMenuObjectRotate: (callback) => ipcRenderer.on('menu:object-rotate', callback),
  onMenuStructureClean: (callback) => ipcRenderer.on('menu:structure-clean', callback),
  onMenuSearchResearch: (callback) => ipcRenderer.on('menu:search-research', callback),
  onMenuShowPanel: (callback) => ipcRenderer.on('menu:show-panel', (_event, panel) => callback(panel)),

  // File operations (renderer → main)
  fileOpenDialog: () => ipcRenderer.invoke('file:open-dialog'),
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
