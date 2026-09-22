import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useUIStore, type SidebarPanel } from '../store/uiStore';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';
import type { MoleculeDto } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';
import { DEFAULT_SHORTCUT_BINDINGS, validateShortcutBindings, type ShortcutBindings } from '../lib/shortcuts';
import { runAnalysisInWorker } from '../lib/analysisWorkerClient';

interface UseAppInitializationOptions {
  setFilePath: Dispatch<SetStateAction<string | null>>;
}

/** Owns the one-time WASM, settings, and initial-document startup sequence. */
export function useAppInitialization({ setFilePath }: UseAppInitializationOptions) {
  const [wasmStatus, setWasmStatus] = useState<wasmBridge.WasmStatus>('loading');
  const [wasmError, setWasmError] = useState<string | null>(null);
  const [initialDocumentLoaded, setInitialDocumentLoaded] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const setMolecule = useMoleculeStore((state) => state.setMolecule);
  const setTheme = useUIStore((state) => state.setTheme);
  const setLanguage = useUIStore((state) => state.setLanguage);

  useEffect(() => {
    const init = async () => {
      try {
        await wasmBridge.initWasm();
      } catch (error) {
        setWasmStatus('failed');
        setWasmError(error instanceof Error ? error.message : String(error));
        return;
      }
      setWasmStatus('ready');

      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const api = (window as any).electronAPI;
        try {
          const savedTheme = await api.loadSettings('theme');
          if (savedTheme.success && savedTheme.value) setTheme(savedTheme.value);
          const savedLanguage = await api.loadSettings('language');
          if (savedLanguage.success && ['en', 'ja', 'zh'].includes(savedLanguage.value)) setLanguage(savedLanguage.value);
          const savedSidebarWidth = await api.loadSettings('sidebarWidth');
          if (savedSidebarWidth.success && typeof savedSidebarWidth.value === 'number') {
            if (savedSidebarWidth.value === 0) useUIStore.setState({ sidebarOpen: false });
            else {
              useUIStore.getState().setSidebarWidth(savedSidebarWidth.value);
              useUIStore.setState({ sidebarOpen: true });
            }
          }
          const savedMainToolsOpen = await api.loadSettings('mainToolsOpen');
          if (savedMainToolsOpen.success && typeof savedMainToolsOpen.value === 'boolean') {
            useUIStore.getState().setMainToolsOpen(savedMainToolsOpen.value);
          }
          const savedWorkspaceProfile = await api.loadSettings('workspaceProfile');
          if (savedWorkspaceProfile.success && (savedWorkspaceProfile.value === 'chemdraw' || savedWorkspaceProfile.value === 'compact')) {
            useUIStore.setState({ workspaceProfile: savedWorkspaceProfile.value });
          }
          const savedActivePanel = await api.loadSettings('activeSidebarPanel');
          if (savedActivePanel.success && typeof savedActivePanel.value === 'string') {
            useUIStore.getState().setActiveSidebarPanel(savedActivePanel.value as SidebarPanel);
          }
          const savedShortcuts = await api.loadSettings('shortcutBindings');
          if (savedShortcuts.success && savedShortcuts.value && typeof savedShortcuts.value === 'object') {
            const candidate = { ...DEFAULT_SHORTCUT_BINDINGS, ...(savedShortcuts.value as Partial<ShortcutBindings>) };
            if (!validateShortcutBindings(candidate)) useUIStore.getState().setShortcutBindings(candidate);
          }
        } catch (error) {
          console.error('Failed to hydrate settings:', error);
        } finally {
          setSettingsHydrated(true);
        }
      } else {
        try {
          const savedProfile = window.localStorage.getItem('chematic-draw/workspace-profile-v1');
          if (savedProfile === 'chemdraw' || savedProfile === 'compact') {
            useUIStore.setState({ workspaceProfile: savedProfile });
          }
          const savedMainTools = window.localStorage.getItem('chematic-draw/main-tools-open-v1');
          if (savedMainTools === 'true' || savedMainTools === 'false') {
            useUIStore.getState().setMainToolsOpen(savedMainTools === 'true');
          }
          const savedPanel = window.localStorage.getItem('chematic-draw/active-sidebar-panel-v1');
          const allowedPanels = new Set(['inspector', 'templates', 'chat', 'research', 'reactions', 'batch-results', 'stereoisomers', 'lipinski', 'properties', 'mechanism', 'database', '3d', 'nmr']);
          if (savedPanel && allowedPanels.has(savedPanel)) useUIStore.getState().setActiveSidebarPanel(savedPanel as SidebarPanel);
        } catch {
          // Storage can be unavailable in private/embedded browser contexts;
          // the validated in-memory defaults remain usable.
        }
        setSettingsHydrated(true);
      }
    };
    void init();
  }, [setTheme, setLanguage]);

  useEffect(() => {
    if (wasmStatus !== 'ready') return;
    (async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getPendingRecovery) {
          try {
            const snapshot = await (window as any).electronAPI.getPendingRecovery();
            if (snapshot) {
              setMolecule(snapshot.molecule);
              setFilePath(snapshot.filePath ?? null);
              const language = useUIStore.getState().language;
              useUIStore.getState().setStatus(language === 'ja' ? '前回のセッションを復元しました' : 'Restored last session');
              useCanvasStore.getState().requestCenterOnLoad();
              return;
            }
          } catch (error) {
            console.error('Failed to check for a recoverable session:', error);
          }
        }
        const result = await runAnalysisInWorker('parse', undefined, undefined, undefined, 'c1ccccc1') as MoleculeDto;
        setMolecule(result);
        useCanvasStore.getState().requestCenterOnLoad();
      } catch (error) {
        console.error('Failed to load sample:', error);
      } finally {
        setInitialDocumentLoaded(true);
      }
    })();
  }, [wasmStatus, setFilePath, setMolecule]);

  return {
    wasmStatus,
    wasmError,
    wasmLoaded: wasmStatus === 'ready',
    initialDocumentLoaded,
    settingsHydrated,
  };
}
