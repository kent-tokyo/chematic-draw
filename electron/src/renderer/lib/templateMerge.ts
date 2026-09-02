import { MoleculeDto } from '../store/types';

export function mergeTemplateIntoMolecule(baseMol: MoleculeDto, templateMol: MoleculeDto, offsetX: number = 0, offsetY: number = 0): MoleculeDto {
  // Find max ID in base molecule
  const maxAtomId = baseMol.atoms.length > 0 ? Math.max(...baseMol.atoms.map(a => a.id)) : 0;

  // Remap template atom IDs and apply offset
  const idMap = new Map<number, number>();
  const newAtoms = templateMol.atoms.map((atom, idx) => {
    const newId = maxAtomId + idx + 1;
    idMap.set(atom.id, newId);
    return {
      ...atom,
      id: newId,
      x: atom.x + offsetX,
      y: atom.y + offsetY,
    };
  });

  // Remap bond atom references
  const newBonds = templateMol.bonds.map((bond) => ({
    ...bond,
    from: idMap.get(bond.from) || bond.from,
    to: idMap.get(bond.to) || bond.to,
  }));

  // Find max bond ID
  const maxBondId = Math.max(
    ...baseMol.bonds.map(b => b.id),
    ...newBonds.map(b => b.id)
  );

  // Reassign bond IDs to avoid conflicts
  const finalBonds = newBonds.map((bond, idx) => ({
    ...bond,
    id: maxBondId + idx + 1,
  }));

  return {
    atoms: [...baseMol.atoms, ...newAtoms],
    bonds: [...baseMol.bonds, ...finalBonds],
  };
}
