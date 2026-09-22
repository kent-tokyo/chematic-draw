import { create } from 'zustand';
import { UIState } from './types';
import { DEFAULT_SHORTCUT_BINDINGS, ShortcutBindings } from '../lib/shortcuts';
export type { AppLanguage, ContextMenuState, ModalType, SidebarPanel, WorkspaceProfile } from '../../../../packages/chematic-contract/src/index';
import type { AppLanguage, ContextMenuState, ModalType, SidebarPanel, WorkspaceProfile } from '../../../../packages/chematic-contract/src/index';
export type { BatchItemSummary, BatchProvenance, BatchResultSummary } from '../../../../packages/chematic-contract/src/index';
import type { BatchItemSummary, BatchProvenance, BatchResultSummary } from '../../../../packages/chematic-contract/src/index';

interface UIStoreState extends UIState {
  // Status bar
  statusMessage: string;
  statusExpiry: number; // timestamp

  // Sidebar
  activeSidebarPanel: SidebarPanel;
  // Just the id, not a snapshot: both left-click (Select tool) and
  // right-click (context menu) set this, and InspectorPanel looks the atom
  // up in `molecule.atoms` live on every render. A stored AtomDto used to go
  // stale the moment the atom changed after being selected, and plain
  // left-click never touched this at all — only right-click did.
  selectedAtomIdForInspector: number | null;
  selectedBondIdForInspector: number | null;

  // Context menu
  contextMenu: ContextMenuState | null;

  // Modals
  showShortcutsModal: boolean;
  showUndoModal: boolean;
  showBatchDialog: boolean;
  showSettingsModal: boolean;

  // Batch results history
  batchResults: BatchResultSummary[];
  shortcutBindings: ShortcutBindings;

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (lang: AppLanguage) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setMainToolsOpen: (open: boolean) => void;
  setGeneralToolbarOpen: (open: boolean) => void;
  setStatusBarOpen: (open: boolean) => void;
  setTemplatePanelOpen: (open: boolean) => void;
  setTemplatePanelWidth: (width: number) => void;
  setWorkspaceProfile: (profile: WorkspaceProfile) => void;
  resetWorkspace: () => void;
  setActiveSidebarPanel: (panel: SidebarPanel) => void;
  setSelectedAtomIdForInspector: (id: number | null) => void;
  setSelectedBondIdForInspector: (id: number | null) => void;
  setFocusMode: (enabled: boolean) => void;
  setStatus: (message: string, durationMs?: number) => void;
  clearStatus: () => void;
  showContextMenu: (x: number, y: number, atomId?: number, bondId?: number) => void;
  hideContextMenu: () => void;
  showModal: (type: ModalType) => void;
  hideModal: (type: ModalType) => void;
  addBatchResult: (
    operation: string,
    processed: number,
    failed: number,
    skipped: number,
    resultHash: string,
    errors: string[],
    provenance: BatchProvenance,
    details?: { cancelled: boolean; items: BatchItemSummary[]; retry?: BatchResultSummary['retry'] }
  ) => void;
  setShortcutBindings: (bindings: ShortcutBindings) => void;
  resetShortcutBindings: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  // Initial state
  theme: 'dark',
  language: 'en',
  sidebarOpen: true,
  sidebarWidth: 300,
  mainToolsOpen: true,
  generalToolbarOpen: true,
  statusBarOpen: true,
  templatePanelOpen: false,
  templatePanelWidth: 260,
  workspaceProfile: 'chemdraw',
  focusMode: false,
  statusMessage: '',
  statusExpiry: 0,
  activeSidebarPanel: 'inspector',
  selectedAtomIdForInspector: null,
  selectedBondIdForInspector: null,
  contextMenu: null,
  showShortcutsModal: false,
  showUndoModal: false,
  showBatchDialog: false,
  showSettingsModal: false,
  batchResults: [],
  shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS },

  setTheme: (theme) => set({ theme }),

  setLanguage: (lang) => set({ language: lang }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setMainToolsOpen: (open) => set({ mainToolsOpen: open }),

  setGeneralToolbarOpen: (open) => set({ generalToolbarOpen: open }),

  setStatusBarOpen: (open) => set({ statusBarOpen: open }),

  setTemplatePanelOpen: (open) => set({ templatePanelOpen: open }),

  setTemplatePanelWidth: (width) => set({ templatePanelWidth: Math.max(190, Math.min(480, width)) }),

  setWorkspaceProfile: (workspaceProfile) => set((state) => ({
    workspaceProfile,
    sidebarWidth: workspaceProfile === 'compact' ? Math.min(state.sidebarWidth, 240) : Math.max(state.sidebarWidth, 300),
    mainToolsOpen: true,
    generalToolbarOpen: true,
    statusBarOpen: true,
    templatePanelOpen: false,
    templatePanelWidth: 260,
  })),

  resetWorkspace: () => set({
    workspaceProfile: 'chemdraw',
    mainToolsOpen: true,
    sidebarOpen: true,
    sidebarWidth: 300,
    generalToolbarOpen: true,
    statusBarOpen: true,
    templatePanelOpen: false,
    templatePanelWidth: 260,
    activeSidebarPanel: 'inspector',
    focusMode: false,
  }),

  setSidebarWidth: (width) => {
    const clamped = Math.max(180, Math.min(480, width));
    set({ sidebarWidth: clamped });
  },

  setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),

  setSelectedAtomIdForInspector: (id) => set({ selectedAtomIdForInspector: id }),

  setSelectedBondIdForInspector: (id) => set({ selectedBondIdForInspector: id }),

  setFocusMode: (enabled) => set({ focusMode: enabled }),

  setStatus: (message, durationMs = 3000) => {
    const expiry = Date.now() + durationMs;
    set({
      statusMessage: message,
      statusExpiry: expiry,
    });
  },

  clearStatus: () => {
    set({
      statusMessage: '',
      statusExpiry: 0,
    });
  },

  showContextMenu: (x, y, atomId, bondId) => {
    set({ contextMenu: { visible: true, x, y, atomId, bondId } });
  },

  hideContextMenu: () => {
    set({ contextMenu: null });
  },

  showModal: (type) => {
    if (type === 'shortcuts') set({ showShortcutsModal: true });
    if (type === 'undo') set({ showUndoModal: true });
    if (type === 'batch') set({ showBatchDialog: true });
    if (type === 'settings') set({ showSettingsModal: true });
  },

  hideModal: (type) => {
    if (type === 'shortcuts') set({ showShortcutsModal: false });
    if (type === 'undo') set({ showUndoModal: false });
    if (type === 'batch') set({ showBatchDialog: false });
    if (type === 'settings') set({ showSettingsModal: false });
  },

  addBatchResult: (operation, processed, failed, skipped, resultHash, errors, provenance, details = { cancelled: false, items: [] }) => {
    set((state) => ({
      batchResults: [
        ...state.batchResults,
        { operation, processed, failed, skipped, resultHash, errors, provenance, timestamp: Date.now(), ...details },
      ].slice(-10), // Keep last 10 results
    }));
  },
  setShortcutBindings: (shortcutBindings) => set({ shortcutBindings }),
  resetShortcutBindings: () => set({ shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS } }),
}));
