import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { MoleculeCanvas } from './renderer/components/canvas/MoleculeCanvas';
import { Sidebar } from './renderer/components/sidebar/Sidebar';
import { ContextMenu } from './renderer/components/menu/ContextMenu';
import { ShortcutsModal } from './renderer/components/modals/ShortcutsModal';
import { UndoTimelineModal } from './renderer/components/modals/UndoTimeline';
import { BatchProcessDialog, BatchConfig } from './renderer/components/modals/BatchProcessDialog';
import { useUIStore } from './renderer/store/uiStore';
import * as batchLib from './renderer/lib/batch';
import { useMoleculeStore } from './renderer/store/moleculeStore';
import { useCanvasStore } from './renderer/store/canvasStore';
import { MoleculeDto, Tool } from './renderer/store/types';
import * as wasmBridge from './renderer/wasm/wasmBridge';
import { svgToPngBase64 } from './renderer/lib/svgToPng';
import * as clipboard from './renderer/lib/clipboard';
import { exportLossMessage, exportLosses, formatForFilePath, MoleculeExportFormat } from './renderer/lib/exportLoss';
import { parseSessionBundle, serializeSessionBundle } from './renderer/lib/sessionBundle';
import { DEFAULT_SHORTCUT_BINDINGS, validateShortcutBindings, ShortcutBindings } from './renderer/lib/shortcuts';

function parseMoleculeDocument(content: string, filePath: string): MoleculeDto {
  if (filePath.toLowerCase().endsWith('.json')) return parseSessionBundle(content).molecule;
  return wasmBridge.parseMolecule(content);
}

function serializeMoleculeForPath(molecule: MoleculeDto, filePath: string): string {
  switch (formatForFilePath(filePath)) {
    case 'smiles':
      return wasmBridge.toCanonicalSmiles(molecule);
    case 'sdf':
      return wasmBridge.toSdf(molecule);
    case 'cml':
      return wasmBridge.toCml(molecule);
    case 'mol-v2000':
      return wasmBridge.toMolV2000(molecule);
    case 'cdxml':
      throw new Error('CDXML is read-only; choose a different file extension.');
  }
}

function confirmLossAwareExport(molecule: MoleculeDto, filePath: string): boolean {
  const format: MoleculeExportFormat = formatForFilePath(filePath);
  const losses = exportLosses(molecule, format);
  if (losses.some((loss) => loss.code === 'unsupported-format')) return false;
  return losses.length === 0 || window.confirm(exportLossMessage(filePath, losses));
}

