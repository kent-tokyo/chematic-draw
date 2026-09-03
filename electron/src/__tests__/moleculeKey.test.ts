import { moleculeStructureKey } from '../renderer/lib/moleculeKey';

const molecule = {
  atoms: [{ id: 1, element: 'C', x: 10, y: 20, charge: 0, atom_map: 7, hydrogen_count: 3, wildcard: false, selected: false }],
  bonds: [],
};

describe('moleculeStructureKey', () => {
  it('ignores coordinate and selection-only changes', () => {
    expect(moleculeStructureKey(molecule)).toBe(moleculeStructureKey({
      ...molecule,
      atoms: [{ ...molecule.atoms[0], x: 999, y: -999, selected: true }],
    }));
  });

  it('invalidates derived results for query-relevant atom and bond changes', () => {
    const base = moleculeStructureKey({
      ...molecule,
      atoms: [{ ...molecule.atoms[0], isotope: 13 }],
      bonds: [{ id: 1, from: 1, to: 1, order: 1, stereo: 0 }],
    });
    expect(moleculeStructureKey({
      ...molecule,
      atoms: [{ ...molecule.atoms[0], isotope: 14 }],
      bonds: [{ id: 1, from: 1, to: 1, order: 1, stereo: 1 }],
    })).not.toBe(base);
  });
});
