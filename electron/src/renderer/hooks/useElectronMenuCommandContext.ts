import { useEffect } from 'react';

interface ElectronMenuCommandContext {
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

/** Synchronize renderer state with Electron's native-menu enablement context. */
export function useElectronMenuCommandContext(context: ElectronMenuCommandContext) {
  const { atomCount, selectedAtomCount, selectedBondCount, canUndo, canRedo, sidebarOpen, mainToolsOpen, generalToolbarOpen, statusBarOpen, templatePanelOpen, workspaceProfile, activeSidebarPanel } = context;
  useEffect(() => {
    const api = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    api?.setMenuCommandContext?.({ atomCount, selectedAtomCount, selectedBondCount, canUndo, canRedo, sidebarOpen, mainToolsOpen, generalToolbarOpen, statusBarOpen, templatePanelOpen, workspaceProfile, activeSidebarPanel });
  }, [activeSidebarPanel, atomCount, canRedo, canUndo, generalToolbarOpen, mainToolsOpen, selectedAtomCount, selectedBondCount, sidebarOpen, statusBarOpen, templatePanelOpen, workspaceProfile]);
}
