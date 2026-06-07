import { create } from 'zustand';
import { Tool, CanvasState } from './types';

interface CanvasStoreState extends CanvasState {
  // Additional state
  dragStartPos: { x: number; y: number } | null;
  bondDragFrom: number | null;
  bondDragPos: { x: number; y: number } | null;
  contextMenu: { pos: { x: number; y: number }; atomId?: number; bondId?: number } | null;

  // Actions
  setTool: (tool: Tool) => void;
  setZoom: (zoom: number) => void;
  setOffset: (offset: { x: number; y: number }) => void;
  pan: (deltaX: number, deltaY: number) => void;
  setHoverAtom: (id: number | null) => void;
  setHoverBond: (id: number | null) => void;
  setDragStart: (pos: { x: number; y: number } | null) => void;
  setBondDrag: (from: number | null, pos?: { x: number; y: number }) => void;
  showContextMenu: (pos: { x: number; y: number }, atomId?: number, bondId?: number) => void;
  hideContextMenu: () => void;

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

  setTool: (tool) => set({ activeTool: tool }),

  setZoom: (zoom) => {
    const clamped = Math.max(0.2, Math.min(10, zoom));
    set({ zoom: clamped });
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
