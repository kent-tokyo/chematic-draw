import { createSessionBundle, parseSessionBundle, serializeSessionBundle, MAX_SESSION_BUNDLE_TEXT_LENGTH, SESSION_BUNDLE_SCHEMA, SESSION_BUNDLE_VERSION } from '../renderer/lib/sessionBundle';
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
    expect(first.provenance.structure_hash).toMatch(/^fnv1a-32:[0-9a-f]{8}$/);
  });

  it('round-trips the molecule and source metadata', () => {
    const parsed = parseSessionBundle(serializeSessionBundle(molecule, null));
    expect(parsed.document.molecule).toEqual(molecule);
    expect(parsed.source.file_path).toBeNull();
  });

  it('rejects malformed or unrelated JSON', () => {
    expect(() => parseSessionBundle('{"hello":"world"}')).toThrow('Unsupported');
    expect(() => parseSessionBundle('{not json')).toThrow('valid JSON');
  });

  it('rejects an oversized bundle before JSON parsing', () => {
    expect(() => parseSessionBundle('x'.repeat(MAX_SESSION_BUNDLE_TEXT_LENGTH + 1))).toThrow(/character limit/);
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

  it('rejects a tampered molecule rather than trusting the stored hash', () => {
    const tampered = JSON.parse(serializeSessionBundle(molecule, null));
    tampered.document.molecule.atoms[0].element = 'N';
    expect(() => parseSessionBundle(JSON.stringify(tampered))).toThrow(/hash/);
  });
});
