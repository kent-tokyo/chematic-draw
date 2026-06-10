import { create } from 'zustand';
import { MechanismState, MechanismArrow, ArrowSuggestion } from './types';

interface MechanismStoreState extends MechanismState {
  startArrowSelection: (sourceAtomId?: number) => void;
  completeArrowSelection: (sinkAtomId: number, type: 'forward' | 'retro' | 'resonance') => void;
  cancelArrowSelection: () => void;
  setPendingSourceAtomId: (atomId: number | null) => void;
  setPendingSinkAtomId: (atomId: number | null) => void;
  addArrow: (arrow: MechanismArrow) => void;
  removeArrow: (arrowId: string) => void;
  updateArrow: (arrowId: string, updates: Partial<MechanismArrow>) => void;
  setSelectedArrow: (arrowId: string | null) => void;
  setHoverArrow: (arrowId: string | null) => void;
  suggestions: ArrowSuggestion[];
  suggestionsVisible: boolean;
  setSuggestions: (suggestions: ArrowSuggestion[]) => void;
  setSuggestionsVisible: (visible: boolean) => void;
  dismissSuggestion: (index: number) => void;
  clearSuggestions: () => void;
  clear: () => void;
}

export const useMechanismStore = create<MechanismStoreState>((set, get) => ({
  arrows: [],
  selectedArrowId: null,
  arrowSelectionMode: 'idle',
  pendingSourceAtomId: null,
  hoverArrowId: null,
  pendingSinkAtomId: null,
  suggestions: [],
  suggestionsVisible: true,

  startArrowSelection: (sourceAtomId) => {
    if (sourceAtomId !== undefined) {
      set({ arrowSelectionMode: 'awaitingSink', pendingSourceAtomId: sourceAtomId });
    } else {
      set({ arrowSelectionMode: 'awaitingSink' });
    }
  },

  setPendingSourceAtomId: (atomId) =>
    set({ pendingSourceAtomId: atomId }),

  setPendingSinkAtomId: (atomId) =>
    set({ pendingSinkAtomId: atomId }),

  completeArrowSelection: (sinkAtomId, type) => {
    const state = get();
    if (state.pendingSourceAtomId === null) return;

    const arrow: MechanismArrow = {
      id: `arrow-${Date.now()}`,
      sourceAtomId: state.pendingSourceAtomId,
      sinkAtomId,
      type,
      stepId: '',
    };

    set((s) => ({
      arrows: [...s.arrows, arrow],
      arrowSelectionMode: 'idle',
      pendingSourceAtomId: null,
      pendingSinkAtomId: null,
    }));
  },

  cancelArrowSelection: () =>
    set({ arrowSelectionMode: 'idle', pendingSourceAtomId: null, pendingSinkAtomId: null }),

  addArrow: (arrow) =>
    set((s) => ({ arrows: [...s.arrows, arrow] })),

  removeArrow: (arrowId) =>
    set((s) => ({ arrows: s.arrows.filter((a) => a.id !== arrowId) })),

  updateArrow: (arrowId, updates) =>
    set((s) => ({
      arrows: s.arrows.map((a) => (a.id === arrowId ? { ...a, ...updates } : a)),
    })),

  setSelectedArrow: (arrowId) => set({ selectedArrowId: arrowId }),

  setHoverArrow: (arrowId) => set({ hoverArrowId: arrowId }),

  setSuggestions: (suggestions) =>
    set({ suggestions }),

  setSuggestionsVisible: (visible) =>
    set({ suggestionsVisible: visible }),

  dismissSuggestion: (index) =>
    set((s) => ({
      suggestions: s.suggestions.filter((_, i) => i !== index),
    })),

  clearSuggestions: () =>
    set({ suggestions: [] }),

  clear: () =>
    set({
      arrows: [],
      selectedArrowId: null,
      arrowSelectionMode: 'idle',
      pendingSourceAtomId: null,
      pendingSinkAtomId: null,
      hoverArrowId: null,
      suggestions: [],
      suggestionsVisible: true,
    }),
}));
