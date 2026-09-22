import { MoleculeDto } from '../store/types';
import type { QueryBondOrder, QueryDocument as ContractQueryDocument, QueryValidationError } from '../../../../packages/chematic-contract/src/index';
export type { QueryAtomConstraint, QueryBond, QueryBondOrder, QueryValidationError } from '../../../../packages/chematic-contract/src/index';
export type { MarkushDefinition, NucleicAcidBase, NucleicAcidDefinition, NucleicAcidResidue, NucleicAcidSugar, PolymerDefinition } from '../../../../packages/chematic-contract/src/index';

/** Versioned, UI-independent query representation. Unsupported constructs are
 * retained as typed opaque nodes so they cannot silently become concrete atoms. */
export const QUERY_DOCUMENT_VERSION = 1;
export const MAX_QUERY_DOCUMENT_TEXT_LENGTH = 5_000_000;

export type QueryDocument = ContractQueryDocument;

const ELEMENT = /^[A-Z][a-z]?$/;
const BOND_ORDERS = new Set<QueryBondOrder>(['single', 'double', 'triple', 'aromatic', 'any', 'single-or-aromatic', 'single-or-double']);

export function validateQueryDocument(document: QueryDocument): QueryValidationError[] {
  const errors: QueryValidationError[] = [];
  if (!document || document.schema !== 'chematic-draw/query-document' || document.schema_version !== QUERY_DOCUMENT_VERSION) {
    return [{ code: 'invalid', path: 'schema', message: 'Unsupported query document schema or version' }];
  }
  if (!Array.isArray(document.atoms) || !Array.isArray(document.bonds)) {
    return [{ code: 'invalid', path: 'atoms', message: 'Query document atoms and bonds must be arrays' }];
  }
  const optionalCollections = [
    ['opaque', document.opaque],
    ['markush', document.markush],
    ['polymers', document.polymers],
    ['nucleicAcids', document.nucleicAcids],
  ] as const;
  for (const [name, value] of optionalCollections) {
    if (value !== undefined && !Array.isArray(value)) {
      errors.push({ code: 'invalid', path: name, message: `Query document ${name} must be an array when present` });
    }
  }
  const atomIds = new Set<number>();
  for (const atom of document.atoms) {
    if (!atom || typeof atom !== 'object' || !Number.isInteger(atom.id) || atomIds.has(atom.id) || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)) {
      errors.push({ code: 'invalid', path: `atoms.${atom?.id ?? 'unknown'}`, message: 'Atom id and coordinates must be finite and unique' });
      continue;
    }
    atomIds.add(atom.id);
    const c = atom.constraint;
    if (!c || typeof c !== 'object' || (c.elements !== undefined && (!Array.isArray(c.elements) || c.elements.length === 0 || c.elements.some((e) => typeof e !== 'string' || !ELEMENT.test(e))))) {
      errors.push({ code: 'invalid', path: `atoms.${atom.id}.constraint`, message: 'Atom constraint is invalid' });
      continue;
    }
    if (c.charge !== undefined && !Number.isInteger(c.charge)) errors.push({ code: 'invalid', path: `atoms.${atom.id}.constraint.charge`, message: 'Charge must be an integer' });
    for (const key of ['isotope', 'valence', 'hydrogens'] as const) if (c[key] !== undefined && (!Number.isInteger(c[key]) || c[key] < 0)) errors.push({ code: 'invalid', path: `atoms.${atom.id}.constraint.${key}`, message: `${key} must be a non-negative integer` });
  }
  const bondIds = new Set<number>();
  for (const bond of document.bonds) {
    if (!bond || typeof bond !== 'object' || !Number.isInteger(bond.id) || bondIds.has(bond.id) || !atomIds.has(bond.from) || !atomIds.has(bond.to) || bond.from === bond.to) errors.push({ code: 'invalid', path: `bonds.${bond?.id ?? 'unknown'}`, message: 'Bond endpoints and id are invalid' });
    if (!BOND_ORDERS.has(bond?.constraint?.order)) errors.push({ code: 'invalid', path: `bonds.${bond?.id ?? 'unknown'}.constraint.order`, message: 'Bond query order is invalid' });
    if (bond && Number.isInteger(bond.id)) bondIds.add(bond.id);
  }
  for (const [index, opaque] of (Array.isArray(document.opaque) ? document.opaque : []).entries()) if (!opaque || typeof opaque !== 'object' || !['markush', 'polymer', 'nucleic-acid', 'smarts-token'].includes(opaque.kind) || typeof opaque.raw !== 'string' || opaque.raw.length > 10_000) errors.push({ code: 'unsupported', path: `opaque.${index}`, message: 'Opaque special-chemistry data is invalid' });
  for (const [index, definition] of (Array.isArray(document.markush) ? document.markush : []).entries()) {
    if (!definition || typeof definition !== 'object' || !definition.id || !definition.label || !Array.isArray(definition.attachmentAtomIds) || definition.attachmentAtomIds.length === 0 || new Set(definition.attachmentAtomIds).size !== definition.attachmentAtomIds.length || definition.attachmentAtomIds.some((id) => !Number.isInteger(id) || !atomIds.has(id)) || !Array.isArray(definition.allowedSubstituentSmarts) || definition.allowedSubstituentSmarts.length === 0 || definition.allowedSubstituentSmarts.some((pattern) => typeof pattern !== 'string' || pattern.trim().length === 0)) errors.push({ code: 'unsupported', path: `markush.${index}`, message: 'Markush definition requires unique attachment atoms and allowed SMARTS substituents' });
  }
  for (const [index, definition] of (Array.isArray(document.polymers) ? document.polymers : []).entries()) {
    if (!definition || typeof definition !== 'object' || !definition.id || !Array.isArray(definition.repeatUnitAtomIds) || definition.repeatUnitAtomIds.length === 0 || !Array.isArray(definition.linkageBondIds) || !Array.isArray(definition.attachmentAtomIds) || definition.repeatUnitAtomIds.some((id) => !atomIds.has(id)) || definition.linkageBondIds.some((id) => !bondIds.has(id)) || definition.attachmentAtomIds.some((id) => !atomIds.has(id))) errors.push({ code: 'unsupported', path: `polymers.${index}`, message: 'Polymer definition requires repeat-unit, linkage, and attachment references' });
  }
  for (const [index, definition] of (Array.isArray(document.nucleicAcids) ? document.nucleicAcids : []).entries()) {
    const residueIds = new Set<string>();
    const valid = Boolean(definition && typeof definition === 'object' && definition.id) && Array.isArray(definition?.residueIds) && Array.isArray(definition?.backboneBondIds) && Array.isArray(definition?.residues)
      && definition.residueIds.length === definition.residues.length
      && definition.backboneBondIds.every((id) => bondIds.has(id));
    if (!valid) {
      errors.push({ code: 'unsupported', path: `nucleicAcids.${index}`, message: 'Nucleic-acid definition requires residue and backbone references' });
      continue;
    }
    for (const [residueIndex, residue] of definition.residues.entries()) {
      const path = `nucleicAcids.${index}.residues.${residueIndex}`;
      if (!residue.id || residueIds.has(residue.id) || !['A', 'C', 'G', 'T', 'U', 'other'].includes(residue.base) || !['ribose', 'deoxyribose', 'unknown'].includes(residue.sugar) || !Array.isArray(residue.atomIds) || residue.atomIds.length === 0 || residue.atomIds.some((id) => !atomIds.has(id))) {
        errors.push({ code: 'unsupported', path, message: 'Nucleic-acid residue has invalid identity or atom references' });
      }
      residueIds.add(residue.id);
    }
    if (definition.residueIds.some((id) => !residueIds.has(id))) errors.push({ code: 'unsupported', path: `nucleicAcids.${index}.residueIds`, message: 'Nucleic-acid residueIds must match residue definitions' });
  }
  return errors;
}

