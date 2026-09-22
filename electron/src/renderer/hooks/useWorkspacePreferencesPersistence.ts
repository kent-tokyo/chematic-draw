import { useEffect } from 'react';
import { ShortcutBindings } from '../lib/shortcuts';
import { AppLanguage, SidebarPanel, useUIStore, WorkspaceProfile } from '../store/uiStore';
import { getElectronApi } from '../electronApi';

interface WorkspacePreferences {
  settingsHydrated: boolean;
  theme: 'dark' | 'light';
  language: AppLanguage;
  sidebarOpen: boolean;
  sidebarWidth: number;
  mainToolsOpen: boolean;
  generalToolbarOpen: boolean;
  statusBarOpen: boolean;
  templatePanelOpen: boolean;
  templatePanelWidth: number;
  workspaceProfile: WorkspaceProfile;
  activeSidebarPanel: SidebarPanel;
  shortcutBindings: ShortcutBindings;
}

/** Persist workspace preferences after initialization in Electron or browser hosts. */
export function useWorkspacePreferencesPersistence(preferences: WorkspacePreferences) {
  const { settingsHydrated, theme, language, sidebarOpen, sidebarWidth, mainToolsOpen, generalToolbarOpen, statusBarOpen, templatePanelOpen, templatePanelWidth, workspaceProfile, activeSidebarPanel, shortcutBindings } = preferences;

  useEffect(() => {
    const api = getElectronApi();
    if (!settingsHydrated || !api) return;
    const timeout = setTimeout(() => api.saveSettings('theme', theme), 500);
    return () => clearTimeout(timeout);
  }, [settingsHydrated, theme]);

  useEffect(() => {
    const api = getElectronApi();
    if (!settingsHydrated || !api) return;
    const timeout = setTimeout(() => api.saveSettings('language', language), 500);
    return () => clearTimeout(timeout);
  }, [language, settingsHydrated]);

  useEffect(() => {
    const api = getElectronApi();
    if (!settingsHydrated) return;
    if (api) {
      const timeout = setTimeout(() => {
        const state = useUIStore.getState();
        api.saveSettings('sidebarWidth', state.sidebarOpen ? state.sidebarWidth : 0);
      }, 500);
      return () => clearTimeout(timeout);
    }
    try {
      window.localStorage.setItem('chematic-draw/sidebar-open-v1', String(sidebarOpen));
      window.localStorage.setItem('chematic-draw/sidebar-width-v1', String(sidebarWidth));
    } catch {
      // Browser storage is optional; the current session remains usable.
    }
  }, [settingsHydrated, sidebarOpen, sidebarWidth]);

  useEffect(() => {
    const api = getElectronApi();
    if (!settingsHydrated) return;
    if (api) {
      const timeout = setTimeout(() => {
        api.saveSettings('mainToolsOpen', mainToolsOpen);
        api.saveSettings('generalToolbarOpen', generalToolbarOpen);
        api.saveSettings('statusBarOpen', statusBarOpen);
        api.saveSettings('templatePanelOpen', templatePanelOpen);
        api.saveSettings('templatePanelWidth', templatePanelWidth);
        api.saveSettings('workspaceProfile', workspaceProfile);
        api.saveSettings('activeSidebarPanel', activeSidebarPanel);
      }, 500);
      return () => clearTimeout(timeout);
    }
    try {
      window.localStorage.setItem('chematic-draw/main-tools-open-v1', String(mainToolsOpen));
      window.localStorage.setItem('chematic-draw/general-toolbar-open-v1', String(generalToolbarOpen));
      window.localStorage.setItem('chematic-draw/status-bar-open-v1', String(statusBarOpen));
      window.localStorage.setItem('chematic-draw/template-panel-open-v1', String(templatePanelOpen));
      window.localStorage.setItem('chematic-draw/template-panel-width-v1', String(templatePanelWidth));
      window.localStorage.setItem('chematic-draw/workspace-profile-v1', workspaceProfile);
      window.localStorage.setItem('chematic-draw/active-sidebar-panel-v1', activeSidebarPanel);
    } catch {
      // Browser storage is optional; the current session remains usable.
    }
  }, [activeSidebarPanel, generalToolbarOpen, mainToolsOpen, settingsHydrated, statusBarOpen, templatePanelOpen, templatePanelWidth, workspaceProfile]);

  useEffect(() => {
    const api = getElectronApi();
    if (!settingsHydrated || !api) return;
    const timeout = setTimeout(() => api.saveSettings('shortcutBindings', shortcutBindings), 500);
    return () => clearTimeout(timeout);
  }, [settingsHydrated, shortcutBindings]);
}
