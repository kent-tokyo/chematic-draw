/** Electron-free public data contract. Keep this file dependency-free. */
export interface MoleculeAtom { id: number; element: string; x: number; y: number; charge: number; atom_map: number; isotope?: number; hydrogen_count?: number; wildcard?: boolean; }
export interface MoleculeBond { id: number; from: number; to: number; order: number; stereo: number; }
export interface Molecule { atoms: MoleculeAtom[]; bonds: MoleculeBond[]; }
export interface QueryAtomConstraint { elements?: string[]; wildcard?: boolean; charge?: number; isotope?: number; aromatic?: boolean; valence?: number; hydrogens?: number; ring?: boolean; }
export interface QueryAtom { id: number; x: number; y: number; constraint: QueryAtomConstraint; }
export interface QueryBond { id: number; from: number; to: number; constraint: { order: string }; }
export interface QueryDocument { schema: 'chematic-draw/query-document'; schema_version: 1; atoms: QueryAtom[]; bonds: QueryBond[]; }

export function validateMolecule(molecule: Molecule): string[] {
  if (!molecule || !Array.isArray(molecule.atoms) || !Array.isArray(molecule.bonds)) return ['Molecule must contain atoms and bonds arrays'];
  const ids = new Set<number>();
  for (const atom of molecule.atoms) {
    if (!Number.isInteger(atom.id) || ids.has(atom.id) || typeof atom.element !== 'string' || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)) return [`Invalid atom: ${atom?.id ?? 'unknown'}`];
    ids.add(atom.id);
  }
  for (const bond of molecule.bonds) if (!ids.has(bond.from) || !ids.has(bond.to) || bond.from === bond.to) return [`Invalid bond: ${bond?.id ?? 'unknown'}`];
  return [];
}
