import { editMarkush, editPolymer, expandPolymer, selectMarkushSubstituent } from '../renderer/lib/specialChemistry';
import { QueryDocument } from '../renderer/lib/queryDocument';

const document: QueryDocument = {
  schema: 'chematic-draw/query-document', schema_version: 1,
  atoms: [
    { id: 1, x: 0, y: 0, constraint: { elements: ['C'] } },
    { id: 2, x: 1, y: 0, constraint: { elements: ['C'] } },
  ],
  bonds: [{ id: 1, from: 1, to: 2, constraint: { order: 'single' } }],
  markush: [{ id: 'r1', label: 'R', attachmentAtomIds: [1], allowedSubstituentSmarts: ['Cl', 'Br'] }],
  polymers: [{ id: 'p1', repeatUnitAtomIds: [1, 2], linkageBondIds: [1], attachmentAtomIds: [1, 2] }],
};

test('edits and selects Markush definitions without lossy concrete conversion', () => {
  const edited = editMarkush(document, 'r1', { label: 'R1' });
  expect(edited.markush?.[0].label).toBe('R1');
  expect(selectMarkushSubstituent(edited, 'r1', 'Cl')).toEqual({ definitionId: 'r1', substituentSmarts: 'Cl' });
  expect(() => selectMarkushSubstituent(edited, 'r1', 'N')).toThrow('not allowed');
});

test('edits polymer metadata and expands repeat units deterministically', () => {
  const edited = editPolymer(document, 'p1', { endGroups: { left: 'H', right: 'H' } });
  const expanded = expandPolymer(edited, 'p1', 3);
  expect(expanded.atoms).toHaveLength(6);
  expect(expanded.bonds).toHaveLength(5);
  expect(expanded.atoms.map((atom) => atom.id)).toEqual([1, 2, 3, 4, 5, 6]);
  expect(expanded.bonds.slice(-2).map((bond) => [bond.from, bond.to])).toEqual([[2, 3], [4, 5]]);
});
