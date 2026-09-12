import type { MoleculeDto } from '../store/types';
import { moleculeStructureKey } from './moleculeKey';
import { exportCdxml } from './cdxmlExport';
import { ATOMIC_NUMBERS_BY_ELEMENT } from './chemicalElements';

export interface RichCdxmlSession {
  source: string;
  sourcePath: string;
  moleculeKey: string;
  molecule: MoleculeDto;
}

const SUPPORTED_CDXML_TAGS = new Set(['CDXML', 'page', 'fragment', 'n', 'b', 't', 's', 'graphic', 'arrow']);

/** Explain presentation data that the molecule-only fallback writer cannot retain. */
export function cdxmlSessionLossWarnings(session: RichCdxmlSession | null): string[] {
  if (!session) return [];
  const warnings: string[] = [];
  const tags = new Set<string>();
  for (const match of session.source.matchAll(/<\/?\s*([A-Za-z][A-Za-z0-9]*)\b/g)) {
    const tag = match[1];
    if (tag && !SUPPORTED_CDXML_TAGS.has(tag)) tags.add(tag);
  }
  if (/<graphic\b[^>]*>([\s\S]*?)<\/graphic\s*>/i.test(session.source)) tags.add('graphic');
  if (tags.size) warnings.push(`Unsupported CDXML presentation objects will be dropped: ${[...tags].sort().join(', ')}`);
  const pageCount = [...session.source.matchAll(/<page\b/g)].length;
  if (pageCount > 1) warnings.push('The edited molecule-only CDXML fallback cannot retain multiple page boundaries.');
  if (/<(?:t|arrow)\b/.test(session.source)) warnings.push('The edited molecule-only CDXML fallback cannot retain page text and reaction annotations.');
  return warnings;
}

function cdxmlMoleculeKey(molecule: MoleculeDto): string {
  return JSON.stringify({
    structure: moleculeStructureKey(molecule),
    coordinates: molecule.atoms.map((atom) => [atom.id, atom.x, atom.y]),
  });
}

