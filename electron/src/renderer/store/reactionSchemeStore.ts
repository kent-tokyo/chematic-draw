import { create } from 'zustand';
import { ReactionSchemeContext, MechanismArrow, MechanismStep } from './types';
import { SchemeLayout } from '../lib/schemeLayout';
import { calculateSchemeLayout } from '../lib/schemeLayout';
import { AtomMapping, ReactionClassification, GreenChemistryMetrics } from './types';
import { mapAtomsAcrossSteps, classifyReaction, calculateGreenChemistryMetrics } from '../lib/atomMapping';
import { diagnoseReactionScheme, ReactionDiagnostics } from '../lib/reactionSchemeUtils';

function deriveSchemeState(scheme: ReactionSchemeContext) {
  return {
    schemeLayout: calculateSchemeLayout(scheme),
    atomMappings: mapAtomsAcrossSteps(scheme),
    reactionClassification: classifyReaction(scheme),
    greenMetrics: calculateGreenChemistryMetrics(scheme),
    reactionDiagnostics: diagnoseReactionScheme(scheme),
  };
}

interface ReactionSchemeStore {
  // State
  scheme: ReactionSchemeContext | null;
  schemeLayout: SchemeLayout | null;
  selectedStepIndex: number | null;
  hoveredStepIndex: number | null;
  atomMappings: AtomMapping | null;
  reactionClassification: ReactionClassification | null;
  greenMetrics: GreenChemistryMetrics | null;
  reactionDiagnostics: ReactionDiagnostics | null;
  atomLabelsVisible: boolean;
  mappingLinesVisible: boolean;

  // Getters
  getCurrentStep(): MechanismStep | null;
  getStepCount(): number;
  canGoNext(): boolean;
  canGoPrevious(): boolean;

  // Navigation
  nextStep(): void;
  previousStep(): void;
  goToStep(index: number): void;

  // Scheme CRUD
  createScheme(title: string, description?: string): void;
  loadScheme(scheme: ReactionSchemeContext): void;
  updateSchemeInfo(updates: { title?: string; description?: string }): void;
  clearScheme(): void;

  // Step management
  addStep(step: MechanismStep): void;
  removeStep(stepId: string): void;
  updateStep(stepId: string, updates: Partial<MechanismStep>): void;
  updateCurrentStepArrows(arrows: MechanismArrow[]): void;
  reorderSteps(indices: number[]): void;

  // View mode
  setViewMode(mode: 'step' | 'scheme'): void;

  // Layout and selection
  recalculateLayout(): void;
  setSelectedStepIndex(index: number | null): void;
  setHoveredStepIndex(index: number | null): void;

  // Atom mapping and analysis
  calculateAtomMappings(): void;
  toggleAtomLabels(): void;
  toggleMappingLines(): void;
}

