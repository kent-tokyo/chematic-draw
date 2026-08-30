import { diagnoseReactionScheme } from '../renderer/lib/reactionSchemeUtils';
import { ReactionSchemeContext } from '../renderer/store/types';

const scheme = (reactantElement: string, productElement: string, reactantMap = 1, productMap = 1): ReactionSchemeContext => ({
  id: 'scheme-1', title: 'test', steps: [{
    id: 'step-1',
    reactants: [{ atoms: [{ id: 1, element: reactantElement, x: 0, y: 0, charge: 0, atom_map: reactantMap }], bonds: [] }],
    products: [{ atoms: [{ id: 2, element: productElement, x: 0, y: 0, charge: 0, atom_map: productMap }], bonds: [] }],
    arrows: [], mechanismType: 'sn2',
  }], currentStepIndex: 0, viewMode: 'step',
});

describe('reaction diagnostics', () => {
  it('verifies an element-balanced, consistently mapped authored step', () => {
    const result = diagnoseReactionScheme(scheme('C', 'C'));
    expect(result.status).toBe('verified');
    expect(result.atomBalance.balanced).toBe(true);
    expect(result.mapping.complete).toBe(true);
  });

  it('reports atom balance differences without inventing a product', () => {
    const result = diagnoseReactionScheme(scheme('C', 'N'));
    expect(result.status).toBe('not_verified');
    expect(result.atomBalance.differences).toEqual(['Step 1: C: 1 extra on reactants', 'Step 1: N: 1 missing from reactants']);
    expect(result.issues).toContain('Step 1: atom balance is not verified.');
  });

  it('reports map numbers that exist on only one side', () => {
    const result = diagnoseReactionScheme(scheme('C', 'C', 1, 2));
    expect(result.mapping.complete).toBe(false);
    expect(result.mapping.unmatchedMapNumbers).toEqual([1, 2]);
  });
});
