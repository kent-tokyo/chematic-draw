import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { MoleculeCanvas } from './renderer/components/canvas/MoleculeCanvas';
import { Sidebar } from './renderer/components/sidebar/Sidebar';
import { ContextMenu } from './renderer/components/menu/ContextMenu';
import { ShortcutsModal } from './renderer/components/modals/ShortcutsModal';
import { SettingsModal } from './renderer/components/modals/SettingsModal';
import { UndoTimelineModal } from './renderer/components/modals/UndoTimeline';
import { BatchProcessDialog, BatchConfig } from './renderer/components/modals/BatchProcessDialog';
import { BatchResultSummary, useUIStore } from './renderer/store/uiStore';
import * as batchLib from './renderer/lib/batch';
import { useMoleculeStore } from './renderer/store/moleculeStore';
import { useCanvasStore } from './renderer/store/canvasStore';
import { MoleculeDto } from './renderer/store/types';
import * as wasmBridge from './renderer/wasm/wasmBridge';
import { svgToPngBase64 } from './renderer/lib/svgToPng';
import * as clipboard from './renderer/lib/clipboard';
import { exportLossMessage, exportLosses, formatForFilePath, MoleculeExportFormat } from './renderer/lib/exportLoss';
import { exportCdxml } from './renderer/lib/cdxmlExport';
import { canPreserveCdxml, captureRichCdxmlSession, cdxmlSessionLossWarnings, RichCdxmlSession, serializeCdxmlForPath } from './renderer/lib/cdxmlWorkflow';
import { runAnalysisInWorker } from './renderer/lib/analysisWorkerClient';
import { useAppInitialization } from './renderer/hooks/useAppInitialization';
import { ENGINE_ID } from './engineMetadata';
import { alignSelectedAtoms, distributeSelectedAtoms, flipSelectedAtoms, rotateSelectedAtoms } from './renderer/lib/selectionTransforms';
import { BrowserDocumentToolbar } from './renderer/components/BrowserDocumentToolbar';
import { GeneralToolbar, MainToolsPalette } from './renderer/components/WorkspaceChrome';
import { TemplateDrawer } from './renderer/components/TemplateDrawer';

async function parseMoleculeDocument(content: string, filePath: string): Promise<MoleculeDto> {
  if (filePath.toLowerCase().endsWith('.json')) {
    return await runAnalysisInWorker('parse-session', undefined, undefined, undefined, content) as MoleculeDto;
  }
  return await runAnalysisInWorker('parse', undefined, undefined, undefined, content) as MoleculeDto;
}

async function serializeMoleculeForPath(molecule: MoleculeDto, filePath: string): Promise<string> {
  if (filePath.toLowerCase().endsWith('.json')) {
    return await runAnalysisInWorker('serialize-session', molecule, undefined, undefined, filePath) as string;
  }
  switch (formatForFilePath(filePath)) {
    case 'smiles':
      return await runAnalysisInWorker('canonical-smiles', molecule) as string;
    case 'sdf':
      return await runAnalysisInWorker('sdf', molecule) as string;
    case 'cml':
      return await runAnalysisInWorker('cml', molecule) as string;
    case 'mol-v2000':
      return await runAnalysisInWorker('mol-v2000', molecule) as string;
    case 'cdxml':
      return exportCdxml(molecule);
  }
}

function confirmLossAwareExport(molecule: MoleculeDto, filePath: string, extraWarnings: string[] = []): boolean {
  const format: MoleculeExportFormat = formatForFilePath(filePath);
  const losses = exportLosses(molecule, format);
  if (losses.some((loss) => loss.code === 'unsupported-format')) return false;
  if (extraWarnings.length === 0) return losses.length === 0 || window.confirm(exportLossMessage(filePath, losses));
  const warningText = [
    `Exporting to ${filePath} may lose document information:`,
    ...losses.map((loss) => `• ${loss.message}`),
    ...extraWarnings.map((warning) => `• ${warning}`),
    '',
    'Continue anyway?',
  ].join('\n');
  return window.confirm(warningText);
}

