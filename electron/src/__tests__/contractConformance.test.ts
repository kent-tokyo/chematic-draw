import { conformanceFixture, contractSurfaceFixture, htmlConsumer, reactConsumerProps, uiConsumerConformance, workerConsumer } from '../../../packages/chematic-contract/conformance/consumers';

test('HTML, React and Worker consumers observe one dependency-free contract', () => {
  const query = { schema: 'chematic-draw/query-document' as const, schema_version: 1 as const, atoms: [], bonds: [] };
  expect(htmlConsumer(conformanceFixture)).toEqual([]);
  expect(reactConsumerProps(query)).toEqual({ schema: 'chematic-draw/query-document', atomCount: 0 });
  expect(workerConsumer(conformanceFixture)).toEqual({ ok: true, errors: [] });
});

test('shared contract surface executes across UI consumers at runtime', () => {
  expect(uiConsumerConformance(contractSurfaceFixture.action)).toEqual({ html: 'showShortcuts', react: 'showShortcuts', worker: 'showShortcuts' });
  expect(contractSurfaceFixture.query.schema).toBe('chematic-draw/query-document');
  expect(contractSurfaceFixture.session.schema_version).toBe(2);
  expect(contractSurfaceFixture.batch.items).toEqual([]);
});

test('HTML and Worker consumers reject malformed molecule boundaries', () => {
  const malformed = { atoms: [{ id: 1, element: 'C', x: Number.NaN, y: 0 }], bonds: [] } as never;
  const danglingBond = { atoms: [{ id: 1, element: 'C', x: 0, y: 0 }], bonds: [{ id: 2, from: 1, to: 9, order: 1, stereo: 0 }] } as never;
  expect(htmlConsumer(malformed)).toEqual(['Invalid atom: 1']);
  expect(workerConsumer(malformed)).toEqual({ ok: false, errors: ['Invalid atom: 1'] });
  expect(htmlConsumer(danglingBond)).toEqual(['Invalid bond: 2']);
  expect(workerConsumer(danglingBond)).toEqual({ ok: false, errors: ['Invalid bond: 2'] });
});
