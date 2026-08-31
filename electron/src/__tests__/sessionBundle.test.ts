import { createSessionBundle, parseSessionBundle, serializeSessionBundle, SESSION_BUNDLE_SCHEMA } from '../renderer/lib/sessionBundle';
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
    expect(first.provenance.structure_hash).toMatch(/^fnv1a-32:[0-9a-f]{8}$/);
  });

  it('round-trips the molecule and source metadata', () => {
    const parsed = parseSessionBundle(serializeSessionBundle(molecule, null));
    expect(parsed.molecule).toEqual(molecule);
    expect(parsed.source.file_path).toBeNull();
  });

  it('rejects malformed or unrelated JSON', () => {
    expect(() => parseSessionBundle('{"hello":"world"}')).toThrow('Unsupported');
    expect(() => parseSessionBundle('{not json')).toThrow('valid JSON');
  });
});
