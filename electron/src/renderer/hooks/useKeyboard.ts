import { useEffect } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useMoleculeStore } from '../store/moleculeStore';
import { useUIStore } from '../store/uiStore';
import { Tool } from '../store/types';

export function useKeyboard() {
  const setTool = useCanvasStore((s) => s.setTool);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const zoom = useCanvasStore((s) => s.zoom);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const removeAtom = useMoleculeStore((s) => s.removeAtom);
  const removeBond = useMoleculeStore((s) => s.removeBond);
  const deselectAll = useMoleculeStore((s) => s.deselectAll);
  const getSelectedAtoms = useMoleculeStore((s) => s.getSelectedAtoms);
  const getSelectedBonds = useMoleculeStore((s) => s.getSelectedBonds);
  const setFocusMode = useUIStore((s) => s.setFocusMode);
  const focusMode = useUIStore((s) => s.focusMode);
  const showModal = useUIStore((s) => s.showModal);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as any).tagName === 'INPUT') return;

      const ctrl = e.ctrlKey || e.metaKey;

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
        e.preventDefault();
        // TODO: selectAll()
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
  }, []);
}
