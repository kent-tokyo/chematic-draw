import { diagnoseReactionScheme, suggestReactionCoefficients } from '../renderer/lib/reactionSchemeUtils';
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
  it('suggests normalized integer coefficients without changing authored molecules', () => {
    const atom = (id: number, element: string) => ({ id, element, x: id, y: 0, charge: 0, atom_map: 0 });
    const step = {
      id: 'water',
      reactants: [
        { atoms: [atom(1, 'H'), atom(2, 'H')], bonds: [] },
        { atoms: [atom(3, 'O'), atom(4, 'O')], bonds: [] },
      ],
      products: [{ atoms: [atom(5, 'H'), atom(6, 'H'), atom(7, 'O')], bonds: [] }],
      arrows: [], mechanismType: 'sn2' as const,
    };
    expect(suggestReactionCoefficients(step)).toEqual({ reactants: [2, 1], products: [2] });
  });

  it('balances a seven-component combustion and synthesis step without factorial enumeration', () => {
    const atom = (id: number, element: string) => ({ id, element, x: id, y: 0, charge: 0, atom_map: 0 });
    const molecule = (id: number, elements: string[]) => ({ atoms: elements.map((element, offset) => atom(id * 10 + offset, element)), bonds: [] });
    const step = {
      id: 'seven-components',
      reactants: [molecule(1, ['C']), molecule(2, ['H', 'H']), molecule(3, ['O', 'O']), molecule(4, ['N', 'N'])],
      products: [molecule(5, ['C', 'H', 'H', 'H', 'H']), molecule(6, ['H', 'H', 'O']), molecule(7, ['N', 'H', 'H', 'H'])],
      arrows: [], mechanismType: 'sn2' as const,
    };
    const suggestion = suggestReactionCoefficients(step);
    expect(suggestion).not.toBeNull();
    if (suggestion) {
      expect(suggestion.reactants).toHaveLength(4);
      expect(suggestion.products).toHaveLength(3);
      expect([...suggestion.reactants, ...suggestion.products].every((coefficient) => Number.isInteger(coefficient) && coefficient > 0)).toBe(true);
      const totals = (coefficients: number[], molecules: { atoms: { element: string }[] }[]) => molecules.reduce((counts, molecule, index) => {
        molecule.atoms.forEach((atom) => counts.set(atom.element, (counts.get(atom.element) ?? 0) + coefficients[index]));
        return counts;
      }, new Map<string, number>());
      expect(totals(suggestion.reactants, step.reactants)).toEqual(totals(suggestion.products, step.products));
    }
  });

  it('does not suggest coefficients for an elementally impossible reaction', () => {
    const impossible = scheme('C', 'N').steps[0];
    expect(suggestReactionCoefficients(impossible)).toBeNull();
  });

  it('keeps formal charge in the coefficient search', () => {
    const atom = (id: number, element: string, charge: number) => ({ id, element, x: id, y: 0, charge, atom_map: 0 });
    const charged = {
      id: 'charge',
      reactants: [{ atoms: [atom(1, 'Na', 1)], bonds: [] }],
      products: [{ atoms: [atom(3, 'Na', 0)], bonds: [] }],
      arrows: [], mechanismType: 'sn2' as const,
    };
    expect(suggestReactionCoefficients(charged)).toBeNull();
  });

  it('checks a stoichiometrically balanced corpus fixture without inferring products', () => {
    const atom = (id: number, element: string) => ({ id, element, x: id, y: 0, charge: 0, atom_map: 0 });
    const molecule = (atoms: ReturnType<typeof atom>[], bonds: { id: number; from: number; to: number; order: number; stereo: number }[] = []) => ({ atoms, bonds });
    const water: ReactionSchemeContext = {
      id: 'water-corpus', title: '2 H2 + O2 -> 2 H2O', currentStepIndex: 0, viewMode: 'step', steps: [{
        id: 'combustion',
        reactants: [molecule([atom(1, 'H'), atom(2, 'H')], [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }]), molecule([atom(3, 'O'), atom(4, 'O')], [{ id: 2, from: 3, to: 4, order: 2, stereo: 0 }])],
        products: [molecule([atom(5, 'O'), atom(6, 'H'), atom(7, 'H')], [{ id: 3, from: 5, to: 6, order: 1, stereo: 0 }, { id: 4, from: 5, to: 7, order: 1, stereo: 0 }])],
        reactantCoefficients: [2, 1], productCoefficients: [2], arrows: [], mechanismType: 'sn2',
      }],
    };
    const result = diagnoseReactionScheme(water);
    expect(result.atomBalance).toEqual({ balanced: true, differences: [] });
    expect(result.chargeBalance).toEqual({ balanced: true, difference: 0 });
    expect(result.mapping.complete).toBe(false);
  });

  it('verifies an element-balanced, consistently mapped authored step', () => {
    const result = diagnoseReactionScheme(scheme('C', 'C'));
    expect(result.status).toBe('verified');
    expect(result.atomBalance.balanced).toBe(true);
    expect(result.chargeBalance.balanced).toBe(true);
    expect(result.continuity.valid).toBe(true);
    expect(result.continuity.boundaries).toEqual([]);
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

  it('uses authored stoichiometric coefficients for atom and charge balance', () => {
    const weighted = scheme('C', 'C');
    weighted.steps[0].reactantCoefficients = [2];
    weighted.steps[0].productCoefficients = [1];
    const result = diagnoseReactionScheme(weighted);
    expect(result.status).toBe('not_verified');
    expect(result.atomBalance.differences).toContain('Step 1: C: 1 extra on reactants');

    weighted.steps[0].productCoefficients = [2];
    expect(diagnoseReactionScheme(weighted).status).toBe('verified');
  });

  it('normalizes fractional charge arithmetic before deciding balance', () => {
    const fractional = scheme('C', 'C');
    fractional.steps[0].reactants = [
      { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 1, atom_map: 1 }], bonds: [] },
      { atoms: [{ id: 2, element: 'C', x: 0, y: 0, charge: 1, atom_map: 2 }], bonds: [] },
    ];
    fractional.steps[0].products = [{ atoms: [{ id: 3, element: 'C', x: 0, y: 0, charge: 1, atom_map: 1 }], bonds: [] }];
    fractional.steps[0].reactantCoefficients = [0.1, 0.2];
    fractional.steps[0].productCoefficients = [0.3];
    const result = diagnoseReactionScheme(fractional);
    expect(result.chargeBalance).toEqual({ balanced: true, difference: 0 });
    expect(result.issues).not.toContain(expect.stringContaining('formal charge is not balanced'));
  });

  it('fully verifies a mapped multi-component balance fixture', () => {
    const atom = (id: number, element: string, atom_map: number, charge = 0) => ({ id, element, x: id, y: 0, charge, atom_map });
    const step = {
      id: 'neutralization',
      reactants: [
        { atoms: [atom(1, 'H', 1), atom(2, 'Cl', 2)], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] },
        { atoms: [atom(3, 'Na', 3), atom(4, 'O', 4), atom(5, 'H', 5)], bonds: [{ id: 2, from: 3, to: 4, order: 1, stereo: 0 }, { id: 3, from: 4, to: 5, order: 1, stereo: 0 }] },
      ],
      products: [
        { atoms: [atom(6, 'Na', 3), atom(7, 'Cl', 2)], bonds: [{ id: 4, from: 6, to: 7, order: 1, stereo: 0 }] },
        { atoms: [atom(8, 'O', 4), atom(9, 'H', 1), atom(10, 'H', 5)], bonds: [{ id: 5, from: 8, to: 9, order: 1, stereo: 0 }, { id: 6, from: 8, to: 10, order: 1, stereo: 0 }] },
      ],
      arrows: [], mechanismType: 'sn2' as const,
    };
    const result = diagnoseReactionScheme({ id: 'mapped-corpus', title: 'Mapped balance', currentStepIndex: 0, viewMode: 'step', steps: [step] });
    expect(result.status).toBe('verified');
    expect(result.mapping).toMatchObject({ complete: true, duplicateMapNumbers: [], unmatchedMapNumbers: [] });
    expect(result.stepResults[0].mapping.mappedAtomCount).toBe(5);
    expect(result.atomBalance.balanced).toBe(true);
    expect(result.chargeBalance.balanced).toBe(true);
  });

  it('rejects malformed authored coefficient vectors', () => {
    const malformed = scheme('C', 'C');
    malformed.steps[0].reactantCoefficients = [0];
    const result = diagnoseReactionScheme(malformed);
    expect(result.status).toBe('not_verified');
    expect(result.atomBalance.differences).toContain('Step 1: Reactant coefficients must be positive finite values matching the reactant count.');
  });

  it('uses the same upper coefficient bound as the document import gate', () => {
    const oversized = scheme('C', 'C');
    oversized.steps[0].reactantCoefficients = [1_000_001];
    oversized.steps[0].productCoefficients = [1_000_001];
    const result = diagnoseReactionScheme(oversized);
    expect(result.status).toBe('not_verified');
    expect(result.atomBalance.differences).toEqual([
      'Step 1: Reactant coefficients must be positive finite values matching the reactant count.',
      'Step 1: Product coefficients must be positive finite values matching the product count.',
    ]);
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
    expect(result.continuity.boundaries).toEqual([{ fromStep: 1, toStep: 2, matchedMoleculeCount: 0 }]);
  });

  it('reports authored intermediate counts for a continuous multi-step scheme', () => {
    const multiStep = scheme('C', 'C');
    const nextReactant = { atoms: [{ ...multiStep.steps[0].products[0].atoms[0] }], bonds: [] };
    const nextProduct = { atoms: [{ ...nextReactant.atoms[0] }], bonds: [] };
    multiStep.steps.push({ ...multiStep.steps[0], id: 'step-2', reactants: [nextReactant], products: [nextProduct] });
    const result = diagnoseReactionScheme(multiStep);
    expect(result.continuity.valid).toBe(true);
    expect(result.continuity.boundaries).toEqual([{ fromStep: 1, toStep: 2, matchedMoleculeCount: 1 }]);
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

  it('does not continue an intermediate when its authored atom map changes', () => {
    const multiStep = scheme('C', 'C');
    const nextReactant = { atoms: [{ ...multiStep.steps[0].products[0].atoms[0], atom_map: 2 }], bonds: [] };
    const nextProduct = { atoms: [{ ...nextReactant.atoms[0] }], bonds: [] };
    multiStep.steps.push({ ...multiStep.steps[0], id: 'step-2', reactants: [nextReactant], products: [nextProduct] });
    const result = diagnoseReactionScheme(multiStep);
    expect(result.status).toBe('not_verified');
    expect(result.continuity.boundaries).toEqual([{ fromStep: 1, toStep: 2, matchedMoleculeCount: 0 }]);
  });
});
