import { useCallback, useRef, useMemo } from 'react';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';
import { Tool } from '../store/types';
import { hitTestAtom, hitTestBond, calculateBondedAtomPosition, getConnectedComponent } from '../lib/geometry';

const DRAG_THRESHOLD = 4;
const BOND_LENGTH = 60;

export interface CanvasInteractionHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export function useCanvasInteraction(): CanvasInteractionHandlers {
  const dragStateRef = useRef<{
    type: 'none' | 'atom-drag' | 'bond-drag' | 'pan';
    startX: number;
    startY: number;
    atomId?: number;
    bondFrom?: number;
  }>({ type: 'none', startX: 0, startY: 0 });

  const molecule = useMoleculeStore((s) => s.molecule);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setHoverAtom = useCanvasStore((s) => s.setHoverAtom);
  const setHoverBond = useCanvasStore((s) => s.setHoverBond);
  const setBondDrag = useCanvasStore((s) => s.setBondDrag);
  const pan = useCanvasStore((s) => s.pan);

  const addAtom = useMoleculeStore((s) => s.addAtom);
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const addBond = useMoleculeStore((s) => s.addBond);
  const removeBond = useMoleculeStore((s) => s.removeBond);
  const removeAtom = useMoleculeStore((s) => s.removeAtom);
  const selectAtom = useMoleculeStore((s) => s.selectAtom);
  const selectBond = useMoleculeStore((s) => s.selectBond);
  const deselectAll = useMoleculeStore((s) => s.deselectAll);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offset, zoom, screenToWorld } = useCanvasStore.getState();
      const canvasState = { offset, zoom };
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      dragStateRef.current = {
        type: 'none',
        startX: screenX,
        startY: screenY,
      };

      // Handle tool-specific logic
      if (activeTool === Tool.Select) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          dragStateRef.current = { type: 'atom-drag', startX: screenX, startY: screenY, atomId };
          selectAtom(atomId, e.shiftKey || e.ctrlKey);
        } else {
          deselectAll();
        }
      } else if (activeTool === Tool.Eraser) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        const bondId = hitTestBond(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          pushUndo();
          removeAtom(atomId);
        } else if (bondId !== null) {
          pushUndo();
          removeBond(bondId);
        }
      } else if (
        activeTool === Tool.Bond_Single ||
        activeTool === Tool.Bond_Double ||
        activeTool === Tool.Bond_Triple ||
        activeTool === Tool.Bond_Aromatic
      ) {
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          dragStateRef.current = { type: 'bond-drag', startX: screenX, startY: screenY, bondFrom: atomId };
          pushUndo();
        }
      } else if (activeTool.startsWith('atom_')) {
        const element = activeTool === Tool.Atom_C ? 'C' : activeTool.split('_')[1].toUpperCase();
        const atomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (atomId !== null) {
          // Change existing atom
          updateAtom(atomId, { element });
        } else {
          // Add new atom
          const worldPos = screenToWorld(screenX, screenY);
          pushUndo();
          addAtom(element, worldPos.x, worldPos.y);
        }
      }
    },
    [molecule, activeTool, selectAtom, deselectAll, removeAtom, removeBond, updateAtom, addAtom, pushUndo]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offset, zoom, screenToWorld } = useCanvasStore.getState();
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasState = { offset, zoom };

      // Update hover state
      setHoverAtom(hitTestAtom(molecule, screenX, screenY, canvasState));
      setHoverBond(hitTestBond(molecule, screenX, screenY, canvasState));

      // Handle dragging
      const dx = screenX - dragStateRef.current.startX;
      const dy = screenY - dragStateRef.current.startY;
      const dist = Math.hypot(dx, dy);

      if (dragStateRef.current.type === 'none' && dist > DRAG_THRESHOLD) {
        if (e.buttons & 2 || (e.buttons & 1 && activeTool === Tool.Select)) {
          dragStateRef.current.type = 'pan';
        }
      }

      if (dragStateRef.current.type === 'pan') {
        pan(dx, dy);
        dragStateRef.current.startX = screenX;
        dragStateRef.current.startY = screenY;
      } else if (dragStateRef.current.type === 'atom-drag' && dragStateRef.current.atomId) {
        const worldPos = screenToWorld(screenX, screenY);
        updateAtom(dragStateRef.current.atomId, { x: worldPos.x, y: worldPos.y });
      } else if (dragStateRef.current.type === 'bond-drag') {
        setBondDrag(dragStateRef.current.bondFrom, { x: screenX, y: screenY });
      }
    },
    [molecule, activeTool, setHoverAtom, setHoverBond, pan, updateAtom, setBondDrag]
  );

  const onMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { offset, zoom } = useCanvasStore.getState();
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasState = { offset, zoom };

      if (dragStateRef.current.type === 'bond-drag' && dragStateRef.current.bondFrom) {
        const targetAtomId = hitTestAtom(molecule, screenX, screenY, canvasState);
        if (targetAtomId !== null && targetAtomId !== dragStateRef.current.bondFrom) {
          // Add bond
          const order =
            activeTool === Tool.Bond_Single ? 1 : activeTool === Tool.Bond_Double ? 2 : activeTool === Tool.Bond_Triple ? 3 : 4;
          addBond(dragStateRef.current.bondFrom, targetAtomId, order, 0);
        }
        setBondDrag(null);
      }

      dragStateRef.current = { type: 'none', startX: 0, startY: 0 };
    },
    [molecule, activeTool, addBond, setBondDrag]
  );

  const onContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // TODO: Show context menu
  }, []);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onContextMenu,
  };
}
