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

function App() {
  const [wasmLoaded, setWasmLoaded] = useState(false);
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
  const setStatus = useUIStore((s) => s.setStatus);
  const showModal = useUIStore((s) => s.showModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const showBatchDialog = useUIStore((s) => s.showBatchDialog);
  const addBatchResult = useUIStore((s) => s.addBatchResult);

  // Initialize WASM and hydrate settings
  useEffect(() => {
    const init = async () => {
      await wasmBridge.initWasm();
      setWasmLoaded(true);

      // Hydrate settings from IPC
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const api = (window as any).electronAPI;
        try {
          const savedTheme = await api.loadSettings('theme');
          if (savedTheme.success && savedTheme.value) {
            setTheme(savedTheme.value);
          }
          const savedSidebarWidth = await api.loadSettings('sidebarWidth');
          if (savedSidebarWidth.success && savedSidebarWidth.value) {
            useCanvasStore.setState({ zoom: 1 }); // Reset canvas state
            useUIStore.setState({ sidebarWidth: savedSidebarWidth.value });
          }
        } catch (err) {
          console.error('Failed to hydrate settings:', err);
        }
      }
    };
    init();
  }, []);

  // Load sample molecule on mount
  useEffect(() => {
    if (!wasmLoaded) return;
    // Try to load benzene
    try {
      const result = wasmBridge.parseMolecule('c1ccccc1');
      setMolecule(result);
    } catch (err) {
      console.error('Failed to load sample:', err);
    }
  }, [wasmLoaded]);

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

      api.onMenuZoomIn(() => setZoom(zoom * 1.2));
      api.onMenuZoomOut(() => setZoom(zoom / 1.2));
      api.onMenuZoomReset(() => setZoom(1));
      api.onMenuToggleSidebar(() => setSidebarOpen(!sidebarOpen));
      api.onMenuToggleTheme(() => setTheme(theme === 'dark' ? 'light' : 'dark'));
      api.onMenuBatchProcess?.(() => showModal('batch'));
      api.onMenuUndoTimeline?.(() => showModal('undo'));

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

  const toolButtons: Array<{ tool: Tool; label: string; key: string }> = [
    { tool: Tool.Select, label: 'Select', key: 'ESC' },
    { tool: Tool.Atom_C, label: 'C', key: 'C' },
    { tool: Tool.Atom_N, label: 'N', key: 'N' },
    { tool: Tool.Atom_O, label: 'O', key: 'O' },
    { tool: Tool.Atom_S, label: 'S', key: 'S' },
    { tool: Tool.Atom_P, label: 'P', key: 'P' },
    { tool: Tool.Bond_Single, label: '─', key: '1' },
    { tool: Tool.Bond_Double, label: '═', key: '2' },
    { tool: Tool.Bond_Triple, label: '≡', key: '3' },
    { tool: Tool.Bond_Aromatic, label: '◯', key: '4' },
    { tool: Tool.Eraser, label: '✕', key: 'DEL' },
  ];

  return (
    <div
      data-testid="app-root"
      data-ready={wasmLoaded}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <ContextMenu />
      <ShortcutsModal />
      <UndoTimelineModal />
      {showBatchDialog && <BatchProcessDialog onProcess={handleBatchProcess} onCancel={() => hideModal('batch')} />}
      {/* Top Bar */}
      <div
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

        {!wasmLoaded && (
          <span style={{ color: '#ff6b6b', marginLeft: '12px', fontSize: '12px' }}>⚠️ WASM Loading...</span>
        )}
      </div>

      {/* Canvas Area with Sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <MoleculeCanvas />
        <Sidebar />
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
