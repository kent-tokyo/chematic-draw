import { useUIStore } from '../store/uiStore';
import { useMoleculeStore } from '../store/moleculeStore';
import { useCanvasStore } from '../store/canvasStore';

export function useTheme() {
  return useUIStore((s) => s.theme);
}

export function useSidebar() {
  return {
    sidebarOpen: useUIStore((s) => s.sidebarOpen),
    sidebarWidth: useUIStore((s) => s.sidebarWidth),
    activeSidebarPanel: useUIStore((s) => s.activeSidebarPanel),
    setActiveSidebarPanel: useUIStore((s) => s.setActiveSidebarPanel),
    setSidebarOpen: useUIStore((s) => s.setSidebarOpen),
  };
}

export function useUndoRedo() {
  return {
    undoStack: useMoleculeStore((s) => s.undoStack),
    redoStack: useMoleculeStore((s) => s.redoStack),
    undo: useMoleculeStore((s) => s.undo),
    redo: useMoleculeStore((s) => s.redo),
    pushUndo: useMoleculeStore((s) => s.pushUndo),
  };
}

export function useMolecule() {
  return {
    molecule: useMoleculeStore((s) => s.molecule),
    setMolecule: useMoleculeStore((s) => s.setMolecule),
    addAtom: useMoleculeStore((s) => s.addAtom),
    updateAtom: useMoleculeStore((s) => s.updateAtom),
    removeAtom: useMoleculeStore((s) => s.removeAtom),
    addBond: useMoleculeStore((s) => s.addBond),
    updateBond: useMoleculeStore((s) => s.updateBond),
    removeBond: useMoleculeStore((s) => s.removeBond),
    selectAtom: useMoleculeStore((s) => s.selectAtom),
    selectBond: useMoleculeStore((s) => s.selectBond),
    deselectAll: useMoleculeStore((s) => s.deselectAll),
    getSelectedAtoms: useMoleculeStore((s) => s.getSelectedAtoms),
    getSelectedBonds: useMoleculeStore((s) => s.getSelectedBonds),
  };
}

export function useCanvas() {
  return {
    offset: useCanvasStore((s) => s.offset),
    zoom: useCanvasStore((s) => s.zoom),
    pan: useCanvasStore((s) => s.pan),
    setZoom: useCanvasStore((s) => s.setZoom),
    activeTool: useCanvasStore((s) => s.activeTool),
    setActiveTool: useCanvasStore((s) => s.setTool),
    screenToWorld: useCanvasStore((s) => s.screenToWorld),
    worldToScreen: useCanvasStore((s) => s.worldToScreen),
    hoverAtomId: useCanvasStore((s) => s.hoverAtomId),
    hoverBondId: useCanvasStore((s) => s.hoverBondId),
    setHoverAtom: useCanvasStore((s) => s.setHoverAtom),
    setHoverBond: useCanvasStore((s) => s.setHoverBond),
    bondDragPos: useCanvasStore((s) => s.bondDragPos),
    bondDragFrom: useCanvasStore((s) => s.bondDragFrom),
    setBondDrag: useCanvasStore((s) => s.setBondDrag),
  };
}
