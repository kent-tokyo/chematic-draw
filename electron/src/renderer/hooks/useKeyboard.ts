import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useMoleculeStore } from '../store/moleculeStore';
import { useUIStore } from '../store/uiStore';
import { Tool } from '../store/types';
import * as clipboard from '../lib/clipboard';
import * as wasmBridge from '../wasm/wasmBridge';

export function useKeyboard() {
  const setTool = useCanvasStore((s) => s.setTool);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const zoom = useCanvasStore((s) => s.zoom);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const removeAtom = useMoleculeStore((s) => s.removeAtom);
  const removeBond = useMoleculeStore((s) => s.removeBond);
  const selectAll = useMoleculeStore((s) => s.selectAll);
  const deselectAll = useMoleculeStore((s) => s.deselectAll);
  const getSelectedAtoms = useMoleculeStore((s) => s.getSelectedAtoms);
  const getSelectedBonds = useMoleculeStore((s) => s.getSelectedBonds);
  const setFocusMode = useUIStore((s) => s.setFocusMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const showModal = useUIStore((s) => s.showModal);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const setStatus = useUIStore((s) => s.setStatus);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow copy/paste in inputs
      const isInput = (e.target as any).tagName === 'INPUT';
      const ctrl = e.ctrlKey || e.metaKey;

      // Copy (Ctrl+C / Cmd+C)
      if (ctrl && e.key === 'c') {
        if (!isInput) {
          e.preventDefault();
          clipboard.copyMoleculeSmiles(molecule)
            .then(() => setStatus('Copied SMILES'))
            .catch(() => setStatus('Copy failed'));
        }
        return;
      }

      // Paste (Ctrl+V / Cmd+V)
      if (ctrl && e.key === 'v') {
        if (!isInput) {
          e.preventDefault();
          clipboard.pasteFromClipboard()
            .then((content) => {
              const mol = wasmBridge.parseMolecule(content);
              pushUndo();
              setMolecule(mol);
              setStatus('Pasted structure');
            })
            .catch(() => setStatus('Paste failed: invalid format'));
        }
        return;
      }

      // Clean Layout (Ctrl+L / Cmd+L)
      if (ctrl && e.key === 'l') {
        e.preventDefault();
        pushUndo();
        const cleaned = wasmBridge.cleanLayout(molecule);
        setMolecule(cleaned);
        setStatus('Layout cleaned');
        return;
      }

      // Export (Ctrl+E / Cmd+E)
      if (ctrl && e.key === 'e') {
        e.preventDefault();
        // Trigger export via menu event (would need IPC bridge)
        setStatus('Use File > Export menu');
        return;
      }

      // Ignore if typing in an input
      if (isInput) return;

      // Undo/Redo
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((ctrl && e.key === 'z' && e.shiftKey) || (ctrl && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Zoom
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(zoom * 1.2);
        return;
      }
      if (e.key === '-') {
        e.preventDefault();
        setZoom(zoom / 1.2);
        return;
      }
      if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // Focus Mode
      if (ctrl && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setFocusMode(!focusMode);
        return;
      }

      // Help: Show Shortcuts
      if ((ctrl && e.key === '?') || e.key === 'F1') {
        e.preventDefault();
        showModal('shortcuts');
        return;
      }

      // Tool Selection
      const toolMap: Record<string, Tool> = {
        Escape: Tool.Select,
        'c': Tool.Atom_C,
        'n': Tool.Atom_N,
        'o': Tool.Atom_O,
        'p': Tool.Atom_P,
        's': Tool.Atom_S,
        '1': Tool.Bond_Single,
        '2': Tool.Bond_Double,
        '3': Tool.Bond_Triple,
        '4': Tool.Bond_Aromatic,
      };

      const tool = toolMap[e.key];
      if (tool) {
        e.preventDefault();
        setTool(tool);
        return;
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const selectedAtoms = getSelectedAtoms();
        const selectedBonds = getSelectedBonds();

        if (selectedAtoms.length > 0 || selectedBonds.length > 0) {
          pushUndo();
          selectedAtoms.forEach((a) => removeAtom(a.id));
          selectedBonds.forEach((b) => removeBond(b.id));
        }
        return;
      }

      // Select All
      if (ctrl && e.key === 'a') {
        if (!isInput) {
          e.preventDefault();
          selectAll();
        }
        return;
      }

      // Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAll();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    setTool,
    setZoom,
    zoom,
    undo,
    redo,
    pushUndo,
    removeAtom,
    removeBond,
    selectAll,
    deselectAll,
    getSelectedAtoms,
    getSelectedBonds,
    setFocusMode,
    focusMode,
    showModal,
    molecule,
    setMolecule,
    setStatus,
  ]);
}
