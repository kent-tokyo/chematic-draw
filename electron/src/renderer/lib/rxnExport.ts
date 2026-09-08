import { MoleculeDto } from '../store/types';
import type { RxnDocument as ContractRxnDocument, RxnV2000Loss as ContractRxnV2000Loss } from '../../../../packages/chematic-contract/src/index';
export type { RxnDocument, RxnV2000Loss, RxnV2000LossCode } from '../../../../packages/chematic-contract/src/index';
type RxnDocument = ContractRxnDocument;
type RxnV2000Loss = ContractRxnV2000Loss;

/** Return semantic fields that RXN V2000 cannot represent. */
export function rxnV2000Losses(document: RxnDocument): RxnV2000Loss[] {
  const losses: RxnV2000Loss[] = [];
  if (document.agents && document.agents.length > 0) {
    losses.push({ code: 'agents', message: 'RXN V2000 cannot preserve non-participating agents; export reaction-document JSON v2 instead.' });
  }
  if (document.reactantCoefficients?.some((coefficient) => coefficient !== 1) || document.productCoefficients?.some((coefficient) => coefficient !== 1)) {
    losses.push({ code: 'coefficients', message: 'RXN V2000 cannot preserve stoichiometric coefficients; export reaction-document JSON v2 instead.' });
  }
  return losses;
}

export function rxnSchemeV2000Losses(stepCount: number): RxnV2000Loss[] {
  return stepCount === 1 ? [] : [{ code: 'multi-step', message: 'RXN export supports one authored step; use JSON for multi-step schemes. RXN V2000 cannot preserve multiple reaction-step boundaries.' }];
}

type MolWriter = (molecule: MoleculeDto) => string;
type MolParser = (text: string) => MoleculeDto;
type DocumentWriter = (document: unknown) => string;
type DocumentParser = (text: string) => unknown;

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

/**
 * Convert the application's single-step loss-checked document into the
 * upstream ReactionDocument shape before writing RXN. The caller performs the
 * existing loss checks first; this adapter deliberately does not flatten
 * agents, coefficients, or additional steps.
 */
export function exportRxnViaDocumentAdapter(document: RxnDocument, writeSmiles: (molecule: MoleculeDto) => string, writeDocument: DocumentWriter): string {
  const components = [
    ...document.reactants.map((molecule, index) => ({ id: `reactant-${index + 1}`, role: 'reactant', smiles: writeSmiles(molecule), coefficient: 1, origin: 'authored' })),
    ...document.products.map((molecule, index) => ({ id: `product-${index + 1}`, role: 'product', smiles: writeSmiles(molecule), coefficient: 1, origin: 'authored' })),
  ];
  return writeDocument({
    id: 'chematic-draw-rxn',
    steps: [{ id: 'step-1', components, conditions: [], provenance: [], origin: 'authored' }],
    provenance: [],
  });
}

/** Read the upstream loss-aware document and project its one-step subset. */
export function importRxnViaDocumentAdapter(text: string, parseDocument: DocumentParser, parseSmiles: (smiles: string) => MoleculeDto): RxnDocument {
  const document = parseDocument(text) as { steps?: Array<{ components?: Array<{ role?: string; smiles?: string; coefficient?: number }> }> };
  if (!document || !Array.isArray(document.steps) || document.steps.length !== 1) throw new Error('RXN document must contain exactly one reaction step');
  const components = document.steps[0]?.components ?? [];
  const reactants = components.filter((component) => component.role === 'reactant').map((component) => parseSmiles(component.smiles ?? ''));
  const products = components.filter((component) => component.role === 'product').map((component) => parseSmiles(component.smiles ?? ''));
  if (reactants.length === 0 || products.length === 0) throw new Error('RXN document must contain reactants and products');
  if (components.some((component) => component.role === 'agent' || component.coefficient !== undefined && component.coefficient !== 1)) {
    throw new Error('RXN document contains fields not representable by the editor subset');
  }
  return { reactants, products };
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
