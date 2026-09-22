import { create } from 'zustand';
import { MoleculeDto, AtomDto, BondDto, PropertiesDto } from './types';
import type { DrawingArrow, DrawingBracket, DrawingText } from '../../../../packages/chematic-contract/src/index';

interface MoleculeStore {
  // Current molecule
  molecule: MoleculeDto;

  // Undo/redo history
  undoStack: MoleculeDto[];
  redoStack: MoleculeDto[];

  // Molecule metadata
  properties: PropertiesDto | null; // computed on demand

  // Actions
  setMolecule: (mol: MoleculeDto) => void;
  pushUndo: () => void;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;

  // Atom operations
  addAtom: (element: string, x: number, y: number) => number; // returns id
  updateAtom: (id: number, updates: Partial<AtomDto>) => void;
  removeAtom: (id: number) => void;

  // Bond operations
  addBond: (from: number, to: number, order: number, stereo: number) => void;
  updateBond: (id: number, updates: Partial<BondDto>) => void;
  removeBond: (id: number) => void;
  addDrawingText: (item: Omit<DrawingText, 'id'>) => void;
  addDrawingArrow: (item: Omit<DrawingArrow, 'id'>) => void;
  addDrawingBracket: (item: Omit<DrawingBracket, 'id'>) => void;
  removeDrawingItem: (id: string) => void;

  // Selection
  selectAtom: (id: number, additive: boolean) => void;
  selectBond: (id: number, additive: boolean) => void;
  selectAll: () => void;
  selectRegion: (rect: { left: number; top: number; right: number; bottom: number }, canvasState: { offset: { x: number; y: number }; zoom: number }, additive: boolean) => void;
  translateSelectedAtoms: (dx: number, dy: number) => void;
  deselectAll: () => void;
  getSelectedAtoms: () => AtomDto[];
  getSelectedBonds: () => BondDto[];
}

const emptyMolecule: MoleculeDto = {
  atoms: [],
  bonds: [],
};

const UNDO_LIMIT = 64;

