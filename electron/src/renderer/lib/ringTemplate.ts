import type { MoleculeDto } from '../store/types';

const DEFAULT_RING_BOND_LENGTH = 60;

/**
 * Inserts a regular carbon ring as one immutable document change.
 * Keeping this pure makes the palette action atomic and therefore one-step
 * undoable instead of exposing six intermediate atom additions to observers.
 */
export function insertCarbonRing(
  molecule: MoleculeDto,
  centerX: number,
  centerY: number,
  sides = 6,
  bondLength = DEFAULT_RING_BOND_LENGTH
): MoleculeDto {
  if (!Number.isInteger(sides) || sides < 3 || sides > 12) {
    throw new Error('Ring size must be an integer between 3 and 12.');
  }
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(bondLength) || bondLength <= 0) {
    throw new Error('Ring geometry must be finite and use a positive bond length.');
  }

  const radius = bondLength / (2 * Math.sin(Math.PI / sides));
  const firstAtomId = Math.max(0, ...molecule.atoms.map((atom) => atom.id)) + 1;
  const firstBondId = Math.max(0, ...molecule.bonds.map((bond) => bond.id)) + 1;
  const atoms = Array.from({ length: sides }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / sides;
    return {
      id: firstAtomId + index,
      element: 'C',
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      charge: 0,
      atom_map: 0,
    };
  });
  const bonds = atoms.map((atom, index) => ({
    id: firstBondId + index,
    from: atom.id,
    to: atoms[(index + 1) % atoms.length].id,
    order: 1,
    stereo: 0,
  }));

  return {
    atoms: [...molecule.atoms, ...atoms],
    bonds: [...molecule.bonds, ...bonds],
  };
}
