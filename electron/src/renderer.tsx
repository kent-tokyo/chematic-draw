import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { MoleculeCanvas } from './renderer/components/canvas/MoleculeCanvas';
import { Sidebar } from './renderer/components/sidebar/Sidebar';
import { ContextMenu } from './renderer/components/menu/ContextMenu';
import { ShortcutsModal } from './renderer/components/modals/ShortcutsModal';
import { SettingsModal } from './renderer/components/modals/SettingsModal';
import { UndoTimelineModal } from './renderer/components/modals/UndoTimeline';
import { BatchProcessDialog } from './renderer/components/modals/BatchProcessDialog';
import { useUIStore } from './renderer/store/uiStore';
import { useMoleculeStore } from './renderer/store/moleculeStore';
import { useCanvasStore } from './renderer/store/canvasStore';
import * as wasmBridge from './renderer/wasm/wasmBridge';
import * as clipboard from './renderer/lib/clipboard';
import { RichCdxmlSession } from './renderer/lib/cdxmlWorkflow';
import { useAppInitialization } from './renderer/hooks/useAppInitialization';
import { useElectronMenuCommands } from './renderer/hooks/useElectronMenuCommands';
import { useElectronMenuCommandContext } from './renderer/hooks/useElectronMenuCommandContext';
import { useWorkspacePreferencesPersistence } from './renderer/hooks/useWorkspacePreferencesPersistence';
import { useBatchProcessing } from './renderer/hooks/useBatchProcessing';
import { useDocumentFileActions } from './renderer/hooks/useDocumentFileActions';
import { useDocumentExportActions } from './renderer/hooks/useDocumentExportActions';
import { getElectronApi } from './renderer/electronApi';
import { alignSelectedAtoms, distributeSelectedAtoms, flipSelectedAtoms, rotateSelectedAtoms } from './renderer/lib/selectionTransforms';
import { BrowserDocumentToolbar } from './renderer/components/BrowserDocumentToolbar';
import { MigrationGuideModal } from './renderer/components/modals/MigrationGuideModal';
import { GeneralToolbar, MainToolsPalette } from './renderer/components/WorkspaceChrome';
import { TemplateDrawer } from './renderer/components/TemplateDrawer';

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
  const isBrowserHost = typeof window !== 'undefined' && Boolean(window.__CHEMATIC_PLAYGROUND__) && !getElectronApi();
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
  const centerOnLoad = useCallback(() => useCanvasStore.getState().requestCenterOnLoad(), []);
  const { openDocument, handleToolbarOpen, handleToolbarSave, handleToolbarSaveAs, handleBrowserMoleculeLoaded } = useDocumentFileActions({
    molecule, filePath, richCdxmlSession, setMolecule, setFilePath, setRichCdxmlSession, setStatus, pushUndo, centerOnLoad,
  });
  const { handleBatchProcess, handleRetryBatch } = useBatchProcessing({
    molecule, setMolecule, pushUndo, setStatus, addBatchResult, hideBatchModal: () => hideModal('batch'),
  });
  const { exportSvg, exportPng, exportPdf, exportMol, exportSmiles, exportSession } = useDocumentExportActions({
    molecule, filePath, setStatus, onExportCancelled: () => announce('Export cancelled', '書き出しをキャンセルしました'),
  });
  useWorkspacePreferencesPersistence({
    settingsHydrated, theme, language, sidebarOpen, sidebarWidth, mainToolsOpen, generalToolbarOpen,
    statusBarOpen, templatePanelOpen, templatePanelWidth, workspaceProfile, activeSidebarPanel, shortcutBindings,
  });

  // Autosave: debounced crash-recovery snapshot, written to a file main.js
  // clears on every clean quit. Its mere presence at next launch is what
  // signals the app didn't exit cleanly — not a "there are unsaved
  // changes" flag, since this app has no dirty-tracking to base one on.
  useEffect(() => {
    const api = getElectronApi();
    if (!api) return;
    const timeout = setTimeout(() => {
      api.autosaveWrite(molecule, filePath);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [molecule, filePath]);


  // Menu event handlers
  useElectronMenuCommands(useCallback((api) => {

      api.onMenuNew(() => {
        clear();
        setFilePath(null);
        setRichCdxmlSession(null);
        announce('New molecule', '新しい分子');
      });

      api.onMenuOpenFile((data: { path: string; content: string }) => { void openDocument(data); });
      api.onMenuSave(() => { void handleToolbarSave(); });
      api.onMenuSaveAs(() => { void handleToolbarSaveAs(); });

      api.onMenuExportSvg(() => { void exportSvg(); });
      api.onMenuExportPng(() => { void exportPng(); });
      api.onMenuExportPdf?.(() => { void exportPdf(); });
      api.onMenuExportMol(() => { void exportMol(); });
      api.onMenuExportSmiles(() => { void exportSmiles(); });
      api.onMenuExportJson?.(() => { void exportSession(); });

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
      api.onMenuMigrationGuide?.(() => showModal('migration'));
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

    return undefined;
  }, [molecule, theme, zoom, sidebarOpen, mainToolsOpen, generalToolbarOpen, statusBarOpen, language, selectAll, undo, redo, pushUndo, clear, setMolecule, setSidebarOpen, setMainToolsOpen, setGeneralToolbarOpen, setStatusBarOpen, setTemplatePanelOpen, setWorkspaceProfile, resetWorkspace, setStatus, setTheme, setZoom, fitView, showModal, announce, applySelectionTransform, openDocument, handleToolbarSave, handleToolbarSaveAs, exportSvg, exportPng, exportPdf, exportMol, exportSmiles, exportSession]));

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
  const primaryModifier = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC') ? 'Cmd' : 'Ctrl';
  const selectedAtomCount = molecule.atoms.filter((atom) => atom.selected).length;
  const selectedBondCount = molecule.bonds.filter((bond) => bond.selected).length;
  useElectronMenuCommandContext({
    atomCount: molecule.atoms.length,
    selectedAtomCount,
    selectedBondCount,
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
    sidebarOpen,
    mainToolsOpen,
    generalToolbarOpen,
    statusBarOpen,
    templatePanelOpen,
    workspaceProfile,
    activeSidebarPanel,
  });


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
      <MigrationGuideModal />
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
        onOpenMigration={() => showModal('migration')}
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
