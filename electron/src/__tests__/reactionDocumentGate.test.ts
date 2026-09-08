import { exportSchemeAsJSON, importSchemeFromJSON } from '../renderer/lib/schemeExport';
import { validateReactionDocument } from '../renderer/lib/reactionDocumentGate';
import { rxnSchemeV2000Losses } from '../renderer/lib/rxnExport';
import { ReactionSchemeContext } from '../renderer/store/types';

function corpus(steps: number): ReactionSchemeContext {
  return { id: `corpus-${steps}`, title: `Corpus ${steps}`, description: '', currentStepIndex: steps - 1, viewMode: 'scheme', steps: Array.from({ length: steps }, (_, index) => ({
    id: `step-${index}`, reactants: [{ atoms: [{ id: index + 1, element: 'C', x: index, y: 0, charge: 0, atom_map: index + 1 }], bonds: [] }], products: [{ atoms: [{ id: index + 101, element: 'C', x: index, y: 0, charge: 0, atom_map: index + 1 }], bonds: [] }], agents: [], reactantComponentIds: [index === 0 ? 'starting' : `intermediate-${index - 1}`], productComponentIds: [index === steps - 1 ? 'final' : `intermediate-${index}`], agentComponentIds: [], authored: true, arrows: [], mechanismType: 'sn2', conditions: {}, arrowType: 'single',
  })) };
}

describe('multi-step reaction document gate', () => {
  it.each([2, 5, 20])('round-trips the %s-step corpus without flattening', (steps) => {
    const source = corpus(steps);
    expect(validateReactionDocument(source)).toEqual([]);
    const restored = importSchemeFromJSON(exportSchemeAsJSON(source, null, null, null));
    expect(restored).toEqual(source);
    expect(restored?.steps).toHaveLength(steps);
    expect(rxnSchemeV2000Losses(steps)).toEqual([{ code: 'multi-step', message: expect.stringContaining('step boundaries') }]);
  });

  it('rejects ambiguous continuity and provenance', () => {
    const invalid = corpus(2);
    invalid.steps[1].reactantComponentIds = ['unrelated'];
    invalid.steps[1].authored = false;
    expect(validateReactionDocument(invalid).map((issue) => issue.code)).toEqual(['provenance', 'continuity']);
  });

  it('rejects coefficient arrays that cannot preserve reaction meaning', () => {
    const invalid = corpus(1);
    invalid.steps[0].reactantCoefficients = [0];
    invalid.steps[0].productCoefficients = [Number.NaN, 1];
    expect(validateReactionDocument(invalid)).toEqual([
      { code: 'coefficient', path: 'steps.0.reactantCoefficients', message: 'Stoichiometric coefficients must be finite positive numbers no greater than 1000000' },
      { code: 'coefficient', path: 'steps.0.productCoefficients', message: 'Stoichiometric coefficients must align with molecule arrays' },
    ]);
  });

  it('rejects malformed component identities and oversized coefficients', () => {
    const invalid = corpus(1);
    invalid.steps[0].reactantComponentIds = [''];
    invalid.steps[0].productCoefficients = [1_000_001];
    expect(validateReactionDocument(invalid)).toEqual([
      { code: 'component-id', path: 'steps.0.reactantsComponentIds', message: 'Component IDs must be non-empty strings of at most 256 characters' },
      { code: 'coefficient', path: 'steps.0.productCoefficients', message: 'Stoichiometric coefficients must be finite positive numbers no greater than 1000000' },
    ]);
  });

  it('preserves a rich 20-step corpus with agents, fractions, repeated components, and map changes', () => {
    const source = corpus(20);
    source.steps.forEach((step, index) => {
      step.reactantCoefficients = [index % 3 === 0 ? 0.5 : 1];
      step.productCoefficients = [index % 4 === 0 ? 1.25 : 1];
      step.reactants[0].atoms[0].atom_map = index + 1;
      step.products[0].atoms[0].atom_map = index + 2;
      if (index === 7) {
        step.reactants = [];
        step.products = [];
        step.agents = [{ atoms: [{ id: 701, element: 'N', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] }];
        step.reactantComponentIds = [];
        step.productComponentIds = [];
        step.agentComponentIds = ['reusable-catalyst'];
        step.reactantCoefficients = [];
        step.productCoefficients = [];
      }
    });
    expect(validateReactionDocument(source)).toEqual([]);
    const restored = importSchemeFromJSON(exportSchemeAsJSON(source, null, null, null));
    expect(restored).toEqual(source);
    expect(restored?.steps).toHaveLength(20);
    expect(rxnSchemeV2000Losses(restored?.steps.length ?? 0)).toEqual([
      { code: 'multi-step', message: expect.stringContaining('step boundaries') },
    ]);
  });
});
