import { useReactionSchemeStore } from '../renderer/store/reactionSchemeStore';
import { MechanismStep } from '../renderer/store/types';

// Regression test for the dual reaction-scheme bug (see internal_docs/ROADMAP.md,
// v0.3 "document model" notes): ReactionPanel used to write steps into
// moleculeStore.reactionScheme while atom mapping/classification/green metrics were
// computed from reactionSchemeStore.scheme, a second, never-populated scheme — so
// those features were always computed over an empty step list. ReactionPanel now
// writes steps directly into reactionSchemeStore via addStep/removeStep/updateStep,
// which is what these assertions pin down.

function makeStep(id: string): MechanismStep {
  return {
    id,
    reactants: [{ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] }],
    products: [{ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] }],
    arrows: [],
    mechanismType: 'sn2',
    conditions: {},
    arrowType: 'single',
  };
}

describe('reactionSchemeStore: single source of truth for reaction steps', () => {
  beforeEach(() => {
    useReactionSchemeStore.setState({
      scheme: null,
      atomMappings: null,
      reactionClassification: null,
      greenMetrics: null,
    });
  });

  it('addStep populates atom mappings/classification/metrics from the step just added', () => {
    const store = useReactionSchemeStore.getState();
    store.createScheme('', '');
    useReactionSchemeStore.getState().addStep(makeStep('step-1'));

    const state = useReactionSchemeStore.getState();
    expect(state.scheme?.steps).toHaveLength(1);
    // Previously these stayed null/empty forever because calculateAtomMappings
    // read a permanently-empty parallel scheme.
    expect(state.reactionClassification).not.toBeNull();
    expect(state.reactionClassification?.type).toBe('single_step');
    expect(state.greenMetrics).not.toBeNull();
  });

  it('reorders authored steps and recalculates the derived reaction state', () => {
    useReactionSchemeStore.getState().createScheme('Reorder');
    useReactionSchemeStore.getState().addStep(makeStep('step-1'));
    useReactionSchemeStore.getState().addStep(makeStep('step-2'));
    useReactionSchemeStore.getState().reorderSteps([1, 0]);
    const state = useReactionSchemeStore.getState();
    expect(state.scheme?.steps.map((step) => step.id)).toEqual(['step-2', 'step-1']);
    expect(state.schemeLayout?.stepBoxes.map((box) => box.stepIndex)).toEqual([0, 1]);
    expect(state.reactionDiagnostics).not.toBeNull();
  });

  it('rejects malformed navigation and reorder indices instead of corrupting the scheme', () => {
    useReactionSchemeStore.getState().createScheme('Indices');
    useReactionSchemeStore.getState().addStep(makeStep('step-1'));
    useReactionSchemeStore.getState().addStep(makeStep('step-2'));
    const store = useReactionSchemeStore.getState();

    store.goToStep(0.5);
    store.reorderSteps([0, 0]);
    store.reorderSteps([2, 0]);

    const state = useReactionSchemeStore.getState();
    expect(state.scheme?.currentStepIndex).toBe(0);
    expect(state.scheme?.steps.map((step) => step.id)).toEqual(['step-1', 'step-2']);
    expect(state.schemeLayout?.stepBoxes).toHaveLength(2);
  });

  it('reflects a second added step in classification without a separate scheme existing', () => {
    useReactionSchemeStore.getState().createScheme('', '');
    useReactionSchemeStore.getState().addStep(makeStep('step-1'));
    useReactionSchemeStore.getState().addStep(makeStep('step-2'));

    const state = useReactionSchemeStore.getState();
    expect(state.scheme?.steps).toHaveLength(2);
    expect(state.reactionClassification?.type).toBe('multi_step');
  });

  it('updateStep merges conditions without touching other fields', () => {
    useReactionSchemeStore.getState().createScheme('', '');
    useReactionSchemeStore.getState().addStep(makeStep('step-1'));
    useReactionSchemeStore.getState().updateStep('step-1', { conditions: { temperature: 'reflux' } });

    const step = useReactionSchemeStore.getState().scheme?.steps[0];
    expect(step?.conditions?.temperature).toBe('reflux');
    expect(step?.mechanismType).toBe('sn2');
  });

  it('loads an imported multi-step scheme atomically without resetting view state', () => {
    const imported = {
      id: 'imported', title: 'Imported', description: 'preserve me', currentStepIndex: 1, viewMode: 'scheme' as const,
      steps: [makeStep('step-1'), makeStep('step-2')],
    };
    useReactionSchemeStore.getState().loadScheme(imported);
    const state = useReactionSchemeStore.getState();
    expect(state.scheme).toEqual(imported);
    expect(state.scheme?.currentStepIndex).toBe(1);
    expect(state.scheme?.viewMode).toBe('scheme');
    expect(state.schemeLayout?.stepBoxes).toHaveLength(2);
    expect(state.reactionClassification?.type).toBe('multi_step');
  });
});
