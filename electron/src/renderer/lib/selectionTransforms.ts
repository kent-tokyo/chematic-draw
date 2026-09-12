import { MoleculeDto } from '../store/types';

type Axis = 'horizontal' | 'vertical';

function selectedAtoms(molecule: MoleculeDto) {
  return molecule.atoms.filter((atom) => atom.selected);
}

export function alignSelectedAtoms(molecule: MoleculeDto, axis: Axis): MoleculeDto {
  const atoms = selectedAtoms(molecule);
  if (atoms.length < 2) return molecule;
  const coordinate = atoms.reduce((sum, atom) => sum + (axis === 'horizontal' ? atom.y : atom.x), 0) / atoms.length;
  return {
    ...molecule,
    atoms: molecule.atoms.map((atom) => atom.selected ? { ...atom, ...(axis === 'horizontal' ? { y: coordinate } : { x: coordinate }) } : atom),
  };
}

export function rotateSelectedAtoms(molecule: MoleculeDto, degrees: 90 | -90 = 90): MoleculeDto {
  const atoms = selectedAtoms(molecule);
  if (atoms.length < 2) return molecule;
  const center = {
    x: atoms.reduce((sum, atom) => sum + atom.x, 0) / atoms.length,
    y: atoms.reduce((sum, atom) => sum + atom.y, 0) / atoms.length,
  };
  const clockwise = degrees === 90;
  return {
    ...molecule,
    atoms: molecule.atoms.map((atom) => {
      if (!atom.selected) return atom;
      const dx = atom.x - center.x;
      const dy = atom.y - center.y;
      return { ...atom, x: center.x + (clockwise ? -dy : dy), y: center.y + (clockwise ? dx : -dx) };
    }),
  };
}