export const useReactionSchemeStore = create<ReactionSchemeStore>((set, get) => ({
  scheme: null,
  schemeLayout: null,
  selectedStepIndex: null,
  hoveredStepIndex: null,
  atomMappings: null,
  reactionClassification: null,
  greenMetrics: null,
  reactionDiagnostics: null,
  atomLabelsVisible: true,
  mappingLinesVisible: true,

  // Getter: current step
  getCurrentStep: () => {
    const state = get();
    if (!state.scheme) return null;
    return state.scheme.steps[state.scheme.currentStepIndex] || null;
  },

  // Getter: step count
  getStepCount: () => {
    const state = get();
    return state.scheme?.steps.length || 0;
  },

  // Getter: can navigate
  canGoNext: () => {
    const state = get();
    if (!state.scheme) return false;
    return state.scheme.currentStepIndex < state.scheme.steps.length - 1;
  },

  canGoPrevious: () => {
    const state = get();
    if (!state.scheme) return false;
    return state.scheme.currentStepIndex > 0;
  },

  // Navigation
  nextStep: () => {
    set((state) => {
      if (!state.scheme || !state.canGoNext()) return state;
      return {
        scheme: {
          ...state.scheme,
          currentStepIndex: state.scheme.currentStepIndex + 1,
        },
      };
    });
  },

  previousStep: () => {
    set((state) => {
      if (!state.scheme || !state.canGoPrevious()) return state;
      return {
        scheme: {
          ...state.scheme,
          currentStepIndex: state.scheme.currentStepIndex - 1,
        },
      };
    });
  },

  goToStep: (index: number) => {
    set((state) => {
      if (!state.scheme || !Number.isInteger(index) || index < 0 || index >= state.scheme.steps.length) return state;
      return {
        scheme: {
          ...state.scheme,
          currentStepIndex: index,
        },
      };
    });
  },

  // Scheme CRUD
  createScheme: (title: string, description?: string) => {
    set(() => {
      const newScheme: ReactionSchemeContext = {
        id: `scheme-${Date.now()}`,
        title,
        description,
        steps: [],
        currentStepIndex: 0,
        viewMode: 'step',
      };

      const layout = calculateSchemeLayout(newScheme);

      return {
        scheme: newScheme,
        schemeLayout: layout,
        atomMappings: null,
        reactionClassification: null,
        greenMetrics: null,
        reactionDiagnostics: null,
      };
    });
  },

  loadScheme: (scheme: ReactionSchemeContext) => {
    // Import a validated document as one atomic state transition. Replaying
    // addStep() would reset currentStepIndex/viewMode and briefly expose a
    // partially imported scheme to subscribers.
    set({
      scheme,
      selectedStepIndex: null,
      hoveredStepIndex: null,
      ...deriveSchemeState(scheme),
    });
  },

  updateSchemeInfo: (updates) => {
    set((state) => {
      if (!state.scheme) return state;
      return { scheme: { ...state.scheme, ...updates } };
    });
  },

  clearScheme: () => {
    set({
      scheme: null,
      schemeLayout: null,
      selectedStepIndex: null,
      hoveredStepIndex: null,
      atomMappings: null,
      reactionClassification: null,
      greenMetrics: null,
      reactionDiagnostics: null,
    });
  },

  // Step management
  addStep: (step: MechanismStep) => {
    set((state) => {
      if (!state.scheme) return state;
      const newScheme = {
        ...state.scheme,
        steps: [...state.scheme.steps, step],
      };
      return {
        scheme: newScheme,
        ...deriveSchemeState(newScheme),
      };
    });
  },

  removeStep: (stepId: string) => {
    set((state) => {
      if (!state.scheme) return state;
      const newSteps = state.scheme.steps.filter((s) => s.id !== stepId);
      if (newSteps.length === 0) return state; // Don't allow removing last step

      const newIndex = Math.min(
        state.scheme.currentStepIndex,
        newSteps.length - 1
      );

      const newScheme = {
        ...state.scheme,
        steps: newSteps,
        currentStepIndex: newIndex,
      };
      return {
        scheme: newScheme,
        selectedStepIndex: state.selectedStepIndex !== null && state.selectedStepIndex >= newSteps.length ? null : state.selectedStepIndex,
        ...deriveSchemeState(newScheme),
      };
    });
  },

  updateStep: (stepId: string, updates: Partial<MechanismStep>) => {
    set((state) => {
      if (!state.scheme) return state;
      const newScheme = {
        ...state.scheme,
        steps: state.scheme.steps.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step
        ),
      };
      return {
        scheme: newScheme,
        ...deriveSchemeState(newScheme),
      };
    });
  },

  updateCurrentStepArrows: (arrows: MechanismArrow[]) => {
    const state = get();
    const currentStep = state.getCurrentStep();
    if (currentStep) {
      state.updateStep(currentStep.id, { arrows });
    }
  },

  reorderSteps: (indices: number[]) => {
    set((state) => {
      if (!state.scheme) return state;
      const stepCount = state.scheme.steps.length;
      if (
        !Array.isArray(indices)
        || indices.length !== stepCount
        || indices.some((index) => !Number.isInteger(index) || index < 0 || index >= stepCount)
        || new Set(indices).size !== stepCount
      ) return state;
      const reorderedSteps = indices.map((i) => state.scheme!.steps[i]);
      const newScheme = {
        ...state.scheme,
        steps: reorderedSteps,
        currentStepIndex: 0,
      };
      return {
        scheme: newScheme,
        ...deriveSchemeState(newScheme),
      };
    });
  },

  // View mode
  setViewMode: (mode: 'step' | 'scheme') => {
    set((state) => {
      if (!state.scheme) return state;
      return {
        scheme: {
          ...state.scheme,
          viewMode: mode,
        },
      };
    });
  },

  // Layout and selection
  recalculateLayout: () => {
    set((state) => {
      if (!state.scheme) return state;
      const layout = calculateSchemeLayout(state.scheme);
      return { schemeLayout: layout };
    });
  },

  setSelectedStepIndex: (index: number | null) => {
    set({ selectedStepIndex: index });
  },

  setHoveredStepIndex: (index: number | null) => {
    set({ hoveredStepIndex: index });
  },

  // Atom mapping and analysis
  calculateAtomMappings: () => {
    set((state) => {
      if (!state.scheme) {
        return {
          atomMappings: null,
          reactionClassification: null,
          greenMetrics: null,
          reactionDiagnostics: null,
        };
      }

      const mappings = mapAtomsAcrossSteps(state.scheme);
      const classification = classifyReaction(state.scheme);
      const metrics = calculateGreenChemistryMetrics(state.scheme);
      const diagnostics = diagnoseReactionScheme(state.scheme);

      return {
        atomMappings: mappings,
        reactionClassification: classification,
        greenMetrics: metrics,
        reactionDiagnostics: diagnostics,
      };
    });
  },

  toggleAtomLabels: () => set((state) => ({ atomLabelsVisible: !state.atomLabelsVisible })),

  toggleMappingLines: () => set((state) => ({ mappingLinesVisible: !state.mappingLinesVisible })),
}));
