import { useEffect } from 'react';
import { getElectronApi, type ElectronMenuCommandContext } from '../electronApi';

/** Synchronize renderer state with Electron's native-menu enablement context. */
export function useElectronMenuCommandContext(context: ElectronMenuCommandContext) {
  const { atomCount, selectedAtomCount, selectedBondCount, canUndo, canRedo, sidebarOpen, mainToolsOpen, generalToolbarOpen, statusBarOpen, templatePanelOpen, workspaceProfile, activeSidebarPanel } = context;
  useEffect(() => {
    getElectronApi()?.setMenuCommandContext({ atomCount, selectedAtomCount, selectedBondCount, canUndo, canRedo, sidebarOpen, mainToolsOpen, generalToolbarOpen, statusBarOpen, templatePanelOpen, workspaceProfile, activeSidebarPanel });
  }, [activeSidebarPanel, atomCount, canRedo, canUndo, generalToolbarOpen, mainToolsOpen, selectedAtomCount, selectedBondCount, sidebarOpen, statusBarOpen, templatePanelOpen, workspaceProfile]);
}
