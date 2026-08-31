import { MoleculeDto } from '../store/types';

export const SESSION_BUNDLE_SCHEMA = 'chematic-draw/session-bundle';
export const SESSION_BUNDLE_VERSION = 1;

export interface SessionBundle {
  schema: typeof SESSION_BUNDLE_SCHEMA;
  schema_version: typeof SESSION_BUNDLE_VERSION;
  app: { name: 'chematic-draw'; engine: 'chematic 0.35.0' };
  source: { file_path: string | null };
  molecule: MoleculeDto;
  provenance: { operation: 'export-session-bundle'; structure_hash: string };
}

function stableMoleculeJson(molecule: MoleculeDto): string {
  return JSON.stringify({
    atoms: molecule.atoms.map((atom) => ({
      atom_map: atom.atom_map, charge: atom.charge, display_label: atom.display_label ?? null,
      element: atom.element, hydrogen_count: atom.hydrogen_count ?? null, id: atom.id,
      isotope: atom.isotope ?? null, wildcard: atom.wildcard ?? false, x: atom.x, y: atom.y,
    })),
    bonds: molecule.bonds.map((bond) => ({ from: bond.from, id: bond.id, order: bond.order, stereo: bond.stereo, to: bond.to })),
  });
}

// This is a deterministic review fingerprint, not a signing primitive.
function structureHash(molecule: MoleculeDto): string {
  let hash = 0x811c9dc5;
  for (const character of stableMoleculeJson(molecule)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-32:${hash.toString(16).padStart(8, '0')}`;
}

export function createSessionBundle(molecule: MoleculeDto, filePath: string | null): SessionBundle {
  return {
    schema: SESSION_BUNDLE_SCHEMA,
    schema_version: SESSION_BUNDLE_VERSION,
    app: { name: 'chematic-draw', engine: 'chematic 0.35.0' },
    source: { file_path: filePath },
    molecule,
    provenance: { operation: 'export-session-bundle', structure_hash: structureHash(molecule) },
  };
}

function isMolecule(value: unknown): value is MoleculeDto {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { atoms?: unknown; bonds?: unknown };
  return Array.isArray(candidate.atoms) && Array.isArray(candidate.bonds);
}

export function parseSessionBundle(text: string): SessionBundle {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Session bundle is not valid JSON.'); }
  if (!value || typeof value !== 'object') throw new Error('Session bundle must be a JSON object.');
  const bundle = value as Partial<SessionBundle>;
  if (bundle.schema !== SESSION_BUNDLE_SCHEMA || bundle.schema_version !== SESSION_BUNDLE_VERSION) {
    throw new Error('Unsupported or unrecognized session bundle.');
  }
  if (!isMolecule(bundle.molecule)) throw new Error('Session bundle does not contain a molecule.');
  return bundle as SessionBundle;
}

export function serializeSessionBundle(molecule: MoleculeDto, filePath: string | null): string {
  return `${JSON.stringify(createSessionBundle(molecule, filePath), null, 2)}\n`;
}
