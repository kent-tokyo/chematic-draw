import { MoleculeDto } from '../store/types';

const ELEMENT_ATOMIC_NUMBERS: Record<string, number> = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Fe: 26, Cu: 29, Zn: 30, Br: 35, Ag: 47, I: 53,
};

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface CdxmlPage {
  id: string;
  molecule: MoleculeDto;
  title?: string;
  width?: number;
  height?: number;
  text?: Array<{ id: string; x: number; y: number; value: string }>;
  arrows?: Array<{ id: string; x1: number; y1: number; x2: number; y2: number; label?: string }>;
}

export interface CdxmlDocument { pages: CdxmlPage[]; }

function writeFragment(molecule: MoleculeDto): string {
  const idByAtomId = new Map(molecule.atoms.map((atom) => [atom.id, atom.id]));
  const nodes = molecule.atoms.map((atom) => {
    const atomicNumber = ELEMENT_ATOMIC_NUMBERS[atom.element];
    if (atomicNumber === undefined && atom.wildcard !== true) throw new Error(`CDXML does not support element: ${atom.element}`);
    const attrs = [`id="${atom.id}"`, `p="${atom.x} ${-atom.y}"`, `Element="${atomicNumber ?? 6}"`];
    if (atom.charge !== 0) attrs.push(`Charge="${atom.charge}"`);
    if (atom.isotope !== undefined) attrs.push(`Isotope="${atom.isotope}"`);
    if (atom.display_label) attrs.push(`Label="${escapeXml(atom.display_label)}"`);
    return `<n ${attrs.join(' ')}/>`;
  });
  const bonds = molecule.bonds.map((bond) => {
    const begin = idByAtomId.get(bond.from);
    const end = idByAtomId.get(bond.to);
    if (begin === undefined || end === undefined) throw new Error(`CDXML bond ${bond.id} references a missing atom`);
    const attrs = [`B="${begin}"`, `E="${end}"`, `Order="${bond.order}"`];
    if (bond.stereo === 1) attrs.push('Display="WedgeBegin"');
    if (bond.stereo === 2 || bond.stereo === 6) attrs.push('Display="DashBegin"');
    return `<b ${attrs.join(' ')}/>`;
  });
  return `<fragment id="1" Name="${escapeXml('chematic-draw')}">\n${nodes.join('\n')}\n${bonds.join('\n')}\n</fragment>`;
}

/** Write pages/fragments and the supported publication annotations. */
export function exportCdxmlDocument(document: CdxmlDocument): string {
  if (!document.pages.length) throw new Error('CDXML document must contain at least one page');
  const pages = document.pages.map((page) => {
    const attrs = [`id="${escapeXml(page.id)}"`];
    if (page.width !== undefined) attrs.push(`Width="${page.width}"`);
    if (page.height !== undefined) attrs.push(`Height="${page.height}"`);
    const title = page.title ? `<t id="${escapeXml(`${page.id}-title`)}" p="0 0" Label="${escapeXml(page.title)}"/>` : '';
    const text = (page.text ?? []).map((item) => `<t id="${escapeXml(item.id)}" p="${item.x} ${-item.y}" Label="${escapeXml(item.value)}"/>`).join('\n');
    const arrows = (page.arrows ?? []).map((arrow) => `<arrow id="${escapeXml(arrow.id)}" Begin="${arrow.x1} ${-arrow.y1}" End="${arrow.x2} ${-arrow.y2}"${arrow.label ? ` Label="${escapeXml(arrow.label)}"` : ''}/>`).join('\n');
    return `<page ${attrs.join(' ')}>\n${title}\n${text}\n${arrows}\n${writeFragment(page.molecule)}\n</page>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CDXML>\n${pages}\n</CDXML>`;
}

/** Write the documented, parser-compatible CDXML molecule subset. */
export function exportCdxml(molecule: MoleculeDto): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<CDXML>\n${writeFragment(molecule)}\n</CDXML>`;
}
