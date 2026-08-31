import { MoleculeDto } from '../store/types';
import { validateMoleculeDocument } from './documentCommands';

export const SESSION_BUNDLE_SCHEMA = 'chematic-draw/session-bundle';
export const SESSION_BUNDLE_VERSION = 2;
export const DOCUMENT_SCHEMA_VERSION = 1;
export const SESSION_BUNDLE_MIGRATION_POLICY = 'v1-to-v2-only';
export const MAX_SESSION_BUNDLE_TEXT_LENGTH = 10_000_000;
export const MAX_SESSION_SOURCE_PATH_LENGTH = 4_096;

export interface SessionBundle {
  schema: typeof SESSION_BUNDLE_SCHEMA;
  schema_version: typeof SESSION_BUNDLE_VERSION;
  app: { name: 'chematic-draw'; engine: 'chematic 0.35.0' };
  source: { file_path: string | null };
  document: { schema_version: typeof DOCUMENT_SCHEMA_VERSION; molecule: MoleculeDto };
  provenance: { operation: 'export-session-bundle'; structure_hash: string };
}

interface VersionedInputBundle {
  schema?: unknown;
  schema_version?: unknown;
  app?: SessionBundle['app'];
  source?: SessionBundle['source'];
  molecule?: MoleculeDto;
  document?: SessionBundle['document'];
  provenance?: SessionBundle['provenance'];
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
    document: { schema_version: DOCUMENT_SCHEMA_VERSION, molecule },
    provenance: { operation: 'export-session-bundle', structure_hash: structureHash(molecule) },
  };
}

function isMolecule(value: unknown): value is MoleculeDto {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { atoms?: unknown; bonds?: unknown };
  return Array.isArray(candidate.atoms) && Array.isArray(candidate.bonds);
}

function hasValidBundleMetadata(bundle: VersionedInputBundle): boolean {
  if (!bundle.document || bundle.document.schema_version !== DOCUMENT_SCHEMA_VERSION) return false;
  if (!bundle.source || typeof bundle.source !== 'object') return false;
  const filePath = bundle.source.file_path;
  if (filePath !== null && (typeof filePath !== 'string' || filePath.length > MAX_SESSION_SOURCE_PATH_LENGTH)) return false;
  return bundle.provenance?.operation === 'export-session-bundle'
    && typeof bundle.provenance.structure_hash === 'string'
    && /^fnv1a-32:[0-9a-f]{8}$/.test(bundle.provenance.structure_hash);
}

export function parseSessionBundle(text: string): SessionBundle {
  if (text.length > MAX_SESSION_BUNDLE_TEXT_LENGTH) {
    throw new Error(`Session bundle exceeds the ${MAX_SESSION_BUNDLE_TEXT_LENGTH.toLocaleString()} character limit.`);
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Session bundle is not valid JSON.'); }
  if (!value || typeof value !== 'object') throw new Error('Session bundle must be a JSON object.');
  const bundle = value as VersionedInputBundle;
  if (bundle.schema !== SESSION_BUNDLE_SCHEMA) {
    throw new Error('Unsupported or unrecognized session bundle.');
  }
  const normalized = bundle.schema_version === 1
    ? migrateV1Bundle(bundle)
    : bundle.schema_version === SESSION_BUNDLE_VERSION ? bundle : null;
  if (!normalized || !hasValidBundleMetadata(normalized) || !isMolecule(normalized.document.molecule)) {
    throw new Error('Session bundle does not contain a molecule.');
  }
  const errors = validateMoleculeDocument(normalized.document.molecule);
  if (errors.length > 0) throw new Error(`Session bundle contains an invalid molecule: ${errors.join('; ')}`);
  if (normalized.provenance?.structure_hash !== structureHash(normalized.document.molecule)) {
    throw new Error('Session bundle provenance hash does not match the molecule.');
  }
  return normalized as SessionBundle;
}

function migrateV1Bundle(bundle: VersionedInputBundle): SessionBundle | null {
  const molecule = bundle.molecule;
  if (!isMolecule(molecule)) return null;
  return {
    schema: SESSION_BUNDLE_SCHEMA,
    schema_version: SESSION_BUNDLE_VERSION,
    app: bundle.app ?? { name: 'chematic-draw', engine: 'chematic 0.35.0' },
    source: bundle.source ?? { file_path: null },
    document: { schema_version: DOCUMENT_SCHEMA_VERSION, molecule },
    provenance: bundle.provenance ?? { operation: 'export-session-bundle', structure_hash: structureHash(molecule) },
  };
}

export function serializeSessionBundle(molecule: MoleculeDto, filePath: string | null): string {
  return `${JSON.stringify(createSessionBundle(molecule, filePath), null, 2)}\n`;
}
