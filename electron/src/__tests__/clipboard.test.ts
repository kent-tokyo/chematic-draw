import { moleculeForClipboard, duplicateMoleculeSelection } from '../renderer/lib/clipboard';

describe('moleculeForClipboard', () => {
  const molecule = {
    atoms: [
      { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0, selected: true },
      { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0, selected: true },
      { id: 3, element: 'N', x: 2, y: 0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 1, from: 1, to: 2, order: 1, stereo: 0, selected: true },
      { id: 2, from: 2, to: 3, order: 1, stereo: 0 },
    ],
  };

  it('copies selected atoms with their internal bonds and strips selection state', () => {
    expect(moleculeForClipboard(molecule)).toEqual({
      atoms: [
        { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }],
    });
  });

  it('copies the whole molecule when nothing is selected', () => {
    const unselected = { ...molecule, atoms: molecule.atoms.map(({ selected: _selected, ...atom }) => atom), bonds: molecule.bonds.map(({ selected: _selected, ...bond }) => bond) };
    expect(moleculeForClipboard(unselected)).toBe(unselected);
  });
});

describe('duplicateMoleculeSelection', () => {
  it('adds a reidentified selected copy with an offset', () => {
    const source = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0, selected: true }], bonds: [] };
    const duplicated = duplicateMoleculeSelection(source, 20, 30);
    expect(duplicated?.atoms).toEqual([
      { ...source.atoms[0], selected: false },
      { ...source.atoms[0], id: 2, x: 20, y: 30, selected: true },
    ]);
  });

  it('returns null when there is no selection', () => {
    expect(duplicateMoleculeSelection({ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] })).toBeNull();
  });
});
