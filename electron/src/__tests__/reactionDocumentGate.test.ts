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
});