function App() {
  const [wasmStatus, setWasmStatus] = useState<wasmBridge.WasmStatus>('idle');
  const [wasmError, setWasmError] = useState<string | null>(null);
  const wasmLoaded = wasmStatus === 'ready';
  const [filePath, setFilePath] = useState<string | null>(null);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setTool = useCanvasStore((s) => s.setTool);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const zoom = useCanvasStore((s) => s.zoom);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const clear = useMoleculeStore((s) => s.clear);
  const selectAll = useMoleculeStore((s) => s.selectAll);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const statusMessage = useUIStore((s) => s.statusMessage);
  const setStatus = useUIStore((s) => s.setStatus);
  const showModal = useUIStore((s) => s.showModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const showBatchDialog = useUIStore((s) => s.showBatchDialog);
  const addBatchResult = useUIStore((s) => s.addBatchResult);
  const shortcutBindings = useUIStore((s) => s.shortcutBindings);

  // Initialize WASM and hydrate settings. This is the app's startup
  // boundary: WASM-dependent UI (MoleculeCanvas/Sidebar, below) isn't
  // mounted until wasmStatus reaches 'ready', so no individual panel needs
  // to guard its own WASM calls against "not loaded yet" — this replaces
  // per-panel try/catch guessing with one real precondition.
  useEffect(() => {
    setWasmStatus('loading');
    const init = async () => {
      try {
        await wasmBridge.initWasm();
      } catch (err) {
        setWasmStatus('failed');
        setWasmError(err instanceof Error ? err.message : String(err));
        return;
      }
      setWasmStatus('ready');

      // Hydrate settings from IPC
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const api = (window as any).electronAPI;
        try {
          const savedTheme = await api.loadSettings('theme');
          if (savedTheme.success && savedTheme.value) {
            setTheme(savedTheme.value);
          }
          // sidebarOpen is persisted encoded into this same key (0 = closed,
          // see the sidebarOpen save effect below) rather than as its own
          // setting, so a saved 0 must restore the closed state — a truthy
          // check on `value` would treat 0 as "nothing saved" and silently
          // reopen the sidebar on every relaunch.
          const savedSidebarWidth = await api.loadSettings('sidebarWidth');
          if (savedSidebarWidth.success && typeof savedSidebarWidth.value === 'number') {
            if (savedSidebarWidth.value === 0) {
              useUIStore.setState({ sidebarOpen: false });
            } else {
              useUIStore.getState().setSidebarWidth(savedSidebarWidth.value);
              useUIStore.setState({ sidebarOpen: true });
            }
          }
          const savedShortcuts = await api.loadSettings('shortcutBindings');
          if (savedShortcuts.success && savedShortcuts.value && typeof savedShortcuts.value === 'object') {
            const candidate = { ...DEFAULT_SHORTCUT_BINDINGS, ...(savedShortcuts.value as Partial<ShortcutBindings>) };
            if (!validateShortcutBindings(candidate)) useUIStore.getState().setShortcutBindings(candidate);
          }
        } catch (err) {
          console.error('Failed to hydrate settings:', err);
        }
      }
    };
    init();
  }, []);

  // Load sample molecule on mount — unless main.js is holding a crash-
  // recovery snapshot the user just confirmed restoring, in which case that
  // takes priority. Checked here (rather than main.js pushing it) because
  // this is the first point setMolecule is actually safe to call.
  useEffect(() => {
    if (!wasmLoaded) return;
    (async () => {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getPendingRecovery) {
        try {
          const snapshot = await (window as any).electronAPI.getPendingRecovery();
          if (snapshot) {
            setMolecule(snapshot.molecule);
            setFilePath(snapshot.filePath ?? null);
            setStatus('Restored last session');
            useCanvasStore.getState().requestCenterOnLoad();
            return;
          }
        } catch (err) {
          console.error('Failed to check for a recoverable session:', err);
        }
      }
      // Try to load benzene
      try {
        const result = wasmBridge.parseMolecule('c1ccccc1');
        setMolecule(result);
        useCanvasStore.getState().requestCenterOnLoad();
      } catch (err) {
        console.error('Failed to load sample:', err);
      }
    })();
  }, [wasmLoaded]);

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
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      const timeout = setTimeout(() => {
        api.saveSettings('theme', theme);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      const timeout = setTimeout(() => {
        const sidebarState = useUIStore.getState();
        api.saveSettings('sidebarWidth', sidebarState.sidebarOpen ? sidebarState.sidebarWidth : 0);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const timeout = setTimeout(() => (window as any).electronAPI.saveSettings('shortcutBindings', shortcutBindings), 500);
      return () => clearTimeout(timeout);
    }
  }, [shortcutBindings]);

  // Menu event handlers
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      api.clearMenuListeners?.();

      api.onMenuNew(() => {
        clear();
        setFilePath(null);
        setStatus('New molecule');
      });

      api.onMenuOpenFile((data: { path: string; content: string }) => {
        try {
          const mol = parseMoleculeDocument(data.content, data.path);
          setMolecule(mol);
          setFilePath(data.path);
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
          if (format === 'cdxml') {
            setStatus('CDXML is read-only. Use Save As and choose MOL, SDF, CML, or SMILES.');
            return;
          }
          if (!confirmLossAwareExport(molecule, filePath)) {
            if (exportLosses(molecule, format).length > 0) setStatus('Save cancelled');
            return;
          }
          const content = serializeMoleculeForPath(molecule, filePath);
          const result = await api.fileWrite(filePath, content);
          if (result.success) {
            setStatus('Saved');
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
          if (!confirmLossAwareExport(molecule, result.filePath)) {
            const format = formatForFilePath(result.filePath);
            setStatus(format === 'cdxml' ? 'CDXML is read-only. Choose a different format.' : 'Save cancelled');
            return;
          }
          const content = serializeMoleculeForPath(molecule, result.filePath);
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) {
            setFilePath(result.filePath);
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
          const content = wasmBridge.toSvg(molecule);
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
            const svg = wasmBridge.toSvg(molecule);
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
            const svg = wasmBridge.toSvg(molecule);
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
            setStatus('Export cancelled');
            return;
          }
          const content = wasmBridge.toMolV2000(molecule);
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
            setStatus('Export cancelled');
            return;
          }
          const content = wasmBridge.toCanonicalSmiles(molecule);
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
          const content = serializeSessionBundle(molecule, filePath);
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) setStatus(`Exported session bundle: ${result.filePath}`);
          else setStatus(`Export failed: ${writeResult.error}`);
        }
      });

      api.onMenuZoomIn(() => setZoom(zoom * 1.2));
      api.onMenuZoomOut(() => setZoom(zoom / 1.2));
      api.onMenuZoomReset(() => setZoom(1));
      api.onMenuToggleSidebar(() => setSidebarOpen(!sidebarOpen));
      api.onMenuToggleTheme(() => setTheme(theme === 'dark' ? 'light' : 'dark'));
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
          undo();
        }
      });
      api.onMenuRedo?.(() => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          redo();
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
            .then(() => setStatus('Copied SMILES'))
            .catch(() => setStatus('Copy failed'));
        }
      });
      api.onMenuPaste?.(() => {
        if ((document.activeElement as HTMLElement | null)?.tagName !== 'INPUT') {
          clipboard.pasteFromClipboard()
            .then((content) => {
              const mol = wasmBridge.parseMolecule(content);
              pushUndo();
              setMolecule(mol);
              setStatus('Pasted structure');
            })
            .catch(() => setStatus('Paste failed: invalid format'));
        }
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

      return () => {
        // Cleanup: no need to unsubscribe from ipcRenderer in this version
      };
    }
  }, [molecule, filePath, theme, zoom, sidebarOpen, selectAll, undo, redo, pushUndo]);

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
        } : undefined,
      };

      const result = await batchLib.processBatch([molecule], task, {
        signal: options.signal,
        onProgress: ({ completed, total }) => options.onProgress(completed, total),
      });

      addBatchResult(config.operation, result.processed, result.failed, result.errors, {
        cancelled: result.cancelled,
        items: result.items.map(({ index, status, warnings, error }) => ({
          index,
          status: status === 'succeeded' || status === 'failed' || status === 'skipped' || status === 'cancelled'
            ? status
            : 'cancelled',
          warnings,
          error,
        })),
      });

      if (result.cancelled) {
        setStatus(`Batch processing cancelled: ${result.processed} processed, ${result.failed} failed`);
        return;
      }

      if (result.molecules.length > 0) {
        setMolecule(result.molecules[0]);
        setStatus(`Batch processing complete: ${result.processed} processed, ${result.failed} failed`);
      } else {
        setStatus('No molecules matched the filter criteria');
      }

      if (result.errors.length > 0) {
        console.error('Batch processing errors:', result.errors);
      }
    } catch (err) {
      setStatus(`Batch processing failed: ${(err as Error).message}`);
      console.error('Batch error:', err);
      addBatchResult(config.operation, 0, 1, [(err as Error).message], {
        cancelled: false,
        items: [{ index: 0, status: 'failed', warnings: [], error: (err as Error).message }],
      });
    }
    hideModal('batch');
  };

  const toolButtons: Array<{ tool: Tool; label: string; key: string; ariaLabel: string }> = [
    { tool: Tool.Select, label: 'Select', key: 'ESC', ariaLabel: 'Select tool' },
    { tool: Tool.Atom_C, label: 'C', key: 'C', ariaLabel: 'Carbon atom' },
    { tool: Tool.Atom_N, label: 'N', key: 'N', ariaLabel: 'Nitrogen atom' },
    { tool: Tool.Atom_O, label: 'O', key: 'O', ariaLabel: 'Oxygen atom' },
    { tool: Tool.Atom_S, label: 'S', key: 'S', ariaLabel: 'Sulfur atom' },
    { tool: Tool.Atom_P, label: 'P', key: 'P', ariaLabel: 'Phosphorus atom' },
    { tool: Tool.Bond_Single, label: '─', key: '1', ariaLabel: 'Single bond' },
    { tool: Tool.Bond_Double, label: '═', key: '2', ariaLabel: 'Double bond' },
    { tool: Tool.Bond_Triple, label: '≡', key: '3', ariaLabel: 'Triple bond' },
    { tool: Tool.Bond_Aromatic, label: '◯', key: '4', ariaLabel: 'Aromatic bond' },
    { tool: Tool.Eraser, label: '✕', key: 'DEL', ariaLabel: 'Eraser' },
  ];

  return (
    <div
      data-testid="app-root"
      data-ready={wasmLoaded}
      data-wasm-status={wasmStatus}
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
      {showBatchDialog && <BatchProcessDialog onProcess={handleBatchProcess} onCancel={() => hideModal('batch')} />}
      {/* Top Bar */}
      <div
        role="toolbar"
        aria-label="Drawing tools"
        style={{
          display: 'flex',
          gap: '4px',
          padding: '12px',
          borderBottom: `1px solid ${theme === 'dark' ? '#3a3a3a' : '#e0e0e0'}`,
          backgroundColor: theme === 'dark' ? '#252525' : '#f5f5f5',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {toolButtons.map((btn) => (
          <button
            key={btn.tool}
            onClick={() => setTool(btn.tool)}
            title={`${btn.label} [${btn.key}]`}
            aria-label={btn.ariaLabel}
            aria-pressed={activeTool === btn.tool}
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              backgroundColor: activeTool === btn.tool ? '#4d8dff' : 'transparent',
              color: 'inherit',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              minWidth: '32px',
            }}
          >
            {btn.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: 'inherit',
            border: `1px solid ${theme === 'dark' ? '#555555' : '#cccccc'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
          title="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <div data-testid="toolbar-summary" style={{ fontSize: '12px', opacity: 0.7, marginLeft: '12px', whiteSpace: 'nowrap' }}>
          {molecule.atoms.length}a • {molecule.bonds.length}b • {(zoom * 100).toFixed(0)}%
        </div>

        {wasmStatus === 'loading' && (
          <span style={{ color: '#ff6b6b', marginLeft: '12px', fontSize: '12px' }}>⚠️ WASM Loading...</span>
        )}
        {wasmStatus === 'failed' && (
          <span style={{ color: '#ff6b6b', marginLeft: '12px', fontSize: '12px' }}>✕ WASM failed to load</span>
        )}
      </div>

      {/* Canvas Area with Sidebar — not mounted until WASM is actually ready,
          so no individual panel needs to guess whether it's safe to call
          wasmBridge yet. */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {wasmStatus === 'ready' && (
          <>
            <MoleculeCanvas />
            <Sidebar />
          </>
        )}
        {(wasmStatus === 'idle' || wasmStatus === 'loading') && (
          <div
            data-testid="wasm-loading"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              opacity: 0.7,
            }}
          >
            Loading chemistry engine…
          </div>
        )}
        {wasmStatus === 'failed' && (
          <div
            data-testid="wasm-failed"
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
              Failed to load the chemistry engine
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, maxWidth: '480px' }}>
              {wasmError ?? 'Unknown error.'}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>
              Try restarting the app. If this keeps happening, please file an issue.
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
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
        <span>Tool: {activeTool.replace('_', ' ')}</span>
        <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
        <span style={{ marginLeft: 'auto' }}>
          Ctrl+Z: Undo • Ctrl+Shift+Z: Redo • +/−: Zoom • Del: Delete
        </span>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
