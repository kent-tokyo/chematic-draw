import { create } from 'zustand';
import { UIState } from './types';

interface UIStoreState extends UIState {
  // Status bar
  statusMessage: string;
  statusExpiry: number; // timestamp

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setLanguage: (lang: 'en' | 'ja') => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setFocusMode: (enabled: boolean) => void;
  setStatus: (message: string, durationMs?: number) => void;
  clearStatus: () => void;
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

  setTheme: (theme) => set({ theme }),

  setLanguage: (lang) => set({ language: lang }),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setSidebarWidth: (width) => {
    const clamped = Math.max(180, Math.min(480, width));
    set({ sidebarWidth: clamped });
  },

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
}));
