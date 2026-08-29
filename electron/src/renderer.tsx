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
import { Tool } from './renderer/store/types';
import * as wasmBridge from './renderer/wasm/wasmBridge';
import { svgToPngBase64 } from './renderer/lib/svgToPng';

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
  const statusMessage = useUIStore((s) => s.statusMessage);
  const setStatus = useUIStore((s) => s.setStatus);
  const showModal = useUIStore((s) => s.showModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const showBatchDialog = useUIStore((s) => s.showBatchDialog);
  const addBatchResult = useUIStore((s) => s.addBatchResult);

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

  // Menu event handlers
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;

      api.onMenuNew(() => {
        clear();
        setFilePath(null);
        setStatus('New molecule');
      });

      api.onMenuOpenFile((data: { path: string; content: string }) => {
        try {
          const mol = wasmBridge.parseMolecule(data.content);
          setMolecule(mol);
          setFilePath(data.path);
          setStatus(`Opened: ${data.path}`);
          api.recordRecentFile(data.path);
        } catch (err) {
          setStatus(`Failed to open file: ${(err as Error).message}`);
        }
      });

      api.onMenuSave(async () => {
        if (filePath) {
          const content = wasmBridge.toMolV2000(molecule);
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
          const content = wasmBridge.toMolV2000(molecule);
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
          const content = wasmBridge.toCanonicalSmiles(molecule);
          const writeResult = await api.fileWrite(result.filePath, content);
          if (writeResult.success) {
            setStatus(`Exported: ${result.filePath}`);
          } else {
            setStatus(`Export failed: ${writeResult.error}`);
          }
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
  }, [molecule, filePath, theme, zoom, sidebarOpen]);

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

  const handleBatchProcess = async (config: BatchConfig) => {
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

      const result = await batchLib.processBatch([molecule], task);

      addBatchResult(config.operation, result.processed, result.failed, result.errors);

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
      addBatchResult(config.operation, 0, 1, [(err as Error).message]);
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

        <div style={{ fontSize: '12px', opacity: 0.7, marginLeft: '12px', whiteSpace: 'nowrap' }}>
          {molecule.atoms.length}a • {molecule.bonds.length}b • {zoom.toFixed(0)}%
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
