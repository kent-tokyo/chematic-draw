import { MAX_MOLECULE_ATOMS, MAX_MOLECULE_BONDS, validateMolecule, type Molecule } from '@chematic/contract';

export function cloneMolecule(molecule: Molecule): Molecule {
  return { atoms: molecule.atoms.map((atom) => ({ ...atom })), bonds: molecule.bonds.map((bond) => ({ ...bond })) };
}

/** Validate and detach an embedding-boundary molecule. */
export function finiteMolecule(value: unknown): Molecule {
  if (!value || typeof value !== 'object' || !Array.isArray((value as Molecule).atoms) || !Array.isArray((value as Molecule).bonds)) throw new TypeError('schematic-molecule expects a molecule with atoms and bonds arrays');
  const molecule = value as Molecule;
  if (molecule.atoms.length > MAX_MOLECULE_ATOMS || molecule.bonds.length > MAX_MOLECULE_BONDS) throw new RangeError(`schematic-molecule exceeds the ${MAX_MOLECULE_ATOMS.toLocaleString()} atom or ${MAX_MOLECULE_BONDS.toLocaleString()} bond limit`);
  const atomIds = new Set(molecule.atoms.map((atom) => atom?.id));
  for (const bond of molecule.bonds) {
    if (!atomIds.has(bond?.from) || !atomIds.has(bond?.to) || bond?.from === bond?.to) throw new TypeError(`Invalid bond endpoints: ${bond?.id ?? 'unknown'}`);
  }
  const errors = validateMolecule(molecule);
  if (errors.length) throw new TypeError(errors.join('; '));
  return cloneMolecule(molecule);
}

export function serializeMolecule(molecule: Molecule): string { return JSON.stringify(finiteMolecule(molecule)); }

export function validateEmbeddedMolecule(molecule: Molecule): string[] {
  try { return validateMolecule(finiteMolecule(molecule)); }
  catch (error) { return [error instanceof Error ? error.message : String(error)]; }
}
