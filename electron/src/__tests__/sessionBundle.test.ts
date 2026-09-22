import { createSessionBundle, parseSessionBundle, serializeSessionBundle, MAX_SESSION_BUNDLE_TEXT_LENGTH, MAX_SESSION_SOURCE_PATH_LENGTH, SESSION_BUNDLE_SCHEMA, SESSION_BUNDLE_VERSION } from '../renderer/lib/sessionBundle';
import { MoleculeDto } from '../renderer/store/types';

const molecule: MoleculeDto = {
  atoms: [
    { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0, wildcard: false },
    { id: 1, element: 'O', x: 1.2, y: 0, charge: -1, atom_map: 0, isotope: 18 },
  ],
  bonds: [{ id: 0, from: 0, to: 1, order: 1, stereo: 0 }],
};

describe('session bundle', () => {
  it('creates a deterministic provenance manifest with a structure hash', () => {
    const first = createSessionBundle(molecule, '/tmp/example.mol');
    expect(first).toEqual(createSessionBundle(molecule, '/tmp/example.mol'));
    expect(first.schema).toBe(SESSION_BUNDLE_SCHEMA);
    expect(first.schema_version).toBe(SESSION_BUNDLE_VERSION);
    expect(first.app.engine).toBe('chematic 1.0.19');
    expect(first.provenance.structure_hash).toMatch(/^fnv1a-32:[0-9a-f]{8}$/);
  });

  it('round-trips the molecule and source metadata', () => {
    const parsed = parseSessionBundle(serializeSessionBundle(molecule, null));
    expect(parsed.document.molecule).toEqual(molecule);
    expect(parsed.source.file_path).toBeNull();
  });

  it('round-trips and hashes drawing annotations', () => {
    const annotated: MoleculeDto = {
      ...molecule,
      drawing: {
        texts: [{ id: 'text-1', x: 2, y: 3, text: 'heat' }],
        arrows: [{ id: 'arrow-1', x1: 0, y1: 0, x2: 20, y2: 0, kind: 'forward' }],
        brackets: [{ id: 'bracket-1', x1: -1, y1: -2, x2: 21, y2: 5 }],
      },
    };
    const serialized = serializeSessionBundle(annotated, null);
    expect(parseSessionBundle(serialized).document.molecule).toEqual(annotated);
    const tampered = JSON.parse(serialized);
    tampered.document.molecule.drawing.texts[0].text = 'cold';
    expect(() => parseSessionBundle(JSON.stringify(tampered))).toThrow(/hash/);
  });

  it('rejects malformed or unrelated JSON', () => {
    expect(() => parseSessionBundle('{"hello":"world"}')).toThrow('Unsupported');
    expect(() => parseSessionBundle('{not json')).toThrow('valid JSON');
  });

  it('rejects invalid input at the session export boundary', () => {
    expect(() => createSessionBundle({ atoms: [], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] }, null)).toThrow(/invalid molecule/);
    expect(() => createSessionBundle(molecule, 'x'.repeat(MAX_SESSION_SOURCE_PATH_LENGTH + 1))).toThrow(/source path/);
  });

  it('rejects an oversized bundle before JSON parsing', () => {
    expect(() => parseSessionBundle('x'.repeat(MAX_SESSION_BUNDLE_TEXT_LENGTH + 1))).toThrow(/character limit/);
  });

  it('rejects malformed metadata even when the molecule hash is valid', () => {
    const malformed = JSON.parse(serializeSessionBundle(molecule, null));
    malformed.source.file_path = 'x'.repeat(MAX_SESSION_SOURCE_PATH_LENGTH + 1);
    expect(() => parseSessionBundle(JSON.stringify(malformed))).toThrow(/molecule/);

    const missingOperation = JSON.parse(serializeSessionBundle(molecule, null));
    missingOperation.provenance.operation = 'import-session-bundle';
    expect(() => parseSessionBundle(JSON.stringify(missingOperation))).toThrow(/molecule/);
  });

  it('migrates a v1 bundle into the current document envelope', () => {
    const legacy = createSessionBundle(molecule, '/tmp/legacy.mol') as unknown as Record<string, unknown>;
    const v1 = { ...legacy, schema_version: 1, molecule, document: undefined };
    delete v1.document;
    const migrated = parseSessionBundle(JSON.stringify(v1));
    expect(migrated.schema_version).toBe(SESSION_BUNDLE_VERSION);
    expect(migrated.document.molecule).toEqual(molecule);
    expect(migrated.source.file_path).toBe('/tmp/legacy.mol');
  });

  it('normalizes legacy engine metadata during v1 migration', () => {
    const legacy = { schema: SESSION_BUNDLE_SCHEMA, schema_version: 1, app: { name: 'chematic-draw', engine: 'chematic 0.20.1' }, molecule };
    const migrated = parseSessionBundle(JSON.stringify(legacy));
    expect(migrated.app).toEqual({ name: 'chematic-draw', engine: 'chematic 1.0.19' });
  });

  it('opens a v2 bundle from the previous engine and normalizes its metadata', () => {
    const legacy = JSON.parse(serializeSessionBundle(molecule, null));
    legacy.app.engine = 'chematic 1.0.12';
    const migrated = parseSessionBundle(JSON.stringify(legacy));
    expect(migrated.app).toEqual({ name: 'chematic-draw', engine: 'chematic 1.0.19' });
  });

  it('rejects a tampered molecule rather than trusting the stored hash', () => {
    const tampered = JSON.parse(serializeSessionBundle(molecule, null));
    tampered.document.molecule.atoms[0].element = 'N';
    expect(() => parseSessionBundle(JSON.stringify(tampered))).toThrow(/hash/);
  });

  it('rejects bundles claiming a different application or engine', () => {
    const tampered = JSON.parse(serializeSessionBundle(molecule, null));
    tampered.app = { name: 'other-app', engine: 'other-engine' };
    expect(() => parseSessionBundle(JSON.stringify(tampered))).toThrow(/molecule/);
  });
});