const nextDrawingId = (kind: string) => `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const drawingOrEmpty = (molecule: MoleculeDto) => molecule.drawing ?? { texts: [], arrows: [], brackets: [] };

export const useMoleculeStore = create<MoleculeStore>((set, get) => ({
  molecule: emptyMolecule,
  undoStack: [],
  redoStack: [],
  properties: null,

  setMolecule: (mol) => {
    set(() => ({
      molecule: mol,
      redoStack: [],
    }));
  },

  pushUndo: () => {
    set((state) => {
      const newStack = [...state.undoStack, state.molecule];
      return {
        undoStack: newStack.slice(-UNDO_LIMIT),
        redoStack: [],
      };
    });
  },

  undo: () => {
    let changed = false;
    set((state) => {
      if (state.undoStack.length === 0) return state;
      changed = true;
      const newUndo = [...state.undoStack];
      const prev = newUndo.pop()!;
      return {
        undoStack: newUndo,
        molecule: prev,
        redoStack: [state.molecule, ...state.redoStack],
      };
    });
    return changed;
  },

  redo: () => {
    let changed = false;
    set((state) => {
      if (state.redoStack.length === 0) return state;
      changed = true;
      const newRedo = [...state.redoStack];
      const next = newRedo.shift()!;
      return {
        redoStack: newRedo,
        molecule: next,
        undoStack: [...state.undoStack, state.molecule],
      };
    });
    return changed;
  },

  clear: () => {
    set({
      molecule: emptyMolecule,
      undoStack: [],
      redoStack: [],
    });
  },

  addAtom: (element, x, y) => {
    const { molecule } = get();
    const newId = Math.max(0, ...molecule.atoms.map((a) => a.id)) + 1;
    const newAtom: AtomDto = {
      id: newId,
      element,
      x,
      y,
      charge: 0,
      atom_map: 0,
    };
    set({
      molecule: {
        ...molecule,
        atoms: [...molecule.atoms, newAtom],
      },
    });
    return newId;
  },

  updateAtom: (id, updates) => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        atoms: state.molecule.atoms.map((a) =>
          a.id === id ? { ...a, ...updates } : a
        ),
      },
    }));
  },

  removeAtom: (id) => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        atoms: state.molecule.atoms.filter((a) => a.id !== id),
        bonds: state.molecule.bonds.filter(
          (b) => b.from !== id && b.to !== id
        ),
      },
    }));
  },

  addBond: (from, to, order, stereo) => {
    const { molecule } = get();
    // Check if bond already exists
    const exists = molecule.bonds.some(
      (b) => (b.from === from && b.to === to) || (b.from === to && b.to === from)
    );
    if (exists) return;

    const newId = Math.max(0, ...molecule.bonds.map((b) => b.id)) + 1;
    const newBond: BondDto = { id: newId, from, to, order, stereo };
    set({
      molecule: {
        ...molecule,
        bonds: [...molecule.bonds, newBond],
      },
    });
  },

  updateBond: (id, updates) => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        bonds: state.molecule.bonds.map((b) =>
          b.id === id ? { ...b, ...updates } : b
        ),
      },
    }));
  },

  removeBond: (id) => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        bonds: state.molecule.bonds.filter((b) => b.id !== id),
      },
    }));
  },

  addDrawingText: (item) => set((state) => {
    const drawing = drawingOrEmpty(state.molecule);
    return { molecule: { ...state.molecule, drawing: { ...drawing, texts: [...drawing.texts, { ...item, id: nextDrawingId('text') }] } } };
  }),

  addDrawingArrow: (item) => set((state) => {
    const drawing = drawingOrEmpty(state.molecule);
    return { molecule: { ...state.molecule, drawing: { ...drawing, arrows: [...drawing.arrows, { ...item, id: nextDrawingId('arrow') }] } } };
  }),

  addDrawingBracket: (item) => set((state) => {
    const drawing = drawingOrEmpty(state.molecule);
    return { molecule: { ...state.molecule, drawing: { ...drawing, brackets: [...drawing.brackets, { ...item, id: nextDrawingId('bracket') }] } } };
  }),

  removeDrawingItem: (id) => set((state) => {
    const drawing = drawingOrEmpty(state.molecule);
    return { molecule: { ...state.molecule, drawing: {
      texts: drawing.texts.filter((item) => item.id !== id),
      arrows: drawing.arrows.filter((item) => item.id !== id),
      brackets: drawing.brackets.filter((item) => item.id !== id),
    } } };
  }),

  selectAtom: (id, additive) => {
    set((state) => {
      const prevSelected = new Set(
        state.molecule.atoms.filter((a) => a.selected).map((a) => a.id)
      );
      if (additive) {
        if (prevSelected.has(id)) prevSelected.delete(id);
        else prevSelected.add(id);
      } else {
        prevSelected.clear();
        prevSelected.add(id);
      }
      return {
        molecule: {
          ...state.molecule,
          atoms: state.molecule.atoms.map((a) => ({
            ...a,
            selected: prevSelected.has(a.id),
          })),
        },
      };
    });
  },

  selectBond: (id, additive) => {
    set((state) => {
      const prevSelected = new Set(
        state.molecule.bonds.filter((b) => b.selected).map((b) => b.id)
      );
      if (additive) {
        if (prevSelected.has(id)) prevSelected.delete(id);
        else prevSelected.add(id);
      } else {
        prevSelected.clear();
        prevSelected.add(id);
      }
      return {
        molecule: {
          ...state.molecule,
          bonds: state.molecule.bonds.map((b) => ({
            ...b,
            selected: prevSelected.has(b.id),
          })),
        },
      };
    });
  },

  selectAll: () => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        atoms: state.molecule.atoms.map((a) => ({ ...a, selected: true })),
        bonds: state.molecule.bonds.map((b) => ({ ...b, selected: true })),
      },
    }));
  },

  selectRegion: (rect, canvasState, additive) => {
    set((state) => {
      const selectedAtomIds = new Set(additive ? state.molecule.atoms.filter((atom) => atom.selected).map((atom) => atom.id) : []);
      const inside = (x: number, y: number) => {
        const screenX = x * canvasState.zoom + canvasState.offset.x;
        const screenY = y * canvasState.zoom + canvasState.offset.y;
        return screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom;
      };
      for (const atom of state.molecule.atoms) if (inside(atom.x, atom.y)) selectedAtomIds.add(atom.id);
      const selectedBondIds = new Set(state.molecule.bonds.filter((bond) => selectedAtomIds.has(bond.from) && selectedAtomIds.has(bond.to)).map((bond) => bond.id));
      return {
        molecule: {
          ...state.molecule,
          atoms: state.molecule.atoms.map((atom) => ({ ...atom, selected: selectedAtomIds.has(atom.id) })),
          bonds: state.molecule.bonds.map((bond) => ({ ...bond, selected: selectedBondIds.has(bond.id) })),
        },
      };
    });
  },

  translateSelectedAtoms: (dx, dy) => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        atoms: state.molecule.atoms.map((atom) => atom.selected ? { ...atom, x: atom.x + dx, y: atom.y + dy } : atom),
      },
    }));
  },

  deselectAll: () => {
    set((state) => ({
      molecule: {
        ...state.molecule,
        atoms: state.molecule.atoms.map((a) => ({ ...a, selected: false })),
        bonds: state.molecule.bonds.map((b) => ({ ...b, selected: false })),
      },
    }));
  },

  getSelectedAtoms: () => {
    const { molecule } = get();
    return molecule.atoms.filter((a) => a.selected);
  },

  getSelectedBonds: () => {
    const { molecule } = get();
    return molecule.bonds.filter((b) => b.selected);
  },
}));
