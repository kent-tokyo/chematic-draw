import { findCrossStepAtomId, mappingSimilarity } from '../renderer/lib/atomMapping';

const molecule = { atoms: [], bonds: [] };

describe('reaction atom mapping evidence', () => {
  it('prefers matching authored map numbers over heuristic similarity', () => {
    const product = { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 7 };
    const sameMap = { id: 2, element: 'C', x: 0, y: 0, charge: 0, atom_map: 7 };
    const differentMap = { id: 3, element: 'C', x: 0, y: 0, charge: 0, atom_map: 8 };
    expect(mappingSimilarity(product, sameMap, molecule, molecule)).toBe(1);
    expect(mappingSimilarity(product, differentMap, molecule, molecule)).toBe(0);
  });

  it('uses the fallback heuristic only when neither side is explicitly mapped', () => {
    const product = { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 };
    const candidate = { id: 2, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 };
    expect(mappingSimilarity(product, candidate, molecule, molecule)).toBe(1);
  });

  it('does not treat atom id zero as an unmatched cross-step atom', () => {
    const atom = (id: number, atom_map: number) => ({ id, element: 'C', x: id, y: 0, charge: 0, atom_map });
    expect(findCrossStepAtomId(atom(10, 7), [{ atoms: [atom(0, 7)], bonds: [] }], molecule)).toBe(0);
  });
});
