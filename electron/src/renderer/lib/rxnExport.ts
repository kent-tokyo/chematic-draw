import { MoleculeDto } from '../store/types';

export interface RxnDocument {
  reactants: MoleculeDto[];
  products: MoleculeDto[];
}

type MolWriter = (molecule: MoleculeDto) => string;
type MolParser = (text: string) => MoleculeDto;

/** Write the authored reactants/products to MDL RXN V2000. */
export function exportRxn(document: RxnDocument, writeMol: MolWriter): string {
  const molecules = [...document.reactants, ...document.products];
  let output = '$RXN\n\n     chematic-draw\n\n';
  output += `${document.reactants.length.toString().padStart(3)}${document.products.length.toString().padStart(3)}\n`;
  for (const molecule of molecules) output += `$MOL\n${writeMol(molecule)}`;
  return output;
}

/** Parse an MDL RXN V2000 document without guessing missing molecule blocks. */
export function importRxn(text: string, parseMol: MolParser): RxnDocument {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== '$RXN') throw new Error('RXN file must start with $RXN');
  const countIndex = 4;
  const counts = (lines[countIndex] ?? '').trim().split(/\s+/).map(Number);
  if (counts.length < 2 || !Number.isInteger(counts[0]) || !Number.isInteger(counts[1]) || counts.some((n) => n < 0)) {
    throw new Error('RXN reactant/product counts are invalid');
  }
  const blocks = text.replace(/\r\n?/g, '\n').split('$MOL\n').slice(1).filter((block) => block.trim().length > 0);
  const expected = counts[0] + counts[1];
  if (blocks.length !== expected) throw new Error(`RXN contains ${blocks.length} molecule blocks; expected ${expected}`);
  const molecules = blocks.map((block) => parseMol(block));
  return { reactants: molecules.slice(0, counts[0]), products: molecules.slice(counts[0]) };
}