export function captureRichCdxmlSession(source: string, sourcePath: string, molecule: MoleculeDto): RichCdxmlSession {
  const detachedMolecule = JSON.parse(JSON.stringify(molecule)) as MoleculeDto;
  return { source, sourcePath, moleculeKey: cdxmlMoleculeKey(molecule), molecule: detachedMolecule };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xmlAttr(tag: string, key: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`));
  return match?.[1] ?? match?.[2];
}

function setXmlAttr(tag: string, key: string, value: string): string {
  const escaped = escapeXml(value);
  const pattern = new RegExp(`(\\b${key}\\s*=\\s*)("[^"]*"|'[^']*')`);
  if (pattern.test(tag)) return tag.replace(pattern, `$1"${escaped}"`);
  return tag.replace(/\s*\/>$/, ` ${key}="${escaped}"/>`);
}

function removeXmlAttr(tag: string, key: string): string {
  return tag.replace(new RegExp(`\\s+${key}\\s*=\\s*(?:"[^"]*"|'[^']*')`), '');
}

function updateOptionalXmlAttr(tag: string, key: string, value: string | undefined): string {
  return value === undefined || value === '' ? removeXmlAttr(tag, key) : setXmlAttr(tag, key, value);
}

const ATOMIC_NUMBERS = ATOMIC_NUMBERS_BY_ELEMENT;

function bondKey(from: number, to: number): string {
  return from < to ? `${from}:${to}` : `${to}:${from}`;
}

function renderAtomTag(atom: MoleculeDto['atoms'][number]): string {
  const attrs = [`id="${atom.id}"`, `p="${atom.x} ${-atom.y}"`, `Element="${ATOMIC_NUMBERS[atom.element]}"`];
  if (atom.charge !== 0) attrs.push(`Charge="${atom.charge}"`);
  if (atom.isotope !== undefined) attrs.push(`Isotope="${atom.isotope}"`);
  if (atom.atom_map > 0) attrs.push(`Map="${atom.atom_map}"`);
  if (atom.display_label) attrs.push(`Label="${escapeXml(atom.display_label)}"`);
  return `<n ${attrs.join(' ')}/>`;
}

function renderBondTag(bond: MoleculeDto['bonds'][number]): string {
  const attrs = [`id="${bond.id}"`, `B="${bond.from}"`, `E="${bond.to}"`, `Order="${bond.order}"`];
  if (bond.stereo === 1) attrs.push('Display="WedgeBegin"');
  if (bond.stereo === 2 || bond.stereo === 6) attrs.push('Display="DashBegin"');
  return `<b ${attrs.join(' ')}/>`;
}

/** Patch only representational changes onto the original CDXML source. */
function patchRichCdxml(molecule: MoleculeDto, session: RichCdxmlSession): string | null {
  if (molecule.atoms.some((atom) => ATOMIC_NUMBERS[atom.element] === undefined) || molecule.bonds.some((bond) => ![1, 2, 3, 4].includes(bond.order))) return null;
  const originalAtomIds = new Set(session.molecule.atoms.map((atom) => atom.id));
  const nextAtomIds = new Set(molecule.atoms.map((atom) => atom.id));
  const addedAtomIds = [...nextAtomIds].filter((id) => !originalAtomIds.has(id));
  const removedAtomIds = [...originalAtomIds].filter((id) => !nextAtomIds.has(id));
  const originalBondKeys = session.molecule.bonds.map((bond) => bondKey(bond.from, bond.to)).sort();
  const nextBondKeys = molecule.bonds.map((bond) => bondKey(bond.from, bond.to)).sort();
  const addedBondKeys = nextBondKeys.filter((key) => !originalBondKeys.includes(key));
  const removedBondKeys = originalBondKeys.filter((key) => !nextBondKeys.includes(key));
  const hasTopologyChange = addedAtomIds.length > 0 || removedAtomIds.length > 0 || addedBondKeys.length > 0 || removedBondKeys.length > 0;
  // Recover ownership for additions that are connected to an existing node.
  // The renderer's molecule DTO is flat, so a disconnected new component (or
  // a component that bridges two fragments) must still use the explicit
  // molecule-only fallback rather than being placed by guesswork.
  const fragmentBodies = [...session.source.matchAll(/<fragment\b[^>]*?(?:\/\s*>|>([\s\S]*?)<\/fragment\s*>)/g)];
  if (fragmentBodies.length === 0) return null;
  const isInsideFragment = (index: number): boolean => fragmentBodies.some((match) => {
    const start = match.index ?? -1;
    return start >= 0 && index >= start && index < start + match[0].length;
  });
  const atomFragment = new Map<number, number>();
  for (const [fragmentIndex, match] of fragmentBodies.entries()) {
    for (const atomMatch of (match[1] ?? '').matchAll(/<n\b[^>]*\/\s*>/g)) {
      const id = Number(xmlAttr(atomMatch[0], 'id'));
      if (!Number.isInteger(id) || atomFragment.has(id)) return null;
      atomFragment.set(id, fragmentIndex);
    }
  }
  if ([...originalAtomIds].some((id) => atomFragment.get(id) === undefined)) return null;
  const inferredAtomFragments = new Map<number, number>();
  const inferFragment = (id: number): number | undefined => atomFragment.get(id) ?? inferredAtomFragments.get(id);
  let changed = true;
  while (changed) {
    changed = false;
    for (const bond of molecule.bonds) {
      const fromFragment = inferFragment(bond.from);
      const toFragment = inferFragment(bond.to);
      if (fromFragment === undefined && toFragment !== undefined && addedAtomIds.includes(bond.from)) {
        inferredAtomFragments.set(bond.from, toFragment);
        changed = true;
      } else if (toFragment === undefined && fromFragment !== undefined && addedAtomIds.includes(bond.to)) {
        inferredAtomFragments.set(bond.to, fromFragment);
        changed = true;
      }
    }
  }
  if (addedAtomIds.some((id) => inferFragment(id) === undefined)) return null;
  const addedBondFragments = new Map<string, number>();
  for (const bond of molecule.bonds) {
    const fromFragment = inferFragment(bond.from);
    const toFragment = inferFragment(bond.to);
    if (fromFragment === undefined || toFragment === undefined || fromFragment !== toFragment) return null;
    if (!originalBondKeys.includes(bondKey(bond.from, bond.to))) addedBondFragments.set(bondKey(bond.from, bond.to), fromFragment);
  }

  const atomTags = new Map<number, string>();
  for (const match of session.source.matchAll(/<n\b[^>]*\/\s*>/g)) {
    if (!isInsideFragment(match.index ?? -1)) continue;
    const id = Number(xmlAttr(match[0], 'id'));
    if (Number.isInteger(id)) atomTags.set(id, match[0]);
  }
  if ([...originalAtomIds].some((id) => !atomTags.has(id))) return null;
  const bondTags = new Map<string, string>();
  for (const match of session.source.matchAll(/<b\b[^>]*\/\s*>/g)) {
    if (!isInsideFragment(match.index ?? -1)) continue;
    const begin = Number(xmlAttr(match[0], 'B'));
    const end = Number(xmlAttr(match[0], 'E'));
    if (Number.isInteger(begin) && Number.isInteger(end)) bondTags.set(bondKey(begin, end), match[0]);
  }
  if (originalBondKeys.some((key) => !bondTags.has(key))) return null;

  const atomById = new Map(molecule.atoms.map((atom) => [atom.id, atom]));
  const bondByKey = new Map(molecule.bonds.map((bond) => [bondKey(bond.from, bond.to), bond]));
  let output = session.source.replace(/<n\b[^>]*\/\s*>/g, (tag, offset: number) => {
    if (!isInsideFragment(offset)) return tag;
    const atom = atomById.get(Number(xmlAttr(tag, 'id')));
    if (!atom) return '';
    let next = setXmlAttr(tag, 'p', `${atom.x} ${-atom.y}`);
    next = setXmlAttr(next, 'Element', String(ATOMIC_NUMBERS[atom.element]));
    next = updateOptionalXmlAttr(next, 'Charge', atom.charge === 0 ? undefined : String(atom.charge));
    next = updateOptionalXmlAttr(next, 'Isotope', atom.isotope === undefined ? undefined : String(atom.isotope));
    next = updateOptionalXmlAttr(next, 'Map', atom.atom_map > 0 ? String(atom.atom_map) : undefined);
    return updateOptionalXmlAttr(next, 'Label', atom.display_label);
  });
  output = output.replace(/<b\b[^>]*\/\s*>/g, (tag, offset: number) => {
    if (!isInsideFragment(offset)) return tag;
    const begin = Number(xmlAttr(tag, 'B'));
    const end = Number(xmlAttr(tag, 'E'));
    const bond = bondByKey.get(bondKey(begin, end));
    if (!bond) return '';
    let next = setXmlAttr(tag, 'Order', String(bond.order));
    next = removeXmlAttr(next, 'Display');
    if (bond.stereo === 1) next = setXmlAttr(next, 'Display', 'WedgeBegin');
    if (bond.stereo === 2 || bond.stereo === 6) next = setXmlAttr(next, 'Display', 'DashBegin');
    return next;
  });
  if (hasTopologyChange) {
    const addedAtomsByFragment = new Map<number, string[]>();
    for (const id of addedAtomIds) {
      const atom = atomById.get(id);
      const fragmentIndex = inferFragment(id);
      if (atom && fragmentIndex !== undefined) (addedAtomsByFragment.get(fragmentIndex) ?? (addedAtomsByFragment.set(fragmentIndex, []), addedAtomsByFragment.get(fragmentIndex)!)).push(renderAtomTag(atom));
    }
    const addedBondsByFragment = new Map<number, string[]>();
    for (const key of addedBondKeys) {
      const bond = bondByKey.get(key);
      const fragmentIndex = addedBondFragments.get(key);
      if (bond && fragmentIndex !== undefined) (addedBondsByFragment.get(fragmentIndex) ?? (addedBondsByFragment.set(fragmentIndex, []), addedBondsByFragment.get(fragmentIndex)!)).push(renderBondTag(bond));
    }
    let fragmentIndex = 0;
    output = output.replace(/<fragment\b[^>]*>[\s\S]*?<\/fragment\s*>/g, (fragment) => {
      const additions = [...(addedAtomsByFragment.get(fragmentIndex) ?? []), ...(addedBondsByFragment.get(fragmentIndex) ?? [])];
      fragmentIndex += 1;
      return additions.length ? fragment.replace(/<\/fragment\s*>$/, `${additions.join('\n')}\n</fragment>`) : fragment;
    });
  }
  return output;
}

/** Preserve the original document while its chemistry is unchanged or safely patchable. */
export function canPreserveCdxml(molecule: MoleculeDto, filePath: string, session: RichCdxmlSession | null): boolean {
  return Boolean(
    session &&
    filePath.toLowerCase().endsWith('.cdxml') &&
    (cdxmlMoleculeKey(molecule) === session.moleculeKey || patchRichCdxml(molecule, session) !== null),
  );
}

export function serializeCdxmlForPath(molecule: MoleculeDto, filePath: string, session: RichCdxmlSession | null): string {
  if (session && filePath.toLowerCase().endsWith('.cdxml')) {
    if (cdxmlMoleculeKey(molecule) === session.moleculeKey) return session.source;
    const patched = patchRichCdxml(molecule, session);
    if (patched !== null) return patched;
  }
  return exportCdxml(molecule);
}
