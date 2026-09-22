import { insertCarbonRing } from '../renderer/lib/ringTemplate';

describe('ring template', () => {
  it('inserts a closed six-membered carbon ring without changing the source', () => {
    const source = { atoms: [], bonds: [] };
    const result = insertCarbonRing(source, 100, 80);

    expect(source).toEqual({ atoms: [], bonds: [] });
    expect(result.atoms).toHaveLength(6);
    expect(result.bonds).toHaveLength(6);
    expect(result.atoms.every((atom) => atom.element === 'C')).toBe(true);
    expect(new Set(result.bonds.flatMap((bond) => [bond.from, bond.to]))).toEqual(new Set(result.atoms.map((atom) => atom.id)));
  });

  it('continues atom and bond ids when inserted into an existing molecule', () => {
    const result = insertCarbonRing({
      atoms: [{ id: 7, element: 'O', x: 0, y: 0, charge: 0, atom_map: 0 }],
      bonds: [{ id: 9, from: 7, to: 7, order: 1, stereo: 0 }],
    }, 0, 0);

    expect(result.atoms[1].id).toBe(8);
    expect(result.bonds[1].id).toBe(10);
  });

  it('rejects invalid geometry', () => {
    expect(() => insertCarbonRing({ atoms: [], bonds: [] }, 0, 0, 2)).toThrow(/between 3 and 12/);
    expect(() => insertCarbonRing({ atoms: [], bonds: [] }, Number.NaN, 0)).toThrow(/finite/);
  });
});
