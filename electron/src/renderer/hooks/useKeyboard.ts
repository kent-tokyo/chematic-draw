import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useMoleculeStore } from '../store/moleculeStore';
import { useUIStore } from '../store/uiStore';
import { Tool } from '../store/types';
import * as clipboard from '../lib/clipboard';
import * as wasmBridge from '../wasm/wasmBridge';
import { matchesShortcut } from '../lib/shortcuts';

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
  const shortcutBindings = useUIStore((s) => s.shortcutBindings);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow copy/paste in inputs
      const isInput = (e.target as any).tagName === 'INPUT';
      const shortcut = (action: keyof typeof shortcutBindings) => matchesShortcut(e, shortcutBindings[action]);

      // Copy (Ctrl+C / Cmd+C)
      if (shortcut('copy')) {
        if (!isInput) {
          e.preventDefault();
          clipboard.copyMoleculeSmiles(molecule)
            .then(() => setStatus('Copied SMILES'))
            .catch(() => setStatus('Copy failed'));
        }
        return;
      }

      // Paste (Ctrl+V / Cmd+V)
      if (shortcut('paste')) {
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
      if (shortcut('cleanLayout')) {
        e.preventDefault();
        pushUndo();
        const cleaned = wasmBridge.cleanLayout(molecule);
        setMolecule(cleaned);
        setStatus('Layout cleaned');
        return;
      }

      // Export (Ctrl+E / Cmd+E)
      if (shortcut('export')) {
        e.preventDefault();
        // Trigger export via menu event (would need IPC bridge)
        setStatus('Use File > Export menu');
        return;
      }

      // Ignore if typing in an input
      if (isInput) return;

      // Undo/Redo
      if (shortcut('undo')) {
        e.preventDefault();
        const changed = undo();
        const current = useMoleculeStore.getState().molecule;
        const summary = `${current.atoms.length} atom${current.atoms.length === 1 ? '' : 's'}, ${current.bonds.length} bond${current.bonds.length === 1 ? '' : 's'}`;
        setStatus(changed
          ? `Undid last edit. ${summary}.`
          : 'Nothing to undo.');
        return;
      }
      if (shortcut('redo')) {
        e.preventDefault();
        const changed = redo();
        const current = useMoleculeStore.getState().molecule;
        const summary = `${current.atoms.length} atom${current.atoms.length === 1 ? '' : 's'}, ${current.bonds.length} bond${current.bonds.length === 1 ? '' : 's'}`;
        setStatus(changed
          ? `Redid last edit. ${summary}.`
          : 'Nothing to redo.');
        return;
      }

      // Zoom
      if (shortcut('zoomIn') || (!e.ctrlKey && !e.metaKey && (e.key === '+' || e.key === '='))) {
        e.preventDefault();
        setZoom(zoom * 1.2);
        return;
      }
      if (shortcut('zoomOut') || (!e.ctrlKey && !e.metaKey && e.key === '-')) {
        e.preventDefault();
        setZoom(zoom / 1.2);
        return;
      }
      if (shortcut('zoomReset') || (!e.ctrlKey && !e.metaKey && e.key === '0')) {
        e.preventDefault();
        setZoom(1);
        return;
      }

      // Focus Mode
      if (shortcut('focusMode')) {
        e.preventDefault();
        setFocusMode(!focusMode);
        return;
      }

      // Help: Show Shortcuts
      if (shortcut('showShortcuts') || e.key === 'F1') {
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
      if (shortcut('delete') || e.key === 'Backspace') {
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
      if (shortcut('selectAll')) {
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
    shortcutBindings,
  ]);
}
