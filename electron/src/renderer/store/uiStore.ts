import { create } from 'zustand';
import { UIState } from './types';
import { DEFAULT_SHORTCUT_BINDINGS, ShortcutBindings } from '../lib/shortcuts';

export interface BatchItemSummary {
  index: number;
  status: 'succeeded' | 'failed' | 'skipped' | 'cancelled';
  warnings: string[];
  error?: string;
  properties?: {
    formula: string;
    molecular_weight: number;
    logp: number;
    tpsa: number;
  };
}

export interface BatchProvenance {
  engine: 'chematic 0.35.0';
  inputFormat?: string;
  outputFormat?: string;
  filterOptions?: { minMW?: number; maxMW?: number };
}

export interface BatchResultSummary {
  operation: string;
  processed: number;
  failed: number;
  skipped: number;
  resultHash: string;
  errors: string[];
  timestamp: number;
  provenance: BatchProvenance;
  cancelled?: boolean;
  items: BatchItemSummary[];
}

interface UIStoreState extends UIState {
  // Status bar
  statusMessage: string;
  statusExpiry: number; // timestamp

  // Sidebar
  activeSidebarPanel: 'inspector' | 'templates' | 'chat' | 'research' | 'reactions' | 'batch-results' | 'stereoisomers' | 'lipinski' | 'properties' | 'mechanism' | 'database' | '3d';
  // Just the id, not a snapshot: both left-click (Select tool) and
  // right-click (context menu) set this, and InspectorPanel looks the atom
  // up in `molecule.atoms` live on every render. A stored AtomDto used to go
  // stale the moment the atom changed after being selected, and plain
  // left-click never touched this at all — only right-click did.
  selectedAtomIdForInspector: number | null;
  selectedBondIdForInspector: number | null;

  // Context menu
  contextMenu: { visible: boolean; x: number; y: number; atomId?: number; bondId?: number } | null;

  // Modals
  showShortcutsModal: boolean;
  showUndoModal: boolean;
  showBatchDialog: boolean;

  // Batch results history
  batchResults: BatchResultSummary[];
  shortcutBindings: ShortcutBindings;

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (lang: 'en' | 'ja') => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveSidebarPanel: (panel: 'inspector' | 'templates' | 'chat' | 'research' | 'reactions' | 'batch-results' | 'stereoisomers' | 'lipinski' | 'properties' | 'mechanism' | 'database' | '3d') => void;
  setSelectedAtomIdForInspector: (id: number | null) => void;
  setSelectedBondIdForInspector: (id: number | null) => void;
  setFocusMode: (enabled: boolean) => void;
  setStatus: (message: string, durationMs?: number) => void;
  clearStatus: () => void;
  showContextMenu: (x: number, y: number, atomId?: number, bondId?: number) => void;
  hideContextMenu: () => void;
  showModal: (type: 'shortcuts' | 'export' | 'undo' | 'batch') => void;
  hideModal: (type: 'shortcuts' | 'export' | 'undo' | 'batch') => void;
  addBatchResult: (
    operation: string,
    processed: number,
    failed: number,
    skipped: number,
    resultHash: string,
    errors: string[],
    provenance: BatchProvenance,
    details?: { cancelled: boolean; items: BatchItemSummary[] }
  ) => void;
  setShortcutBindings: (bindings: ShortcutBindings) => void;
  resetShortcutBindings: () => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  // Initial state
  theme: 'dark',
  language: 'en',
  sidebarOpen: true,
  sidebarWidth: 260,
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
  batchResults: [],
  shortcutBindings: { ...DEFAULT_SHORTCUT_BINDINGS },

  setTheme: (theme) => set({ theme }),

  setLanguage: (lang) => set({ language: lang }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

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
  },

  hideModal: (type) => {
    if (type === 'shortcuts') set({ showShortcutsModal: false });
    if (type === 'undo') set({ showUndoModal: false });
    if (type === 'batch') set({ showBatchDialog: false });
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
