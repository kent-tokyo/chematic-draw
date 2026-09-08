import { parseQueryDocument, queryDocumentFromMolecule, queryDocumentToMolecule, queryDocumentToSmarts, serializeQueryDocument, validateQueryDocument } from '../renderer/lib/queryDocument';

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

  it('writes a deterministic SMARTS subset and rejects disconnected queries', () => {
    const query = queryDocumentFromMolecule({ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] });
    expect(queryDocumentToSmarts(query)).toBe('C-O');
    query.bonds = [];
    expect(() => queryDocumentToSmarts(query)).toThrow(/linear/);
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

  it('rejects nucleic-acid residues with unknown atom references', () => {
    const query = { ...queryDocumentFromMolecule(molecule), nucleicAcids: [{ id: 'na-1', residueIds: ['res-1'], backboneBondIds: [], residues: [{ id: 'res-1', base: 'A' as const, sugar: 'ribose' as const, atomIds: [99] }] }] };
    expect(validateQueryDocument(query)).toEqual([expect.objectContaining({ path: 'nucleicAcids.0.residues.0' })]);
  });
});
