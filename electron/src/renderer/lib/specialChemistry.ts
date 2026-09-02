import type { QueryDocument, MarkushDefinition, PolymerDefinition } from './queryDocument';
import { validateQueryDocument } from './queryDocument';

export type MarkushSelection = { definitionId: string; substituentSmarts: string };

function assertValid(document: QueryDocument): void {
  const errors = validateQueryDocument(document);
  if (errors.length) throw new Error(`Invalid query document: ${errors.map((error) => error.message).join('; ')}`);
}

/** Immutable editor operation for a Markush definition. */
export function editMarkush(document: QueryDocument, id: string, patch: Partial<Omit<MarkushDefinition, 'id'>>): QueryDocument {
  assertValid(document);
  const definitions = document.markush ?? [];
  if (!definitions.some((definition) => definition.id === id)) throw new Error(`Unknown Markush definition: ${id}`);
  const next = definitions.map((definition) => definition.id === id ? { ...definition, ...patch, id } : definition);
  const result = { ...document, markush: next };
  assertValid(result);
  return result;
}

/** Selects an allowed substituent without pretending to resolve SMARTS into a molecule. */
export function selectMarkushSubstituent(document: QueryDocument, definitionId: string, substituentSmarts: string): MarkushSelection {
  assertValid(document);
  const definition = (document.markush ?? []).find((candidate) => candidate.id === definitionId);
  if (!definition) throw new Error(`Unknown Markush definition: ${definitionId}`);
  if (!definition.allowedSubstituentSmarts.includes(substituentSmarts)) throw new Error(`Substituent is not allowed by Markush definition: ${substituentSmarts}`);
  return { definitionId, substituentSmarts };
}

/** Immutable editor operation for polymer metadata. */
export function editPolymer(document: QueryDocument, id: string, patch: Partial<Omit<PolymerDefinition, 'id'>>): QueryDocument {
  assertValid(document);
  const definitions = document.polymers ?? [];
  if (!definitions.some((definition) => definition.id === id)) throw new Error(`Unknown polymer definition: ${id}`);
  const next = definitions.map((definition) => definition.id === id ? { ...definition, ...patch, id } : definition);
  const result = { ...document, polymers: next };
  assertValid(result);
  return result;
}

/**
 * Expands a two-attachment repeat unit into a deterministic concrete query.
 * The operation only duplicates explicitly referenced atoms/bonds and inserts
 * single inter-unit bonds; no implicit chemistry is invented.
 */
export function expandPolymer(document: QueryDocument, id: string, repeatCount: number): QueryDocument {
  assertValid(document);
  if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 100) throw new Error('Polymer repeat count must be an integer from 1 to 100');
  const definition = (document.polymers ?? []).find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`Unknown polymer definition: ${id}`);
  if (definition.attachmentAtomIds.length !== 2) throw new Error('Polymer expansion requires exactly two attachment atoms');
  const repeatAtoms = new Set(definition.repeatUnitAtomIds);
  const sourceAtoms = document.atoms.filter((atom) => repeatAtoms.has(atom.id));
  if (sourceAtoms.length !== repeatAtoms.size) throw new Error('Polymer repeat unit references an unknown atom');
  const sourceBonds = document.bonds.filter((bond) => repeatAtoms.has(bond.from) && repeatAtoms.has(bond.to));
  const existingIds = new Set(document.atoms.map((atom) => atom.id));
  const maxAtomId = Math.max(0, ...document.atoms.map((atom) => atom.id));
  const maxBondId = Math.max(0, ...document.bonds.map((bond) => bond.id));
  const atoms = document.atoms.filter((atom) => !repeatAtoms.has(atom.id));
  const bonds = document.bonds.filter((bond) => !repeatAtoms.has(bond.from) || !repeatAtoms.has(bond.to));
  const copies: Array<Map<number, number>> = [];
  let nextAtomId = maxAtomId + 1;
  let nextBondId = maxBondId + 1;
  for (let copy = 0; copy < repeatCount; copy++) {
    const map = new Map<number, number>();
    for (const atom of sourceAtoms) {
      const newId = copy === 0 ? atom.id : nextAtomId++;
      if (existingIds.has(newId) && copy !== 0) throw new Error('Polymer expansion generated a duplicate atom id');
      map.set(atom.id, newId);
      atoms.push({ ...atom, id: newId, x: atom.x + copy * 1.5 });
    }
    for (const bond of sourceBonds) bonds.push({ ...bond, id: copy === 0 ? bond.id : nextBondId++, from: map.get(bond.from)!, to: map.get(bond.to)! });
    copies.push(map);
  }
  const [left, right] = definition.attachmentAtomIds;
  const linkage = document.bonds.find((bond) => definition.linkageBondIds.includes(bond.id));
  for (let copy = 1; copy < copies.length; copy++) bonds.push({ id: nextBondId++, from: copies[copy - 1].get(right)!, to: copies[copy].get(left)!, constraint: { order: linkage?.constraint.order ?? 'single' } });
  const result = { ...document, atoms, bonds, polymers: (document.polymers ?? []).map((candidate) => candidate.id === id ? { ...candidate, repeatUnitAtomIds: sourceAtoms.map((atom) => copies[copies.length - 1].get(atom.id)!), linkageBondIds: [] } : candidate) };
  assertValid(result);
  return result;
}
