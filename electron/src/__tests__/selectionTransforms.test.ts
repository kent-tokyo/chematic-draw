import { alignSelectedAtoms, distributeSelectedAtoms, flipSelectedAtoms, rotateSelectedAtoms } from '../renderer/lib/selectionTransforms';

const molecule = {
  atoms: [
    { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0, selected: true },
    { id: 2, element: 'O', x: 20, y: 10, charge: 0, atom_map: 0, selected: true },
    { id: 3, element: 'N', x: 50, y: 80, charge: 0, atom_map: 0 },
  ],
  bonds: [],
};

describe('selection transforms', () => {
  it('aligns only selected atoms on the requested axis', () => {
    const result = alignSelectedAtoms(molecule, 'horizontal');
    expect(result.atoms.map(({ x, y }) => [x, y])).toEqual([[0, 5], [20, 5], [50, 80]]);
  });

  it('rotates selected atoms around their centroid', () => {
    const result = rotateSelectedAtoms(molecule);
    expect(result.atoms.map(({ x, y }) => [x, y])).toEqual([[15, -5], [5, 15], [50, 80]]);
  });

  it('does not transform a singleton selection', () => {
    const single = { ...molecule, atoms: molecule.atoms.map((atom) => ({ ...atom, selected: atom.id === 1 })) };
    expect(rotateSelectedAtoms(single)).toBe(single);
  });

  it('distributes three selected atoms at equal intervals', () => {
    const threeSelected = { ...molecule, atoms: molecule.atoms.map((atom) => ({ ...atom, selected: true })) };
    const result = distributeSelectedAtoms(threeSelected, 'horizontal');
    expect(result.atoms.map((atom) => atom.x)).toEqual([0, 25, 50]);
  });

  it('flips selected atoms without moving unselected atoms', () => {
    const result = flipSelectedAtoms(molecule, 'horizontal');
    expect(result.atoms.map((atom) => atom.x)).toEqual([20, 0, 50]);
  });
});
