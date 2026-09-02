import { MoleculeDto } from '../store/types';
import type { QueryDocument as ContractQueryDocument } from '../../../../packages/chematic-contract/src/index';
export type { MarkushDefinition, PolymerDefinition } from '../../../../packages/chematic-contract/src/index';

/** Versioned, UI-independent query representation. Unsupported constructs are
 * retained as typed opaque nodes so they cannot silently become concrete atoms. */
export const QUERY_DOCUMENT_VERSION = 1;

export type QueryAtomConstraint = {
  elements?: string[];
  wildcard?: boolean;
  charge?: number;
  isotope?: number;
  aromatic?: boolean;
  valence?: number;
  hydrogens?: number;
  ring?: boolean;
};

export type QueryBondConstraint = {
  order: 'single' | 'double' | 'triple' | 'aromatic' | 'any' | 'single-or-aromatic' | 'single-or-double';
};

export interface QueryAtom {
  id: number;
  x: number;
  y: number;
  constraint: QueryAtomConstraint;
}

export interface QueryBond {
  id: number;
  from: number;
  to: number;
  constraint: QueryBondConstraint;
}

export type QueryDocument = ContractQueryDocument;

export type QueryValidationError = { code: 'invalid' | 'unsupported'; path: string; message: string };

const ELEMENT = /^[A-Z][a-z]?$/;
const BOND_ORDERS = new Set<string>(['single', 'double', 'triple', 'aromatic', 'any', 'single-or-aromatic', 'single-or-double']);

export function validateQueryDocument(document: QueryDocument): QueryValidationError[] {
  const errors: QueryValidationError[] = [];
  if (!document || document.schema !== 'chematic-draw/query-document' || document.schema_version !== QUERY_DOCUMENT_VERSION) {
    return [{ code: 'invalid', path: 'schema', message: 'Unsupported query document schema or version' }];
  }
  const atomIds = new Set<number>();
  for (const atom of document.atoms) {
    if (!Number.isInteger(atom.id) || atomIds.has(atom.id) || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)) {
      errors.push({ code: 'invalid', path: `atoms.${atom?.id ?? 'unknown'}`, message: 'Atom id and coordinates must be finite and unique' });
      continue;
    }
    atomIds.add(atom.id);
    const c = atom.constraint;
    if (!c || (c.elements !== undefined && (c.elements.length === 0 || c.elements.some((e) => !ELEMENT.test(e))))) errors.push({ code: 'invalid', path: `atoms.${atom.id}.constraint.elements`, message: 'Element list is invalid' });
    if (c.charge !== undefined && !Number.isInteger(c.charge)) errors.push({ code: 'invalid', path: `atoms.${atom.id}.constraint.charge`, message: 'Charge must be an integer' });
    for (const key of ['isotope', 'valence', 'hydrogens'] as const) if (c[key] !== undefined && (!Number.isInteger(c[key]) || c[key] < 0)) errors.push({ code: 'invalid', path: `atoms.${atom.id}.constraint.${key}`, message: `${key} must be a non-negative integer` });
  }
  const bondIds = new Set<number>();
  for (const bond of document.bonds) {
    if (!Number.isInteger(bond.id) || bondIds.has(bond.id) || !atomIds.has(bond.from) || !atomIds.has(bond.to) || bond.from === bond.to) errors.push({ code: 'invalid', path: `bonds.${bond?.id ?? 'unknown'}`, message: 'Bond endpoints and id are invalid' });
    if (!BOND_ORDERS.has(bond.constraint?.order)) errors.push({ code: 'invalid', path: `bonds.${bond?.id ?? 'unknown'}.constraint.order`, message: 'Bond query order is invalid' });
    bondIds.add(bond.id);
  }
  for (const [index, opaque] of (document.opaque ?? []).entries()) if (!['markush', 'polymer', 'smarts-token'].includes(opaque.kind) || typeof opaque.raw !== 'string' || opaque.raw.length > 10_000) errors.push({ code: 'unsupported', path: `opaque.${index}`, message: 'Opaque special-chemistry data is invalid' });
  for (const [index, definition] of (document.markush ?? []).entries()) {
    if (!definition.id || !definition.label || !Array.isArray(definition.attachmentAtomIds) || !Array.isArray(definition.allowedSubstituentSmarts) || definition.allowedSubstituentSmarts.length === 0 || definition.attachmentAtomIds.some((id) => !atomIds.has(id)) || definition.allowedSubstituentSmarts.some((pattern) => typeof pattern !== 'string' || pattern.length === 0)) errors.push({ code: 'unsupported', path: `markush.${index}`, message: 'Markush definition requires attachment atoms and allowed SMARTS substituents' });
  }
  for (const [index, definition] of (document.polymers ?? []).entries()) {
    if (!definition.id || !Array.isArray(definition.repeatUnitAtomIds) || definition.repeatUnitAtomIds.length === 0 || !Array.isArray(definition.linkageBondIds) || !Array.isArray(definition.attachmentAtomIds) || definition.repeatUnitAtomIds.some((id) => !atomIds.has(id)) || definition.linkageBondIds.some((id) => !bondIds.has(id)) || definition.attachmentAtomIds.some((id) => !atomIds.has(id))) errors.push({ code: 'unsupported', path: `polymers.${index}`, message: 'Polymer definition requires repeat-unit, linkage, and attachment references' });
  }
  return errors;
}

