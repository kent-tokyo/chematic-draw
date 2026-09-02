import { MoleculeDto } from '../store/types';

const ELEMENT_ATOMIC_NUMBERS: Record<string, number> = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Fe: 26, Cu: 29, Zn: 30, Br: 35, Ag: 47, I: 53,
};

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Write the documented, parser-compatible CDXML molecule subset. */
export function exportCdxml(molecule: MoleculeDto): string {
  const idByAtomId = new Map(molecule.atoms.map((atom, index) => [atom.id, index + 1]));
  const nodes = molecule.atoms.map((atom, index) => {
    const atomicNumber = ELEMENT_ATOMIC_NUMBERS[atom.element];
    if (atomicNumber === undefined && atom.wildcard !== true) throw new Error(`CDXML does not support element: ${atom.element}`);
    const attrs = [`id="${index + 1}"`, `p="${atom.x} ${-atom.y}"`, `Element="${atomicNumber ?? 6}"`];
    if (atom.charge !== 0) attrs.push(`Charge="${atom.charge}"`);
    if (atom.isotope !== undefined) attrs.push(`Isotope="${atom.isotope}"`);
    return `<n ${attrs.join(' ')}/>`;
  });
  const bonds = molecule.bonds.map((bond) => {
    const begin = idByAtomId.get(bond.from);
    const end = idByAtomId.get(bond.to);
    if (begin === undefined || end === undefined) throw new Error(`CDXML bond ${bond.id} references a missing atom`);
    return `<b B="${begin}" E="${end}" Order="${bond.order}"/>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CDXML>
<fragment id="1" Name="${escapeXml('chematic-draw')}">
${nodes.join('\n')}
${bonds.join('\n')}
</fragment>
</CDXML>`;
}