/** Serialize the lossless query boundary; special chemistry is never flattened. */
export function serializeQueryDocument(document: QueryDocument): string {
  const errors = validateQueryDocument(document);
  if (errors.length) throw new Error(`Query document cannot be serialized: ${errors.map((error) => error.message).join('; ')}`);
  return JSON.stringify(document, null, 2);
}

/** Parse only validated query JSON; callers must handle null as a typed reject. */
export function parseQueryDocument(text: string): QueryDocument | null {
  if (typeof text !== 'string' || text.length > MAX_QUERY_DOCUMENT_TEXT_LENGTH) return null;
  try {
    const document = JSON.parse(text) as QueryDocument;
    return validateQueryDocument(document).length === 0 ? document : null;
  } catch {
    return null;
  }
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
 * constraint would otherwise be ambiguous. A connected graph may contain
 * branches and ring closures; disconnected components, ambiguous bond
 * alternatives, and special chemistry are rejected so callers keep the query
 * JSON as the lossless form. */
export function queryDocumentToSmarts(document: QueryDocument): string {
  const errors = validateQueryDocument(document);
  if (errors.length) throw new Error(`Invalid query document: ${errors.map((e) => e.message).join('; ')}`);
  if (document.opaque?.length || document.markush?.length || document.polymers?.length) throw new Error('Markush/polymer/opaque SMARTS constructs require query JSON preservation');
  const atomText = new Map(document.atoms.map((atom) => {
    const c = atom.constraint;
    if (c.wildcard) return [atom.id, '*'] as const;
    if (c.elements?.length === 1 && (c.charge === undefined || c.charge === 0) && c.isotope === undefined && c.aromatic === undefined && c.valence === undefined && c.hydrogens === undefined && c.ring === undefined) return [atom.id, c.elements[0]] as const;
    const elementPredicate = c.elements?.length ? c.elements.join(',') : '*';
    const parts = [elementPredicate, c.aromatic === undefined ? '' : (c.aromatic ? 'a' : '!a'), c.isotope === undefined ? '' : `i${c.isotope}`, c.charge === undefined ? '' : `${c.charge >= 0 ? '+' : ''}${c.charge}`, c.hydrogens === undefined ? '' : `H${c.hydrogens}`, c.valence === undefined ? '' : `v${c.valence}`, c.ring === undefined ? '' : (c.ring ? 'R' : '!R')].filter(Boolean);
    return [atom.id, `[${parts.join(';')}]`] as const;
  }));
  const bondText = (order: QueryBondOrder): string => ({ single: '-', double: '=', triple: '#', aromatic: ':', any: '~' } as const)[order] ?? '';
  if (document.bonds.some((bond) => bond.constraint.order === 'single-or-aromatic' || bond.constraint.order === 'single-or-double')) throw new Error('SMARTS subset writer cannot emit ambiguous bond alternatives without loss');
  const adjacency = new Map<number, Array<{ neighbor: number; bond: typeof document.bonds[number] }>>();
  for (const atom of document.atoms) adjacency.set(atom.id, []);
  const edgeKeys = new Set<string>();
  for (const bond of document.bonds) {
    const key = bond.from < bond.to ? `${bond.from}:${bond.to}` : `${bond.to}:${bond.from}`;
    if (edgeKeys.has(key)) throw new Error('SMARTS subset writer cannot emit duplicate bonds');
    edgeKeys.add(key);
    adjacency.get(bond.from)!.push({ neighbor: bond.to, bond });
    adjacency.get(bond.to)!.push({ neighbor: bond.from, bond });
  }
  for (const neighbors of adjacency.values()) neighbors.sort((left, right) => left.neighbor - right.neighbor || left.bond.id - right.bond.id);
  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const treeChildren = new Map<number, Array<{ neighbor: number; bond: typeof document.bonds[number] }>>();
  const nonTreeEdges: Array<typeof document.bonds[number]> = [];
  const nonTreeKeys = new Set<string>();
  const walk = (id: number) => {
    visited.add(id);
    for (const edge of adjacency.get(id) ?? []) {
      if (edge.neighbor === parent.get(id)) continue;
      if (!visited.has(edge.neighbor)) {
        parent.set(edge.neighbor, id);
        const children = treeChildren.get(id) ?? [];
        children.push(edge);
        treeChildren.set(id, children);
        walk(edge.neighbor);
      } else if (parent.get(id) !== edge.neighbor) {
        const key = id < edge.neighbor ? `${id}:${edge.neighbor}` : `${edge.neighbor}:${id}`;
        if (!nonTreeKeys.has(key)) {
          nonTreeKeys.add(key);
          nonTreeEdges.push(edge.bond);
        }
      }
    }
  };
  const componentRoots: number[] = [];
  for (const atom of document.atoms) {
    if (!visited.has(atom.id)) {
      componentRoots.push(atom.id);
      walk(atom.id);
    }
  }
  if (componentRoots.length > 1) throw new Error('SMARTS subset writer cannot emit disconnected components without loss');
  const traversalOrder = new Map<number, number>();
  const assignOrder = (id: number) => {
    if (traversalOrder.has(id)) return;
    traversalOrder.set(id, traversalOrder.size);
    for (const child of treeChildren.get(id) ?? []) assignOrder(child.neighbor);
  };
  for (const root of componentRoots) assignOrder(root);
  const ringLabels = new Map<number, Array<{ label: string; bond: string }>>();
  nonTreeEdges.sort((left, right) => left.id - right.id).forEach((bond, index) => {
    const label = index + 1 < 10 ? String(index + 1) : `%${index + 1}`;
    const first = (traversalOrder.get(bond.from) ?? 0) < (traversalOrder.get(bond.to) ?? 0) ? bond.from : bond.to;
    const second = first === bond.from ? bond.to : bond.from;
    const ringBond = bondText(bond.constraint.order);
    ringLabels.set(first, [...(ringLabels.get(first) ?? []), { label, bond: ringBond === '-' ? '' : ringBond }]);
    ringLabels.set(second, [...(ringLabels.get(second) ?? []), { label, bond: '' }]);
  });
  const render = (id: number): string => {
    const rings = (ringLabels.get(id) ?? []).sort((left, right) => left.label.localeCompare(right.label)).map(({ label, bond }) => `${bond}${label}`).join('');
    const children = treeChildren.get(id) ?? [];
    const renderedChildren = children.map(({ neighbor, bond }) => `${bondText(bond.constraint.order)}${render(neighbor)}`);
    const branches = renderedChildren.slice(0, -1).map((child) => `(${child})`).join('');
    return `${atomText.get(id) ?? '*'}${rings}${branches}${renderedChildren.at(-1) ?? ''}`;
  };
  return render(componentRoots[0]);
}
