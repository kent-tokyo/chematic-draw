import { create } from 'zustand';
import { Tool, CanvasState, MoleculeDto } from './types';

interface CanvasStoreState extends CanvasState {
  // Additional state
  dragStartPos: { x: number; y: number } | null;
  bondDragFrom: number | null;
  bondDragPos: { x: number; y: number } | null;
  contextMenu: { pos: { x: number; y: number }; atomId?: number; bondId?: number } | null;
  // The canvas element's own on-screen size, kept here (not local
  // component state) so centerViewOnLoad below can read it regardless of
  // which component last measured it.
  canvasSize: { width: number; height: number };
  // Set by a fresh-document load (initial sample, file open, crash
  // recovery restore) before the canvas has necessarily been measured yet
  // — consumed once canvasSize is actually known, whichever of the two
  // happens last. Not set by ordinary edits (mid-session setMolecule
  // calls like a stereoisomer swap or template insert), which should
  // leave the user's current pan/zoom alone.
  pendingCenter: boolean;

  // Actions
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  zoomAt: (zoom: number, screenX: number, screenY: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  pan: (deltaX: number, deltaY: number) => void;
  fitView: (molecule: MoleculeDto, padding?: number) => void;
  setHoverAtom: (id: number | null) => void;
  setHoverBond: (id: number | null) => void;
  setDragStart: (pos: { x: number; y: number } | null) => void;
  setBondDrag: (from: number | null, pos?: { x: number; y: number }) => void;
  showContextMenu: (pos: { x: number; y: number }, atomId?: number, bondId?: number) => void;
  hideContextMenu: () => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  requestCenterOnLoad: () => void;
  centerViewOnLoad: (molecule: MoleculeDto) => void;

  // Coordinate conversion
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  screenToWorld: (x: number, y: number) => { x: number; y: number };
}

export const useCanvasStore = create<CanvasStoreState>((set, get) => ({
  // Initial state
  offset: { x: 0, y: 0 },
  zoom: 1,
  activeTool: Tool.Select,
  hoverAtomId: null,
  hoverBondId: null,
  selectedAtomIds: new Set(),
  selectedBondIds: new Set(),
  dragStartPos: null,
  bondDragFrom: null,
  bondDragPos: null,
  contextMenu: null,
  canvasSize: { width: 0, height: 0 },
  pendingCenter: false,

  setTool: (tool) => set({ activeTool: tool }),

  setZoom: (zoom) => {
    const clamped = Math.max(0.2, Math.min(10, zoom));
    set({ zoom: clamped });
  },

  // Keep the world point beneath the cursor fixed while zooming.
  zoomAt: (zoom, screenX, screenY) => {
    const state = get();
    const clamped = Math.max(0.2, Math.min(10, zoom));
    const worldX = (screenX - state.offset.x) / state.zoom;
    const worldY = (screenY - state.offset.y) / state.zoom;
    set({
      zoom: clamped,
      offset: { x: screenX - worldX * clamped, y: screenY - worldY * clamped },
    });
  },

  setOffset: (offset) => set({ offset }),

  pan: (deltaX, deltaY) => {
    set((state) => ({
      offset: {
        x: state.offset.x + deltaX,
        y: state.offset.y + deltaY,
      },
    }));
  },

  // Fit the complete structure into the measured canvas while keeping a
  // stable margin. A minimum world-space extent prevents a single atom (or a
  // very compact fragment) from jumping to the 10x zoom ceiling.
  fitView: (molecule, padding = 40) => {
    const state = get();
    if (molecule.atoms.length === 0 || state.canvasSize.width <= 0 || state.canvasSize.height <= 0) return;
    const xs = molecule.atoms.map((atom) => atom.x);
    const ys = molecule.atoms.map((atom) => atom.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const worldWidth = Math.max(maxX - minX, 80);
    const worldHeight = Math.max(maxY - minY, 80);
    const availableWidth = Math.max(1, state.canvasSize.width - padding * 2);
    const availableHeight = Math.max(1, state.canvasSize.height - padding * 2);
    const zoom = Math.max(0.2, Math.min(10, Math.min(availableWidth / worldWidth, availableHeight / worldHeight)));
    set({
      zoom,
      offset: {
        x: state.canvasSize.width / 2 - ((minX + maxX) / 2) * zoom,
        y: state.canvasSize.height / 2 - ((minY + maxY) / 2) * zoom,
      },
    });
  },

  setHoverAtom: (id) => set({ hoverAtomId: id }),

  setHoverBond: (id) => set({ hoverBondId: id }),

  setDragStart: (pos) => set({ dragStartPos: pos }),

  setBondDrag: (from, pos) => {
    set({
      bondDragFrom: from,
      bondDragPos: pos || null,
    });
  },

  showContextMenu: (pos, atomId, bondId) => {
    set({
      contextMenu: {
        pos,
        atomId,
        bondId,
      },
    });
  },

  hideContextMenu: () => set({ contextMenu: null }),

  setCanvasSize: (size) => set({ canvasSize: size }),

  requestCenterOnLoad: () => set({ pendingCenter: true }),

  // Centers the molecule's bounding box in the canvas at the current zoom.
  // No-ops (but still clears the pending flag) on an empty molecule or an
  // as-yet-unmeasured canvas — the caller is expected to retry once
  // whichever is missing becomes available, not to have gotten the timing
  // right itself.
  centerViewOnLoad: (molecule) => {
    const state = get();
    if (molecule.atoms.length === 0 || state.canvasSize.width === 0) {
      set({ pendingCenter: false });
      return;
    }
    const xs = molecule.atoms.map((a) => a.x);
    const ys = molecule.atoms.map((a) => a.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    set({
      offset: {
        x: state.canvasSize.width / 2 - centerX * state.zoom,
        y: state.canvasSize.height / 2 - centerY * state.zoom,
      },
      pendingCenter: false,
    });
  },

  worldToScreen: (x, y) => {
    const state = get();
    return {
      x: x * state.zoom + state.offset.x,
      y: y * state.zoom + state.offset.y,
    };
  },

  screenToWorld: (x, y) => {
    const state = get();
    return {
      x: (x - state.offset.x) / state.zoom,
      y: (y - state.offset.y) / state.zoom,
    };
  },
}));
