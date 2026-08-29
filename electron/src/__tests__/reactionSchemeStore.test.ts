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
});
