import { create } from 'zustand';
import { ReactionSchemeContext, MechanismStep, MechanismArrow } from './types';

interface ReactionSchemeStore {
  // State
  scheme: ReactionSchemeContext | null;

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
  clearScheme(): void;

  // Step management
  addStep(step: MechanismStep): void;
  removeStep(stepId: string): void;
  updateStep(stepId: string, updates: Partial<MechanismStep>): void;
  updateCurrentStepArrows(arrows: MechanismArrow[]): void;
  reorderSteps(indices: number[]): void;

  // View mode
  setViewMode(mode: 'step' | 'scheme'): void;
}

export const useReactionSchemeStore = create<ReactionSchemeStore>((set, get) => ({
  scheme: null,

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
      if (!state.scheme || index < 0 || index >= state.scheme.steps.length) return state;
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
    set({
      scheme: {
        id: `scheme-${Date.now()}`,
        title,
        description,
        steps: [],
        currentStepIndex: 0,
        viewMode: 'step',
      },
    });
  },

  clearScheme: () => {
    set({ scheme: null });
  },

  // Step management
  addStep: (step: MechanismStep) => {
    set((state) => {
      if (!state.scheme) return state;
      return {
        scheme: {
          ...state.scheme,
          steps: [...state.scheme.steps, step],
        },
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

      return {
        scheme: {
          ...state.scheme,
          steps: newSteps,
          currentStepIndex: newIndex,
        },
      };
    });
  },

  updateStep: (stepId: string, updates: Partial<MechanismStep>) => {
    set((state) => {
      if (!state.scheme) return state;
      return {
        scheme: {
          ...state.scheme,
          steps: state.scheme.steps.map((step) =>
            step.id === stepId ? { ...step, ...updates } : step
          ),
        },
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
      const reorderedSteps = indices.map((i) => state.scheme!.steps[i]);
      return {
        scheme: {
          ...state.scheme,
          steps: reorderedSteps,
          currentStepIndex: 0,
        },
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
}));
