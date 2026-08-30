import { processBatch } from '../renderer/lib/batch';
import * as wasmBridge from '../renderer/wasm/wasmBridge';

jest.mock('../renderer/wasm/wasmBridge');

const molecule = (id: number) => ({
  atoms: [{ id, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }],
  bonds: [],
});

describe('batch processing review results', () => {
  it('keeps deterministic per-item order and reports progress', async () => {
    const progress: string[] = [];
    const result = await processBatch([molecule(1), molecule(2)], { operation: 'convert' }, {
      onProgress: ({ completed, item }) => progress.push(`${completed}:${item.index}:${item.status}`),
    });

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.cancelled).toBe(false);
    expect(result.items.map((item) => item.status)).toEqual(['succeeded', 'succeeded']);
    expect(result.items.map((item) => item.index)).toEqual([0, 1]);
    expect(progress).toEqual(['0:0:running', '1:0:succeeded', '1:1:running', '2:1:succeeded']);
  });

  it('marks remaining items cancelled without hiding them', async () => {
    const controller = new AbortController();
    const result = await processBatch([molecule(1), molecule(2)], { operation: 'convert' }, {
      signal: controller.signal,
      onProgress: ({ completed }) => {
        if (completed === 1) controller.abort();
      },
    });

    expect(result.processed).toBe(1);
    expect(result.cancelled).toBe(true);
    expect(result.items.map((item) => item.status)).toEqual(['succeeded', 'cancelled']);
  });

  it('records filtered items as skipped with an explicit warning', async () => {
    (wasmBridge.getProperties as jest.Mock).mockReturnValue({ molecular_weight: 50, logp: 0 });
    const result = await processBatch([molecule(1)], { operation: 'filter', filterOptions: { minMW: 100 } });

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.items[0].status).toBe('skipped');
    expect(result.items[0].warnings).toEqual(['Did not match filter criteria.']);
  });
});
