import { create } from 'zustand';
import { UIState, AtomDto, BondDto } from './types';

interface UIStoreState extends UIState {
  // Status bar
  statusMessage: string;
  statusExpiry: number; // timestamp

  // Sidebar
  activeSidebarPanel: 'inspector' | 'templates' | 'chat' | 'research';
  selectedAtomForInspector: AtomDto | null;
  selectedBondForInspector: BondDto | null;

  // Context menu
  contextMenu: { visible: boolean; x: number; y: number; atomId?: number; bondId?: number } | null;

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (lang: 'en' | 'ja') => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveSidebarPanel: (panel: 'inspector' | 'templates' | 'chat' | 'research') => void;
  setSelectedAtomForInspector: (atom: AtomDto | null) => void;
  setSelectedBondForInspector: (bond: BondDto | null) => void;
  setFocusMode: (enabled: boolean) => void;
  setStatus: (message: string, durationMs?: number) => void;
  clearStatus: () => void;
  showContextMenu: (x: number, y: number, atomId?: number, bondId?: number) => void;
  hideContextMenu: () => void;
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
  selectedAtomForInspector: null,
  selectedBondForInspector: null,
  contextMenu: null,

  setTheme: (theme) => set({ theme }),

  setLanguage: (lang) => set({ language: lang }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSidebarWidth: (width) => {
    const clamped = Math.max(180, Math.min(480, width));
    set({ sidebarWidth: clamped });
  },

  setActiveSidebarPanel: (panel) => set({ activeSidebarPanel: panel }),

  setSelectedAtomForInspector: (atom) => set({ selectedAtomForInspector: atom }),

  setSelectedBondForInspector: (bond) => set({ selectedBondForInspector: bond }),

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
}));
