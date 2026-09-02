import { conformanceFixture, htmlConsumer, reactConsumerProps, workerConsumer } from '../../../packages/chematic-contract/conformance/consumers';

test('HTML, React and Worker consumers observe one dependency-free contract', () => {
  const query = { schema: 'chematic-draw/query-document' as const, schema_version: 1 as const, atoms: [], bonds: [] };
  expect(htmlConsumer(conformanceFixture)).toEqual([]);
  expect(reactConsumerProps(query)).toEqual({ schema: 'chematic-draw/query-document', atomCount: 0 });
  expect(workerConsumer(conformanceFixture)).toEqual({ ok: true, errors: [] });
});