export function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [richCdxmlSession, setRichCdxmlSession] = useState<RichCdxmlSession | null>(null);
  const { wasmStatus, wasmError, wasmLoaded, initialDocumentLoaded, settingsHydrated } = useAppInitialization({ setFilePath });
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const mainToolsOpen = useUIStore((s) => s.mainToolsOpen);
  const setMainToolsOpen = useUIStore((s) => s.setMainToolsOpen);
  const generalToolbarOpen = useUIStore((s) => s.generalToolbarOpen);
  const setGeneralToolbarOpen = useUIStore((s) => s.setGeneralToolbarOpen);
  const statusBarOpen = useUIStore((s) => s.statusBarOpen);
  const setStatusBarOpen = useUIStore((s) => s.setStatusBarOpen);
  const templatePanelOpen = useUIStore((s) => s.templatePanelOpen);
  const templatePanelWidth = useUIStore((s) => s.templatePanelWidth);
  const setTemplatePanelOpen = useUIStore((s) => s.setTemplatePanelOpen);
  const workspaceProfile = useUIStore((s) => s.workspaceProfile);
  const setWorkspaceProfile = useUIStore((s) => s.setWorkspaceProfile);
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const resetWorkspace = useUIStore((s) => s.resetWorkspace);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setTool = useCanvasStore((s) => s.setTool);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const fitView = useCanvasStore((s) => s.fitView);
  const zoom = useCanvasStore((s) => s.zoom);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const clear = useMoleculeStore((s) => s.clear);
  const selectAll = useMoleculeStore((s) => s.selectAll);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);
  const undoCount = useMoleculeStore((s) => s.undoStack.length);
  const redoCount = useMoleculeStore((s) => s.redoStack.length);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const statusMessage = useUIStore((s) => s.statusMessage);
  const setStatus = useUIStore((s) => s.setStatus);
  const announce = useCallback((english: string, japanese: string) => {
    setStatus(language === 'ja' ? japanese : english);
  }, [language, setStatus]);
  const showModal = useUIStore((s) => s.showModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const showBatchDialog = useUIStore((s) => s.showBatchDialog);
  const addBatchResult = useUIStore((s) => s.addBatchResult);
  const shortcutBindings = useUIStore((s) => s.shortcutBindings);
  const isBrowserHost = typeof window !== 'undefined' && Boolean((window as any).__CHEMATIC_PLAYGROUND__) && !(window as any).electronAPI;
  const usesBrowserStorage = typeof window !== 'undefined' && !(window as any).electronAPI;
  const applySelectionTransform = useCallback((kind: 'horizontal' | 'vertical' | 'rotate' | 'distribute-horizontal' | 'distribute-vertical' | 'flip-horizontal' | 'flip-vertical') => {
    const current = useMoleculeStore.getState().molecule;
    const minimum = kind.startsWith('distribute') ? 3 : 2;
    if (current.atoms.filter((atom) => atom.selected).length < minimum) {
      setStatus(language === 'ja' ? `${minimum}個以上の原子を選択してください` : `Select at least ${minimum} atoms.`);
      return;
    }
    pushUndo();
    const next = kind === 'rotate' ? rotateSelectedAtoms(current)
      : kind.startsWith('distribute-') ? distributeSelectedAtoms(current, kind.endsWith('horizontal') ? 'horizontal' : 'vertical')
      : kind.startsWith('flip-') ? flipSelectedAtoms(current, kind.endsWith('horizontal') ? 'horizontal' : 'vertical')
      : alignSelectedAtoms(current, kind === 'horizontal' ? 'horizontal' : 'vertical');
    setMolecule(next);
    setStatus(language === 'ja' ? '選択範囲を配置しました' : 'Arranged selection.');
  }, [language, pushUndo, setMolecule, setStatus]);

  // Autosave: debounced crash-recovery snapshot, written to a file main.js
  // clears on every clean quit. Its mere presence at next launch is what
  // signals the app didn't exit cleanly — not a "there are unsaved
  // changes" flag, since this app has no dirty-tracking to base one on.
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).electronAPI?.autosaveWrite) return;
    const api = (window as any).electronAPI;
    const timeout = setTimeout(() => {
      api.autosaveWrite(molecule, filePath);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [molecule, filePath]);

  // Auto-save settings
  useEffect(() => {
    if (settingsHydrated && typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      const timeout = setTimeout(() => {
        api.saveSettings('theme', theme);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [settingsHydrated, theme]);

  useEffect(() => {
    if (settingsHydrated && typeof window !== 'undefined' && (window as any).electronAPI) {
      const timeout = setTimeout(() => {
        (window as any).electronAPI.saveSettings('language', language);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [language, settingsHydrated]);

  useEffect(() => {
    if (settingsHydrated && typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      const timeout = setTimeout(() => {
        const sidebarState = useUIStore.getState();
        api.saveSettings('sidebarWidth', sidebarState.sidebarOpen ? sidebarState.sidebarWidth : 0);
      }, 500);
      return () => clearTimeout(timeout);
    }
    if (settingsHydrated && typeof window !== 'undefined' && usesBrowserStorage) {
      try {
        window.localStorage.setItem('chematic-draw/sidebar-open-v1', String(sidebarOpen));
        window.localStorage.setItem('chematic-draw/sidebar-width-v1', String(sidebarWidth));
      } catch {
        // Browser storage is optional; the current session remains usable.
      }
    }
  }, [settingsHydrated, sidebarOpen, sidebarWidth, usesBrowserStorage]);

  useEffect(() => {
    if (settingsHydrated && typeof window !== 'undefined' && (window as any).electronAPI) {
      const timeout = setTimeout(() => {
        const api = (window as any).electronAPI;
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
    if (settingsHydrated && typeof window !== 'undefined' && usesBrowserStorage) {
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
    }
  }, [activeSidebarPanel, generalToolbarOpen, mainToolsOpen, settingsHydrated, statusBarOpen, templatePanelOpen, templatePanelWidth, usesBrowserStorage, workspaceProfile]);

  useEffect(() => {
    if (settingsHydrated && typeof window !== 'undefined' && (window as any).electronAPI) {
      const timeout = setTimeout(() => (window as any).electronAPI.saveSettings('shortcutBindings', shortcutBindings), 500);
      return () => clearTimeout(timeout);
    }
  }, [settingsHydrated, shortcutBindings]);

  // Menu event handlers
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      api.clearMenuListeners?.();

      api.onMenuNew(() => {
        clear();
        setFilePath(null);
        setRichCdxmlSession(null);
        announce('New molecule', '新しい分子');
      });

      api.onMenuOpenFile(async (data: { path: string; content: string }) => {
        try {
          const isCdxml = data.path.toLowerCase().endsWith('.cdxml');
          if (isCdxml) wasmBridge.cdxmlDocumentJson(data.content);
          const mol = await parseMoleculeDocument(data.content, data.path);
          setMolecule(mol);
          setFilePath(data.path);
          setRichCdxmlSession(isCdxml
            ? captureRichCdxmlSession(data.content, data.path, mol)
            : null);
          setStatus(`Opened: ${data.path}`);
          api.recordRecentFile(data.path);
          useCanvasStore.getState().requestCenterOnLoad();
        } catch (err) {
          setStatus(`Failed to open file: ${(err as Error).message}`);
        }
      });

      api.onMenuSave(async () => {
        if (filePath) {
          const format = formatForFilePath(filePath);
          const sessionBundle = filePath.toLowerCase().endsWith('.json');
          const preserveRichCdxml = canPreserveCdxml(molecule, filePath, richCdxmlSession);
          if (!sessionBundle && !preserveRichCdxml && !confirmLossAwareExport(molecule, filePath, format === 'cdxml' ? cdxmlSessionLossWarnings(richCdxmlSession) : [])) {
            announce('Save cancelled', '保存をキャンセルしました');
            return;
          }
          const content = !sessionBundle && format === 'cdxml'
            ? serializeCdxmlForPath(molecule, filePath, richCdxmlSession)
            : await serializeMoleculeForPath(molecule, filePath);
          const result = await api.fileWrite(filePath, content);
          if (result.success) {
            announce('Saved', '保存しました');
            if (format === 'cdxml') setRichCdxmlSession(captureRichCdxmlSession(content, filePath, molecule));
          } else {
            setStatus(`Save failed: ${result.error}`);
          }
        } else {
          api.onMenuSaveAs?.();
        }
      });

      api.onMenuSaveAs(async () => {
        const result = await api.fileSaveDialog('untitled.mol');
        if (!result.canceled && result.filePath) {
          const sessionBundle = result.filePath.toLowerCase().endsWith('.json');
          const preserveRichCdxml = canPreserveCdxml(molecule, result.filePath, richCdxmlSession);
          if (!sessionBundle && !preserveRichCdxml && !confirmLossAwareExport(molecule, result.filePath, formatForFilePath(result.filePath) === 'cdxml' ? cdxmlSessionLossWarnings(richCdxmlSession) : [])) {
            announce('Save cancelled', '保存をキャンセルしました');
            return;
          }
          const content = !sessionBundle && formatForFilePath(result.filePath) === 'cdxml'
            ? serializeCdxmlForPath(molecule, result.filePath, richCdxmlSession)
            : await serializeMoleculeForPath(molecule, result.filePath);
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) {
            setFilePath(result.filePath);
            if (formatForFilePath(result.filePath) === 'cdxml') {
              setRichCdxmlSession(captureRichCdxmlSession(content, result.filePath, molecule));
            } else {
              setRichCdxmlSession(null);
            }
            setStatus(`Saved: ${result.filePath}`);
            api.recordRecentFile(result.filePath);
          } else {
            setStatus(`Save failed: ${writeResult.error}`);
          }
        }
      });

      api.onMenuExportSvg(async () => {
        const result = await api.fileSaveDialog('untitled.svg');
        if (!result.canceled && result.filePath) {
          const content = await runAnalysisInWorker('svg', molecule) as string;
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) {
            setStatus(`Exported: ${result.filePath}`);
          } else {
            setStatus(`Export failed: ${writeResult.error}`);
          }
        }
      });

      api.onMenuExportPng(async () => {
        const result = await api.fileSaveDialog('untitled.png');
        if (!result.canceled && result.filePath) {
          try {
            const svg = await runAnalysisInWorker('svg', molecule) as string;
            const base64 = await svgToPngBase64(svg);
            const writeResult = await api.fileWriteBinary(result.filePath, base64);
            if (writeResult.success) {
              setStatus(`Exported: ${result.filePath}`);
            } else {
              setStatus(`Export failed: ${writeResult.error}`);
            }
          } catch (err) {
            setStatus(`Export failed: ${(err as Error).message}`);
          }
        }
      });

      api.onMenuExportPdf?.(async () => {
        const result = await api.fileSaveDialog('untitled.pdf');
        if (!result.canceled && result.filePath) {
          try {
            const svg = await runAnalysisInWorker('svg', molecule) as string;
            const writeResult = await api.exportPdf(result.filePath, svg);
            if (writeResult.success) {
              setStatus(`Exported: ${result.filePath}`);
            } else {
              setStatus(`Export failed: ${writeResult.error}`);
            }
          } catch (err) {
            setStatus(`Export failed: ${(err as Error).message}`);
          }
        }
      });

      api.onMenuExportMol(async () => {
        const result = await api.fileSaveDialog('untitled.mol');
        if (!result.canceled && result.filePath) {
          if (!confirmLossAwareExport(molecule, result.filePath)) {
            announce('Export cancelled', '書き出しをキャンセルしました');
            return;
          }
          const content = await runAnalysisInWorker('mol-v2000', molecule) as string;
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) {
            setStatus(`Exported: ${result.filePath}`);
          } else {
            setStatus(`Export failed: ${writeResult.error}`);
          }
        }
      });

      api.onMenuExportSmiles(async () => {
        const result = await api.fileSaveDialog('untitled.smi');
        if (!result.canceled && result.filePath) {
          if (!confirmLossAwareExport(molecule, result.filePath)) {
            announce('Export cancelled', '書き出しをキャンセルしました');
            return;
          }
          const content = await runAnalysisInWorker('canonical-smiles', molecule) as string;
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) {
            setStatus(`Exported: ${result.filePath}`);
          } else {
            setStatus(`Export failed: ${writeResult.error}`);
          }
        }
      });

      api.onMenuExportJson?.(async () => {
        const result = await api.fileSaveDialog('untitled.schematic.json');
        if (!result.canceled && result.filePath) {
          const content = await runAnalysisInWorker('serialize-session', molecule, undefined, undefined, filePath) as string;
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) setStatus(`Exported session bundle: ${result.filePath}`);
          else setStatus(`Export failed: ${writeResult.error}`);
        }
      });

      api.onMenuZoomIn(() => setZoom(zoom * 1.2));
      api.onMenuZoomOut(() => setZoom(zoom / 1.2));
      api.onMenuZoomReset(() => setZoom(1));
      api.onMenuFitView?.(() => fitView(useMoleculeStore.getState().molecule));
      api.onMenuToggleSidebar(() => setSidebarOpen(!sidebarOpen));
      api.onMenuToggleMainTools?.(() => setMainToolsOpen(!mainToolsOpen));
      api.onMenuToggleGeneralToolbar?.(() => setGeneralToolbarOpen(!generalToolbarOpen));
      api.onMenuToggleStatusBar?.(() => setStatusBarOpen(!statusBarOpen));
      api.onMenuToggleTheme(() => setTheme(theme === 'dark' ? 'light' : 'dark'));
      api.onMenuResetWorkspace?.(() => {
        resetWorkspace();
        setStatus(language === 'ja' ? 'ワークスペースを初期配置に戻しました' : 'Reset workspace layout.');
      });
      api.onMenuSetWorkspaceProfile?.((profile: string) => {
        if (profile === 'chemdraw' || profile === 'compact') setWorkspaceProfile(profile);
      });
      api.onMenuBatchProcess?.(() => showModal('batch'));
      api.onMenuUndoTimeline?.(() => showModal('undo'));
      api.onMenuShortcuts?.(() => showModal('shortcuts'));
      // main.js sends this, preload.js exposes it, but nothing subscribed —
      // same dead-wiring class as the Keyboard Shortcuts menu item earlier
      // this session. Guarded on the focused element the same way
      // useKeyboard.ts's own Ctrl+A handler is, so triggering this from the
      // Edit menu while a text input (e.g. SMARTS search) has focus doesn't
      // hijack it into selecting canvas atoms instead.
      api.onMenuSelectAll?.(() => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          selectAll();
        }
      });

      // main.js's Edit > Undo/Redo used to be Electron's built-in
      // role: 'undo'/'redo' — a real Chromium execCommand that's a no-op
      // on this app's own molecule history (confirmed empirically) and
      // ignores any `click` handler outright whenever `role` is set, so
      // there was no way to route it to the app's real undo()/redo(). Now
      // custom items with no accelerator (see main.js) — Cmd+Z/Cmd+Shift+Z
      // keep working exactly as before via useKeyboard.ts's own keydown
      // listener; this only wires up the menu *click*, which previously
      // silently did nothing. Same isInput guard as onMenuSelectAll above.
      api.onMenuUndo?.(() => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          const changed = undo();
          const current = useMoleculeStore.getState().molecule;
          const summary = `${current.atoms.length} atom${current.atoms.length === 1 ? '' : 's'}, ${current.bonds.length} bond${current.bonds.length === 1 ? '' : 's'}`;
          setStatus(changed
            ? `Undid last edit. ${summary}.`
            : 'Nothing to undo.');
        }
      });
      api.onMenuRedo?.(() => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          const changed = redo();
          const current = useMoleculeStore.getState().molecule;
          const summary = `${current.atoms.length} atom${current.atoms.length === 1 ? '' : 's'}, ${current.bonds.length} bond${current.bonds.length === 1 ? '' : 's'}`;
          setStatus(changed
            ? `Redid last edit. ${summary}.`
            : 'Nothing to redo.');
        }
      });

      api.onMenuCut?.(async () => {
        if ((document.activeElement as HTMLElement | null)?.tagName === 'INPUT') return;
        const current = useMoleculeStore.getState().molecule;
        const selectedAtoms = current.atoms.filter((atom) => atom.selected);
        const selectedBonds = current.bonds.filter((bond) => bond.selected);
        if (selectedAtoms.length === 0 && selectedBonds.length === 0) {
          announce('Nothing selected to cut', '切り取る構造が選択されていません');
          return;
        }
        try {
          await clipboard.copyMoleculeSmiles(current);
          pushUndo();
          selectedAtoms.forEach((atom) => useMoleculeStore.getState().removeAtom(atom.id));
          selectedBonds.forEach((bond) => useMoleculeStore.getState().removeBond(bond.id));
          announce('Cut selected structure', '選択した構造を切り取りました');
        } catch {
          announce('Cut failed', '切り取りに失敗しました');
        }
      });

      // Same fix, same reason, as Undo/Redo above — role: 'copy'/'paste'
      // in main.js were confirmed empirically to be no-ops on this app
      // (webContents.copy()/paste() never touched the molecule or its
      // SMILES on the clipboard), now custom items with no accelerator.
      // Cmd+C/Cmd+V are unaffected, still handled entirely by
      // useKeyboard.ts's own keydown listener; this mirrors that same
      // clipboard.ts logic for the menu *click* path.
      api.onMenuCopy?.(() => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          clipboard.copyMoleculeSmiles(molecule)
            .then(() => announce('Copied SMILES', 'SMILESをコピーしました'))
            .catch(() => announce('Copy failed', 'コピーに失敗しました'));
        }
      });
      api.onMenuPaste?.(async () => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          clipboard.pasteFromClipboard()
            .then((content) => clipboard.parsePastedContent(content))
            .then((mol) => {
              pushUndo();
              setMolecule(mol);
              announce('Pasted structure', '構造を貼り付けました');
            })
            .catch(() => announce('Paste failed: invalid format', '貼り付けに失敗しました：形式が不正です'));
        }
      });

      api.onMenuObjectAlignHorizontal?.(() => applySelectionTransform('horizontal'));
      api.onMenuObjectAlignVertical?.(() => applySelectionTransform('vertical'));
      api.onMenuObjectRotate?.(() => applySelectionTransform('rotate'));
      api.onMenuObjectDistributeHorizontal?.(() => applySelectionTransform('distribute-horizontal'));
      api.onMenuObjectDistributeVertical?.(() => applySelectionTransform('distribute-vertical'));
      api.onMenuObjectFlipHorizontal?.(() => applySelectionTransform('flip-horizontal'));
      api.onMenuObjectFlipVertical?.(() => applySelectionTransform('flip-vertical'));
      api.onMenuStructureClean?.(() => {
        const current = useMoleculeStore.getState().molecule;
        pushUndo();
        setMolecule({ ...wasmBridge.cleanLayout(current), drawing: current.drawing });
        setStatus(language === 'ja' ? '構造を整形しました' : 'Cleaned structure layout.');
      });

      // Phase 6-10 Tools menu handlers
      api.onMenuToolStereoisomers?.(() => {
        useUIStore.getState().setActiveSidebarPanel('stereoisomers');
        setSidebarOpen(true);
      });
      api.onMenuToolLipinski?.(() => {
        useUIStore.getState().setActiveSidebarPanel('lipinski');
        setSidebarOpen(true);
      });
      api.onMenuToolProperties?.(() => {
        useUIStore.getState().setActiveSidebarPanel('properties');
        setSidebarOpen(true);
      });
      api.onMenuToolMechanism?.(() => {
        useUIStore.getState().setActiveSidebarPanel('mechanism');
        setSidebarOpen(true);
      });
      api.onMenuToolDatabase?.(() => {
        useUIStore.getState().setActiveSidebarPanel('database');
        setSidebarOpen(true);
      });
      api.onMenuSearchResearch?.(() => {
        useUIStore.getState().setActiveSidebarPanel('research');
        setSidebarOpen(true);
      });
      api.onMenuShowPanel?.((panel: string) => {
        if (panel === 'templates') {
          setTemplatePanelOpen(true);
          return;
        }
        const allowed = new Set(['inspector', 'query', 'stereo', 'reactions', 'mechanism', '3d', 'nmr', 'batch-results']);
        if (!allowed.has(panel)) return;
        useUIStore.getState().setActiveSidebarPanel(panel as 'inspector' | 'query' | 'stereo' | 'reactions' | 'mechanism' | '3d' | 'nmr' | 'batch-results');
        setSidebarOpen(true);
      });

      return () => {
        // Cleanup: no need to unsubscribe from ipcRenderer in this version
      };
    }
  }, [molecule, filePath, richCdxmlSession, theme, zoom, sidebarOpen, mainToolsOpen, generalToolbarOpen, statusBarOpen, language, selectAll, undo, redo, pushUndo, clear, setMolecule, setSidebarOpen, setMainToolsOpen, setGeneralToolbarOpen, setStatusBarOpen, setTemplatePanelOpen, setWorkspaceProfile, resetWorkspace, setStatus, setTheme, setZoom, fitView, showModal, announce, applySelectionTransform]);

  // Keyboard shortcuts for Phase 3-5
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+Ctrl+Z / Ctrl+Alt+Z: Undo Timeline
      if (cmdKey && (isMac ? e.ctrlKey : e.altKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        showModal('undo');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const handleBatchProcess = async (
    config: BatchConfig,
    options: { signal: AbortSignal; onProgress: (completed: number, total: number) => void }
  ) => {
    try {
      setStatus(`Batch processing: ${config.operation}...`);

      const task: batchLib.BatchTask = {
        operation: config.operation,
        inputFormat: config.inputFormat,
        outputFormat: config.outputFormat,
        filterOptions: config.operation === 'filter' ? {
          minMW: config.filterMinMW,
          maxMW: config.filterMaxMW,
          minLogP: config.filterMinLogP,
          maxLogP: config.filterMaxLogP,
        } : undefined,
        smartsPattern: config.operation === 'filter' ? config.filterSmarts : undefined,
      };

      const result = await batchLib.processBatch([molecule], task, {
        signal: options.signal,
        onProgress: ({ completed, total }) => options.onProgress(completed, total),
      });

      const provenance = {
        engine: ENGINE_ID,
        inputFormat: config.inputFormat,
        outputFormat: config.outputFormat,
        filterOptions: config.operation === 'filter' ? {
          minMW: config.filterMinMW,
          maxMW: config.filterMaxMW,
          minLogP: config.filterMinLogP,
          maxLogP: config.filterMaxLogP,
        } : undefined,
        smartsPattern: config.operation === 'filter' ? config.filterSmarts : undefined,
      };
      addBatchResult(config.operation, result.processed, result.failed, result.skipped, result.resultHash, result.errors, provenance, {
        cancelled: result.cancelled,
        retry: { task, molecules: [molecule] },
        items: result.items.map(({ index, status, warnings, error, input, output }) => ({
          index,
          status: status === 'succeeded' || status === 'failed' || status === 'skipped' || status === 'cancelled'
            ? status
            : 'cancelled',
          warnings,
          error,
          inputAtomCount: input.atoms.length,
          inputBondCount: input.bonds.length,
          outputAtomCount: output?.atoms.length,
          outputBondCount: output?.bonds.length,
          properties: output?.properties && {
            formula: output.properties.formula,
            molecular_weight: output.properties.molecular_weight,
            logp: output.properties.logp,
            tpsa: output.properties.tpsa,
          },
        })),
      });

      if (result.cancelled) {
        setStatus(`Batch processing cancelled: ${result.processed} processed, ${result.failed} failed, ${result.skipped} skipped`);
        return;
      }

      if (result.molecules.length > 0) {
        pushUndo();
        setMolecule(result.molecules[0]);
        setStatus(`Batch processing complete: ${result.processed} processed, ${result.failed} failed, ${result.skipped} skipped`);
      } else {
        setStatus('No molecules matched the filter criteria');
      }

      if (result.errors.length > 0) {
        console.error('Batch processing errors:', result.errors);
      }
    } catch (err) {
      setStatus(`Batch processing failed: ${(err as Error).message}`);
      console.error('Batch error:', err);
      addBatchResult(config.operation, 0, 1, 0, 'fnv1a-32:00000000', [(err as Error).message], {
        engine: ENGINE_ID,
        inputFormat: config.inputFormat,
        outputFormat: config.outputFormat,
      }, {
        cancelled: false,
        items: [{ index: 0, status: 'failed', warnings: [], error: (err as Error).message }],
      });
    }
    hideModal('batch');
  };

  const handleRetryBatch = async (previous: BatchResultSummary) => {
    if (!previous.retry) return;
    setStatus(`Retrying ${previous.failed} failed batch item${previous.failed === 1 ? '' : 's'}...`);
    try {
      const result = await batchLib.retryFailedBatchItems(previous.retry.molecules, previous.retry.task, {
        processed: 0, failed: previous.failed, skipped: previous.skipped, resultHash: previous.resultHash,
        molecules: [], errors: previous.errors, items: previous.items.map((item) => ({
          index: item.index, status: item.status, input: previous.retry!.molecules[item.index], warnings: item.warnings, error: item.error,
        })), cancelled: previous.cancelled ?? false,
      });
      const task = previous.retry.task;
      addBatchResult(task.operation, result.processed, result.failed, result.skipped, result.resultHash, result.errors, previous.provenance, {
        cancelled: result.cancelled,
        retry: previous.retry,
        items: result.items.map(({ index, status, warnings, error, input, output }) => ({
          index,
          status: status === 'succeeded' || status === 'failed' || status === 'skipped' || status === 'cancelled' ? status : 'cancelled',
          warnings, error, inputAtomCount: input.atoms.length, inputBondCount: input.bonds.length,
          outputAtomCount: output?.atoms.length, outputBondCount: output?.bonds.length,
          properties: output?.properties && { formula: output.properties.formula, molecular_weight: output.properties.molecular_weight, logp: output.properties.logp, tpsa: output.properties.tpsa },
        })),
      });
      if (result.molecules.length > 0) {
        pushUndo();
        setMolecule(result.molecules[0]);
      }
      setStatus(`Batch retry complete: ${result.processed} processed, ${result.failed} failed`);
    } catch (err) {
      setStatus(`Batch retry failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const primaryModifier = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC') ? 'Cmd' : 'Ctrl';
  const selectedAtomCount = molecule.atoms.filter((atom) => atom.selected).length;

  const handleBrowserMoleculeLoaded = (loaded: MoleculeDto, sourceName?: string) => {
    pushUndo();
    setMolecule(loaded);
    setFilePath(sourceName ?? null);
    setRichCdxmlSession(null);
    useCanvasStore.getState().requestCenterOnLoad();
  };

  const handleToolbarOpen = async () => {
    const api = (window as any).electronAPI;
    if (!api?.fileOpenDialog) return;
    const result = await api.fileOpenDialog();
    if (result.canceled || !result.path || typeof result.content !== 'string') {
      if (result.error) setStatus(`Failed to open file: ${result.error}`);
      return;
    }
    try {
      if (result.path.toLowerCase().endsWith('.cdxml')) wasmBridge.cdxmlDocumentJson(result.content);
      const loaded = await parseMoleculeDocument(result.content, result.path);
      setMolecule(loaded);
      setFilePath(result.path);
      setRichCdxmlSession(result.path.toLowerCase().endsWith('.cdxml') ? captureRichCdxmlSession(result.content, result.path, loaded) : null);
      api.recordRecentFile(result.path);
      useCanvasStore.getState().requestCenterOnLoad();
      setStatus(`Opened: ${result.path}`);
    } catch (error) {
      setStatus(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleToolbarSave = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    let destination = filePath;
    if (!destination) {
      const result = await api.fileSaveDialog('untitled.mol');
      if (result.canceled || !result.filePath) return;
      destination = result.filePath;
    }
    const sessionBundle = destination.toLowerCase().endsWith('.json');
    const format = formatForFilePath(destination);
    const preserveRichCdxml = canPreserveCdxml(molecule, destination, richCdxmlSession);
    if (!sessionBundle && !preserveRichCdxml && !confirmLossAwareExport(molecule, destination, format === 'cdxml' ? cdxmlSessionLossWarnings(richCdxmlSession) : [])) return;
    const content = !sessionBundle && format === 'cdxml'
      ? serializeCdxmlForPath(molecule, destination, richCdxmlSession)
      : await serializeMoleculeForPath(molecule, destination);
    const result = await api.fileWrite(destination, content);
    if (result.success) {
      setFilePath(destination);
      if (format === 'cdxml') setRichCdxmlSession(captureRichCdxmlSession(content, destination, molecule));
      else setRichCdxmlSession(null);
      api.recordRecentFile(destination);
      setStatus(`Saved: ${destination}`);
    } else setStatus(`Save failed: ${result.error}`);
  };

  const handleCleanStructure = () => {
    if (molecule.atoms.length === 0) return;
    pushUndo();
    setMolecule({ ...wasmBridge.cleanLayout(molecule), drawing: molecule.drawing });
    announce('Cleaned structure layout.', '構造を整形しました');
  };

  return (
    <div
      data-testid="app-root"
      data-ready={wasmLoaded && initialDocumentLoaded}
      data-wasm-status={wasmStatus}
      data-workspace-profile={workspaceProfile}
      className={`app-root workspace-${workspaceProfile}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Screen-reader announcer for useUIStore's statusMessage (save/
          export results, keyboard canvas-editing feedback, etc.) —
          setStatus() was previously called throughout the app but nothing
          ever rendered statusMessage, so none of it reached assistive
          technology. Visually hidden via clip, not display:none/
          visibility:hidden, which would hide it from AT too. */}
      <div
        aria-live="polite"
        role="status"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {statusMessage}
      </div>
      <ContextMenu />
      <ShortcutsModal />
      <UndoTimelineModal />
      <SettingsModal />
      {showBatchDialog && <BatchProcessDialog onProcess={handleBatchProcess} onCancel={() => hideModal('batch')} />}
      {generalToolbarOpen && <GeneralToolbar
        language={language}
        theme={theme}
        sidebarOpen={sidebarOpen}
        mainToolsOpen={mainToolsOpen}
        undoCount={undoCount}
        redoCount={redoCount}
        selectedAtomCount={selectedAtomCount}
        atomCount={molecule.atoms.length}
        bondCount={molecule.bonds.length}
        zoom={zoom}
        primaryModifier={primaryModifier}
        documentActions={isBrowserHost ? (
          <BrowserDocumentToolbar
            molecule={molecule}
            language={language}
            onMoleculeLoaded={handleBrowserMoleculeLoaded}
            onNew={() => { clear(); setFilePath(null); setRichCdxmlSession(null); }}
            onStatus={setStatus}
          />
        ) : undefined}
        onNew={!isBrowserHost ? () => { clear(); setFilePath(null); setRichCdxmlSession(null); announce('New molecule', '新しい分子'); } : undefined}
        onOpen={!isBrowserHost ? () => { void handleToolbarOpen(); } : undefined}
        onSave={!isBrowserHost ? () => { void handleToolbarSave(); } : undefined}
        onClean={handleCleanStructure}
        onZoomIn={() => setZoom(zoom * 1.2)}
        onZoomOut={() => setZoom(zoom / 1.2)}
        onZoomReset={() => setZoom(1)}
        onUndo={() => { if (undo()) announce('Undid last edit', '直前の編集を元に戻しました'); }}
        onRedo={() => { if (redo()) announce('Redid last edit', '編集をやり直しました'); }}
        onAlignHorizontal={() => applySelectionTransform('horizontal')}
        onAlignVertical={() => applySelectionTransform('vertical')}
        onRotate={() => applySelectionTransform('rotate')}
        onFit={() => fitView(molecule)}
        onShowSidebar={() => setSidebarOpen(true)}
        onShowMainTools={() => setMainToolsOpen(true)}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenSettings={() => showModal('settings')}
        onToggleLanguage={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
        onOpenShortcuts={() => showModal('shortcuts')}
      />}

      {/* Canvas Area with Sidebar — not mounted until WASM is actually ready,
          so no individual panel needs to guess whether it's safe to call
          wasmBridge yet. */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {wasmStatus === 'ready' && (
          <>
            {mainToolsOpen && <MainToolsPalette activeTool={activeTool} language={language} onSelectTool={setTool} onOpenTemplates={() => setTemplatePanelOpen(true)} />}
            <TemplateDrawer />
            <MoleculeCanvas />
            <Sidebar onRetryBatch={handleRetryBatch} />
          </>
        )}
        {(wasmStatus === 'idle' || wasmStatus === 'loading') && (
          <div
            data-testid="wasm-loading"
            role="status"
            aria-live="polite"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              opacity: 0.7,
            }}
          >
            {language === 'ja' ? '化学エンジンを読み込み中…' : 'Loading chemistry engine…'}
          </div>
        )}
        {wasmStatus === 'failed' && (
          <div
            data-testid="wasm-failed"
            role="alert"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff6b6b' }}>
              {language === 'ja' ? '化学エンジンの読み込みに失敗しました' : 'Failed to load the chemistry engine'}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, maxWidth: '480px' }}>
              {wasmError ?? 'Unknown error.'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>
              {language === 'ja'
                ? 'アプリを再起動してください。解決しない場合はIssueを報告してください。'
                : 'Try restarting the app. If this keeps happening, please file an issue.'}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {statusBarOpen && <div
        className="app-status-bar"
        role="group"
        aria-label={language === 'ja' ? '描画ステータスとショートカット' : 'Drawing status and shortcuts'}
        aria-live="polite"
        style={{
          height: '22px',
          padding: '4px 12px',
          borderTop: `1px solid ${theme === 'dark' ? '#3a3a3a' : '#e0e0e0'}`,
          backgroundColor: theme === 'dark' ? '#252525' : '#f5f5f5',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7,
          gap: '16px',
        }}
      >
        <span>{language === 'ja' ? 'ツール' : 'Tool'}: {activeTool.replace('_', ' ')}</span>
        <span>{language === 'ja' ? 'ズーム' : 'Zoom'}: {(zoom * 100).toFixed(0)}%</span>
        <span style={{ marginLeft: 'auto' }}>
          {primaryModifier}+Z: {language === 'ja' ? '元に戻す' : 'Undo'} • {primaryModifier}+Shift+Z: {language === 'ja' ? 'やり直す' : 'Redo'} • +/−: {language === 'ja' ? 'ズーム' : 'Zoom'} • Del: {language === 'ja' ? '削除' : 'Delete'}
        </span>
      </div>}
    </div>
  );
}

export function mountApp(rootElement: HTMLElement | null = document.getElementById('root')): void {
  if (!rootElement) throw new Error('Chematic Draw mount element was not found');
  ReactDOM.createRoot(rootElement).render(<App />);
}
