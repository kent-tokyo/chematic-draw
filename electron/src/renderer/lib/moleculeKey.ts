import { MoleculeDto } from '../store/types';

/**
 * Stable identity for chemistry-derived results. Coordinates and selection
 * are intentionally excluded: moving or selecting an atom must not rerun
 * WASM analysis, while query-relevant fields must invalidate cached results.
 */
export function moleculeStructureKey(molecule: MoleculeDto): string {
  const atoms = molecule.atoms.map((atom) => [
    atom.id,
    atom.element,
    atom.charge,
    atom.atom_map,
    atom.isotope ?? null,
    atom.hydrogen_count ?? null,
    atom.wildcard ?? false,
    atom.display_label ?? null,
  ]);
  const bonds = molecule.bonds.map((bond) => [bond.id, bond.from, bond.to, bond.order, bond.stereo]);
  return JSON.stringify({ atoms, bonds });
}
