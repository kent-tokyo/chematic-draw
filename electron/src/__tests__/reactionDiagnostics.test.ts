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
    expect(result.chargeBalance.balanced).toBe(true);
    expect(result.continuity.valid).toBe(true);
    expect(result.mapping.complete).toBe(true);
    expect(result.stepResults[0].status).toBe('verified');
    expect(result.stepResults[0].mapping.mappedAtomCount).toBe(1);
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

  it('does not call an unannotated but element-balanced step fully mapped', () => {
    const result = diagnoseReactionScheme(scheme('C', 'C', 0, 0));
    expect(result.atomBalance.balanced).toBe(true);
    expect(result.mapping.complete).toBe(false);
    expect(result.status).toBe('not_verified');
  });

  it('reports formal charge imbalance as not verified', () => {
    const charged = scheme('C', 'C');
    charged.steps[0].products[0].atoms[0].charge = -1;
    const result = diagnoseReactionScheme(charged);
    expect(result.status).toBe('not_verified');
    expect(result.chargeBalance).toEqual({ balanced: false, difference: 1 });
    expect(result.issues).toContain('Step 1: formal charge is not balanced (1 extra charge on reactants).');
  });

  it('detects isotope and explicit hydrogen inventory differences', () => {
    const isotopeChange = scheme('C', 'C');
    isotopeChange.steps[0].reactants[0].atoms[0].isotope = 13;
    isotopeChange.steps[0].reactants[0].atoms[0].hydrogen_count = 1;
    isotopeChange.steps[0].products[0].atoms[0].hydrogen_count = 0;
    const result = diagnoseReactionScheme(isotopeChange);
    expect(result.status).toBe('not_verified');
    expect(result.atomBalance.differences).toEqual(['Step 1: 13C: 1 extra on reactants', 'Step 1: C: 1 missing from reactants', 'Step 1: H: 1 extra on reactants']);
    expect(result.issues).toContain('Step 1: atom balance is not verified.');
  });

  it('flags a multi-step scheme when no authored intermediate continues', () => {
    const multiStep = scheme('C', 'C');
    const nextReactant = { atoms: [{ ...multiStep.steps[0].products[0].atoms[0] }], bonds: [] };
    const nextProduct = { atoms: [{ ...nextReactant.atoms[0] }], bonds: [] };
    multiStep.steps.push({ ...multiStep.steps[0], id: 'step-2', reactants: [nextReactant], products: [nextProduct] });
    multiStep.steps[1].reactants[0].atoms[0].element = 'N';
    const result = diagnoseReactionScheme(multiStep);
    expect(result.status).toBe('not_verified');
    expect(result.continuity.valid).toBe(false);
    expect(result.continuity.issues).toEqual(['Step 1 → Step 2: no authored product matches a subsequent reactant.']);
  });

  it('does not treat an isotope or charge change as the same intermediate', () => {
    const multiStep = scheme('C', 'C');
    const nextReactant = { atoms: [{ ...multiStep.steps[0].products[0].atoms[0], isotope: 13, charge: 1 }], bonds: [] };
    const nextProduct = { atoms: [{ ...nextReactant.atoms[0] }], bonds: [] };
    multiStep.steps.push({ ...multiStep.steps[0], id: 'step-2', reactants: [nextReactant], products: [nextProduct] });
    const result = diagnoseReactionScheme(multiStep);
    expect(result.status).toBe('not_verified');
    expect(result.continuity.issues).toEqual(['Step 1 → Step 2: no authored product matches a subsequent reactant.']);
  });
});
