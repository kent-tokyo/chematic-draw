import { MoleculeDto } from '../store/types';

export interface RxnDocument {
  reactants: MoleculeDto[];
  products: MoleculeDto[];
}

type MolWriter = (molecule: MoleculeDto) => string;
type MolParser = (text: string) => MoleculeDto;

/** Bounds applied before RXN blocks are handed to the molecule parser. */
export const MAX_RXN_TEXT_LENGTH = 10_000_000;
export const MAX_RXN_MOLECULES = 256;

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
  if (text.length > MAX_RXN_TEXT_LENGTH) {
    throw new Error(`RXN file exceeds the ${MAX_RXN_TEXT_LENGTH.toLocaleString()} character limit`);
  }
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines[0]?.trim() !== '$RXN') throw new Error('RXN file must start with $RXN');
  const countIndex = 4;
  const counts = (lines[countIndex] ?? '').trim().split(/\s+/).map(Number);
  if (counts.length < 2 || !Number.isInteger(counts[0]) || !Number.isInteger(counts[1]) || counts.some((n) => n < 0)) {
    throw new Error('RXN reactant/product counts are invalid');
  }
  const expected = counts[0] + counts[1];
  if (expected > MAX_RXN_MOLECULES) {
    throw new Error(`RXN contains ${expected} molecule blocks; maximum is ${MAX_RXN_MOLECULES}`);
  }
  const blocks = text.replace(/\r\n?/g, '\n').split('$MOL\n').slice(1).filter((block) => block.trim().length > 0);
  if (blocks.length !== expected) throw new Error(`RXN contains ${blocks.length} molecule blocks; expected ${expected}`);
  const molecules = blocks.map((block) => parseMol(block));
  return { reactants: molecules.slice(0, counts[0]), products: molecules.slice(counts[0]) };
}
