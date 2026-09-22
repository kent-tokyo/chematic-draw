import { parseQueryDocument, queryDocumentFromMolecule, queryDocumentToMolecule, queryDocumentToSmarts, serializeQueryDocument, validateQueryDocument, type QueryDocument } from '../renderer/lib/queryDocument';

const molecule = { atoms: [{ id: 1, element: 'N', x: 0, y: 0, charge: 1, atom_map: 0, isotope: 15, hydrogen_count: 1 }], bonds: [] };

describe('query document contract', () => {
  it('round-trips concrete atoms and preserves explicit constraints', () => {
    const query = queryDocumentFromMolecule(molecule);
    expect(validateQueryDocument(query)).toEqual([]);
    expect(queryDocumentToMolecule(query)).toEqual(molecule);
  });

  it('rejects broad query constraints instead of converting them to carbon', () => {
    const query = queryDocumentFromMolecule(molecule);
    query.atoms[0].constraint.elements = ['N', 'O'];
    expect(() => queryDocumentToMolecule(query)).toThrow(/cannot be represented/);
  });

  it('retains Markush/polymer as opaque and blocks concrete export', () => {
    const query = { ...queryDocumentFromMolecule(molecule), opaque: [{ kind: 'markush' as const, raw: 'R1' }] };
    expect(validateQueryDocument(query)).toEqual([]);
    expect(() => queryDocumentToMolecule(query)).toThrow(/Markush\/polymer/);
  });

  it('validates typed Markush and polymer references', () => {
    const query = { ...queryDocumentFromMolecule(molecule), markush: [{ id: 'R1', label: 'R', attachmentAtomIds: [1], allowedSubstituentSmarts: ['C', 'N'] }], polymers: [{ id: 'poly-1', repeatUnitAtomIds: [1], linkageBondIds: [], attachmentAtomIds: [1] }] };
    expect(validateQueryDocument(query)).toEqual([]);
    expect(() => queryDocumentToMolecule(query)).toThrow(/Markush\/polymer/);
  });

  it('writes a deterministic SMARTS subset and rejects disconnected components', () => {
    const query = queryDocumentFromMolecule({ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] });
    expect(queryDocumentToSmarts(query)).toBe('C-O');
    query.bonds = [];
    expect(() => queryDocumentToSmarts(query)).toThrow(/disconnected components/);
  });

  it('writes deterministic branch and ring closures instead of rejecting non-linear queries', () => {
    const branched = queryDocumentFromMolecule({
      atoms: [
        { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 3, element: 'N', x: -1, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 1, from: 1, to: 2, order: 1, stereo: 0 },
        { id: 2, from: 1, to: 3, order: 1, stereo: 0 },
      ],
    });
    expect(queryDocumentToSmarts(branched)).toBe('C(-O)-N');

    const ring = queryDocumentFromMolecule({
      atoms: [
        { id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 3, element: 'C', x: 0, y: 1, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 1, from: 1, to: 2, order: 1, stereo: 0 },
        { id: 2, from: 2, to: 3, order: 1, stereo: 0 },
        { id: 3, from: 3, to: 1, order: 1, stereo: 0 },
      ],
    });
    expect(queryDocumentToSmarts(ring)).toBe('C1-C-C1');
  });

  it('preserves compound atom constraints in SMARTS output', () => {
    const query = queryDocumentFromMolecule(molecule);
    query.atoms[0].constraint = {
      elements: ['C', 'N'],
      aromatic: true,
      isotope: 15,
      valence: 3,
      ring: true,
      charge: 1,
      hydrogens: 1,
    };
    expect(queryDocumentToSmarts(query)).toBe('[C,N;a;i15;+1;H1;v3;R]');
  });

  it('round-trips typed Markush/polymer data without concrete conversion', () => {
    const query = {
      ...queryDocumentFromMolecule({ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, { id: 2, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] }),
      opaque: [{ kind: 'smarts-token' as const, raw: '$([#6]-[*])' }],
      markush: [{ id: 'R1', label: 'R', attachmentAtomIds: [1], allowedSubstituentSmarts: ['Cl', 'c1ccccc1'] }],
      polymers: [{ id: 'poly-1', repeatUnitAtomIds: [1, 2], linkageBondIds: [1], attachmentAtomIds: [1, 2], endGroups: { left: 'H', right: 'OH' } }],
      nucleicAcids: [{ id: 'na-1', residueIds: ['res-1'], backboneBondIds: [1], residues: [{ id: 'res-1', base: 'A' as const, sugar: 'deoxyribose' as const, atomIds: [1] }] }],
    };
    const restored = parseQueryDocument(serializeQueryDocument(query));
    expect(restored).toEqual(query);
    expect(() => queryDocumentToMolecule(restored!)).toThrow(/Markush\/polymer/);
  });

  it('rejects malformed or oversized query JSON instead of dropping special chemistry', () => {
    expect(parseQueryDocument('{"schema":"chematic-draw/query-document"}')).toBeNull();
    expect(parseQueryDocument('x'.repeat(5_000_001))).toBeNull();
    expect(() => serializeQueryDocument({ ...queryDocumentFromMolecule(molecule), markush: [{ id: 'R', label: 'R', attachmentAtomIds: [99], allowedSubstituentSmarts: ['C'] }] })).toThrow(/cannot be serialized/);
  });

  it('returns a structured validation error for non-array roots', () => {
    const malformed = { ...queryDocumentFromMolecule(molecule), atoms: null, bonds: {} } as never;
    expect(validateQueryDocument(malformed)).toEqual([expect.objectContaining({ path: 'atoms' })]);
  });

  it('rejects nucleic-acid residues with unknown atom references', () => {
    const query = { ...queryDocumentFromMolecule(molecule), nucleicAcids: [{ id: 'na-1', residueIds: ['res-1'], backboneBondIds: [], residues: [{ id: 'res-1', base: 'A' as const, sugar: 'ribose' as const, atomIds: [99] }] }] };
    expect(validateQueryDocument(query)).toEqual([expect.objectContaining({ path: 'nucleicAcids.0.residues.0' })]);
  });

  it('returns structured errors instead of throwing for null nested query nodes', () => {
    const malformed = {
      ...queryDocumentFromMolecule(molecule),
      atoms: [null],
      bonds: [null],
      opaque: [null],
      markush: [null],
      polymers: [null],
      nucleicAcids: [null],
    } as unknown as QueryDocument;
    expect(() => validateQueryDocument(malformed)).not.toThrow();
    expect(validateQueryDocument(malformed).map((error) => error.path)).toEqual(expect.arrayContaining([
      'atoms.unknown', 'bonds.unknown', 'opaque.0', 'markush.0', 'polymers.0', 'nucleicAcids.0',
    ]));
  });
});