export function queryDocumentFromMolecule(molecule: MoleculeDto): QueryDocument {
  return {
    schema: 'chematic-draw/query-document', schema_version: QUERY_DOCUMENT_VERSION,
    atoms: molecule.atoms.map((atom) => ({ id: atom.id, x: atom.x, y: atom.y, constraint: { elements: atom.wildcard ? undefined : [atom.element], wildcard: atom.wildcard, charge: atom.charge, isotope: atom.isotope, hydrogens: atom.hydrogen_count } })),
    bonds: molecule.bonds.map((bond) => ({ id: bond.id, from: bond.from, to: bond.to, constraint: { order: ({ 1: 'single', 2: 'double', 3: 'triple', 4: 'aromatic' } as const)[bond.order] ?? 'any' } })),
  };
}

export function queryDocumentToMolecule(document: QueryDocument): MoleculeDto {
  const errors = validateQueryDocument(document);
  if (errors.length) throw new Error(`Query document cannot be converted without loss: ${errors.map((e) => e.message).join('; ')}`);
  if (document.opaque?.length || document.markush?.length || document.polymers?.length) throw new Error('Query document contains Markush/polymer/opaque SMARTS constructs; preserve the query document instead of exporting as a molecule');
  if (document.atoms.some((atom) => atom.constraint.elements?.length !== 1 || atom.constraint.wildcard || atom.constraint.aromatic !== undefined || atom.constraint.valence !== undefined || atom.constraint.ring !== undefined)) throw new Error('Query atom constraints cannot be represented by a concrete molecule');
  if (document.bonds.some((bond) => !['single', 'double', 'triple', 'aromatic'].includes(bond.constraint.order))) throw new Error('Query bond constraint cannot be represented by a concrete molecule');
  return { atoms: document.atoms.map((a) => ({ id: a.id, element: a.constraint.elements![0], x: a.x, y: a.y, charge: a.constraint.charge ?? 0, atom_map: 0, isotope: a.constraint.isotope, hydrogen_count: a.constraint.hydrogens })), bonds: document.bonds.map((b) => ({ id: b.id, from: b.from, to: b.to, order: ({ single: 1, double: 2, triple: 3, aromatic: 4 } as const)[b.constraint.order], stereo: 0 })) };
}

/** Deterministic SMARTS subset writer. Bracket atoms are used whenever a
 * constraint would otherwise be ambiguous. Markush/polymer data is rejected
 * here so callers can keep the versioned query JSON as the lossless format. */
export function queryDocumentToSmarts(document: QueryDocument): string {
  const errors = validateQueryDocument(document);
  if (errors.length) throw new Error(`Invalid query document: ${errors.map((e) => e.message).join('; ')}`);
  if (document.opaque?.length || document.markush?.length || document.polymers?.length) throw new Error('Markush/polymer/opaque SMARTS constructs require query JSON preservation');
  if (document.bonds.length !== Math.max(0, document.atoms.length - 1)) throw new Error('SMARTS subset writer only supports a single connected linear query');
  const atomText = document.atoms.map((atom) => {
    const c = atom.constraint;
    if (c.wildcard) return '*';
    if (c.elements?.length === 1 && (c.charge === undefined || c.charge === 0) && c.isotope === undefined && c.aromatic === undefined && c.valence === undefined && c.hydrogens === undefined && c.ring === undefined) return c.elements[0];
    const parts = [...(c.elements ?? ['*']).map((element) => element), c.aromatic ? 'a' : '', c.isotope === undefined ? '' : `i${c.isotope}`, c.charge === undefined ? '' : `${c.charge >= 0 ? '+' : ''}${c.charge}`, c.hydrogens === undefined ? '' : `H${c.hydrogens}`].filter(Boolean);
    return `[${parts.join(';')}]`;
  });
  const bondText = document.bonds.map((bond) => ({ single: '-', double: '=', triple: '#', aromatic: ':', any: '~', 'single-or-aromatic': '-', 'single-or-double': '-' } as const)[bond.constraint.order]);
  return atomText.map((atom, index) => index === 0 ? atom : `${bondText[index - 1]}${atom}`).join('');
}
