import { create } from 'zustand';
import { MoleculeDto, AtomDto, BondDto } from './types';

interface MoleculeStore {
  // Current molecule
  molecule: MoleculeDto;

  // Undo/redo history
  undoStack: MoleculeDto[];
  redoStack: MoleculeDto[];

  // Molecule metadata
  properties: any; // PropertiesDto, computed on demand

  // Actions
  setMolecule: (mol: MoleculeDto) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;

  // Atom operations
  addAtom: (element: string, x: number, y: number) => number; // returns id
  updateAtom: (id: number, updates: Partial<AtomDto>) => void;
  removeAtom: (id: number) => void;

  // Bond operations
  addBond: (from: number, to: number, order: number, stereo: number) => void;
  updateBond: (id: number, updates: Partial<BondDto>) => void;
  removeBond: (id: number) => void;

  // Selection
  selectAtom: (id: number, additive: boolean) => void;
  selectBond: (id: number, additive: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  getSelectedAtoms: () => AtomDto[];
  getSelectedBonds: () => BondDto[];
}

const emptyMolecule: MoleculeDto = {
  atoms: [],
  bonds: [],
};

const UNDO_LIMIT = 64;

export const useMoleculeStore = create<MoleculeStore>((set, get) => ({
  molecule: emptyMolecule,
  undoStack: [],
  redoStack: [],
  properties: null,

  setMolecule: (mol) => {
    set((state) => ({
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
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const newUndo = [...state.undoStack];
      const prev = newUndo.pop()!;
      return {
        undoStack: newUndo,
        molecule: prev,
        redoStack: [state.molecule, ...state.redoStack],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const newRedo = [...state.redoStack];
      const next = newRedo.shift()!;
      return {
        redoStack: newRedo,
        molecule: next,
        undoStack: [...state.undoStack, state.molecule],
      };
    });
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
