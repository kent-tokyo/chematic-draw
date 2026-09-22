import type { MoleculeDto } from './store/types';
import type { DatabaseResult } from '../../../packages/chematic-contract/src/index';

export interface ElectronOperationResult {
  success: boolean;
  error?: string;
}

export interface ElectronOpenFileResult {
  canceled: boolean;
  path?: string;
  content?: string;
  error?: string;
}

export interface ElectronSaveFileResult {
  canceled: boolean;
  filePath?: string;
}

export interface ElectronMenuCommandContext {
  atomCount: number;
  selectedAtomCount: number;
  selectedBondCount: number;
  canUndo: boolean;
  canRedo: boolean;
  sidebarOpen: boolean;
  mainToolsOpen: boolean;
  generalToolbarOpen: boolean;
  statusBarOpen: boolean;
  templatePanelOpen: boolean;
  workspaceProfile: string;
  activeSidebarPanel: string;
}

export interface ElectronRecoverySnapshot {
  molecule: MoleculeDto;
  filePath: string | null;
}

export interface ElectronChemSpiderStatus {
  available: boolean;
  reason?: string;
}

type MenuListener = () => void;
type MenuOpenFileListener = (file: Pick<ElectronOpenFileResult, 'path' | 'content'> & { path: string; content: string }) => void;
type MenuStringListener = (value: string) => void;

/**
 * Renderer contract for the narrowly scoped API exposed by preload.js.
 * Keep this surface in sync with preload rather than widening call sites
 * through window casts; all IPC input is still validated in the main process.
 */
export interface ElectronApi {
  clearMenuListeners: MenuListener;
  onMenuNew: (callback: MenuListener) => void;
  onMenuOpenFile: (callback: MenuOpenFileListener) => void;
  onMenuSave: (callback: MenuListener) => void;
  onMenuSaveAs: (callback: MenuListener) => void;
  onMenuExportSvg: (callback: MenuListener) => void;
  onMenuExportPng: (callback: MenuListener) => void;
  onMenuExportPdf: (callback: MenuListener) => void;
  onMenuExportMol: (callback: MenuListener) => void;
  onMenuExportSmiles: (callback: MenuListener) => void;
  onMenuExportJson: (callback: MenuListener) => void;
  onMenuSelectAll: (callback: MenuListener) => void;
  onMenuUndo: (callback: MenuListener) => void;
  onMenuRedo: (callback: MenuListener) => void;
  onMenuCut: (callback: MenuListener) => void;
  onMenuCopy: (callback: MenuListener) => void;
  onMenuPaste: (callback: MenuListener) => void;
  onMenuZoomIn: (callback: MenuListener) => void;
  onMenuZoomOut: (callback: MenuListener) => void;
  onMenuZoomReset: (callback: MenuListener) => void;
  onMenuFitView: (callback: MenuListener) => void;
  onMenuToggleSidebar: (callback: MenuListener) => void;
  onMenuToggleMainTools: (callback: MenuListener) => void;
  onMenuToggleGeneralToolbar: (callback: MenuListener) => void;
  onMenuToggleStatusBar: (callback: MenuListener) => void;
  onMenuToggleTheme: (callback: MenuListener) => void;
  onMenuResetWorkspace: (callback: MenuListener) => void;
  onMenuSetWorkspaceProfile: (callback: MenuStringListener) => void;
  onMenuShortcuts: (callback: MenuListener) => void;
  onMenuMigrationGuide: (callback: MenuListener) => void;
  onMenuUndoTimeline: (callback: MenuListener) => void;
  onMenuBatchProcess: (callback: MenuListener) => void;
  onMenuToolStereoisomers: (callback: MenuListener) => void;
  onMenuToolLipinski: (callback: MenuListener) => void;
  onMenuToolProperties: (callback: MenuListener) => void;
  onMenuToolMechanism: (callback: MenuListener) => void;
  onMenuToolDatabase: (callback: MenuListener) => void;
  onMenuObjectAlignHorizontal: (callback: MenuListener) => void;
  onMenuObjectAlignVertical: (callback: MenuListener) => void;
  onMenuObjectDistributeHorizontal: (callback: MenuListener) => void;
  onMenuObjectDistributeVertical: (callback: MenuListener) => void;
  onMenuObjectFlipHorizontal: (callback: MenuListener) => void;
  onMenuObjectFlipVertical: (callback: MenuListener) => void;
  onMenuObjectRotate: (callback: MenuListener) => void;
  onMenuStructureClean: (callback: MenuListener) => void;
  onMenuSearchResearch: (callback: MenuListener) => void;
  onMenuShowPanel: (callback: MenuStringListener) => void;
  setMenuCommandContext: (context: ElectronMenuCommandContext) => void;

  fileOpenDialog: () => Promise<ElectronOpenFileResult>;
  fileSaveDialog: (defaultPath: string) => Promise<ElectronSaveFileResult>;
  fileWrite: (filePath: string, content: string) => Promise<ElectronOperationResult>;
  fileWriteBinary: (filePath: string, base64Content: string) => Promise<ElectronOperationResult>;
  exportPdf: (filePath: string, svgText: string) => Promise<ElectronOperationResult>;

  copyToClipboard: (format: 'text/plain', content: string) => Promise<ElectronOperationResult>;
  pasteFromClipboard: () => Promise<ElectronOperationResult & { content?: string }>;

  saveSettings: (key: string, value: unknown) => Promise<ElectronOperationResult>;
  loadSettings: (key: string) => Promise<ElectronOperationResult & { value?: unknown }>;
  recordRecentFile: (filePath: string) => Promise<ElectronOperationResult & { recentFiles?: string[] }>;
  getChemSpiderStatus: () => Promise<ElectronChemSpiderStatus>;
  searchChemSpiderByName: (query: string) => Promise<ElectronOperationResult & { results?: DatabaseResult[] }>;

  autosaveWrite: (molecule: MoleculeDto, filePath: string | null) => Promise<ElectronOperationResult>;
  getPendingRecovery: () => Promise<ElectronRecoverySnapshot | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronApi;
    __CHEMATIC_PLAYGROUND__?: boolean;
  }
}

export function getElectronApi(): ElectronApi | undefined {
  return typeof window === 'undefined' ? undefined : window.electronAPI;
}
