import { validateMolecule, type Molecule, type MoleculeAtom, type MoleculeBond } from '@chematic/contract';
import { serializeMolecule } from './index';

export type MoleculeEdit =
  | { type: 'add-atom'; atom: MoleculeAtom }
  | { type: 'update-atom'; atomId: number; updates: Partial<Omit<MoleculeAtom, 'id'>> }
  | { type: 'remove-atom'; atomId: number }
  | { type: 'add-bond'; bond: MoleculeBond }
  | { type: 'update-bond'; bondId: number; updates: Partial<Omit<MoleculeBond, 'id'>> }
  | { type: 'remove-bond'; bondId: number };

/** Apply one immutable, validated edit without importing a UI framework. */
export function applyMoleculeEdit(molecule: Molecule, edit: MoleculeEdit): Molecule {
  const current = JSON.parse(serializeMolecule(molecule)) as Molecule;
  if (edit.type === 'add-atom') {
    if (current.atoms.some((atom) => atom.id === edit.atom.id)) throw new Error(`Atom id already exists: ${edit.atom.id}`);
    current.atoms.push({ ...edit.atom });
  } else if (edit.type === 'update-atom') {
    const atom = current.atoms.find((candidate) => candidate.id === edit.atomId);
    if (!atom) throw new Error(`Atom id does not exist: ${edit.atomId}`);
    Object.assign(atom, edit.updates);
  } else if (edit.type === 'remove-atom') {
    if (!current.atoms.some((atom) => atom.id === edit.atomId)) throw new Error(`Atom id does not exist: ${edit.atomId}`);
    current.atoms = current.atoms.filter((atom) => atom.id !== edit.atomId);
    current.bonds = current.bonds.filter((bond) => bond.from !== edit.atomId && bond.to !== edit.atomId);
  } else if (edit.type === 'add-bond') {
    if (current.bonds.some((bond) => bond.id === edit.bond.id)) throw new Error(`Bond id already exists: ${edit.bond.id}`);
    current.bonds.push({ ...edit.bond });
  } else if (edit.type === 'update-bond') {
    const bond = current.bonds.find((candidate) => candidate.id === edit.bondId);
    if (!bond) throw new Error(`Bond id does not exist: ${edit.bondId}`);
    Object.assign(bond, edit.updates);
  } else {
    if (!current.bonds.some((bond) => bond.id === edit.bondId)) throw new Error(`Bond id does not exist: ${edit.bondId}`);
    current.bonds = current.bonds.filter((bond) => bond.id !== edit.bondId);
  }
  const errors = validateMolecule(current);
  if (errors.length) throw new Error(`Molecule edit rejected: ${errors.join('; ')}`);
  return current;
}
