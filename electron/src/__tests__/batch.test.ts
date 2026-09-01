import { processBatch, validateBatchTask } from '../renderer/lib/batch';
import * as wasmBridge from '../renderer/wasm/wasmBridge';

jest.mock('../renderer/wasm/wasmBridge');

const molecule = (id: number) => ({
  atoms: [{ id, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }],
  bonds: [],
});

describe('batch processing review results', () => {
  it('rejects invalid filter ranges before processing', async () => {
    expect(validateBatchTask({ operation: 'filter', filterOptions: { minMW: 200, maxMW: 100 } })).toEqual(['minMW must not exceed maxMW']);
    await expect(processBatch([molecule(1)], { operation: 'filter', filterOptions: { minMW: 200, maxMW: 100 } }))
      .rejects.toThrow(/Invalid batch task/);
  });

  it('rejects unknown filter options instead of silently ignoring them', () => {
    expect(validateBatchTask({
      operation: 'filter',
      filterOptions: { minMW: 0, unexpected: 1 } as never,
    })).toEqual(['Unknown filter option: unexpected']);
  });

  it('rejects malformed SMARTS and format metadata', () => {
    expect(validateBatchTask({
      operation: 'convert',
      smartsPattern: 42 as never,
      inputFormat: '' ,
      outputFormat: 'x'.repeat(65),
    })).toEqual([
      'smartsPattern must be a string',
      'inputFormat must be a non-empty string of at most 64 characters',
      'outputFormat must be a non-empty string of at most 64 characters',
    ]);
  });

  it('rejects non-object filter options', () => {
    expect(validateBatchTask({ operation: 'filter', filterOptions: [] as never }))
      .toEqual(['filterOptions must be an object']);
  });

  it('records invalid molecules as failed items before invoking the engine', async () => {
    const invalid = { ...molecule(1), atoms: [{ ...molecule(1).atoms[0], charge: 0.5 }] };
    const result = await processBatch([invalid], { operation: 'standardize' });

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.items[0]).toMatchObject({ status: 'failed', error: expect.stringMatching(/Invalid molecule/) });
    expect(result.molecules).toHaveLength(0);
  });

  it('identifies the item in aggregated errors when multiple items fail', async () => {
    const invalid = { ...molecule(1), atoms: [{ ...molecule(1).atoms[0], charge: 0.5 }] };
    const result = await processBatch([molecule(1), invalid], { operation: 'standardize' });

    expect(result.errors).toEqual([expect.stringMatching(/^Item 2: Invalid molecule:/)]);
  });

  it('keeps deterministic per-item order and reports progress', async () => {
    const progress: string[] = [];
    const result = await processBatch([molecule(1), molecule(2)], { operation: 'convert' }, {
      onProgress: ({ completed, item }) => progress.push(`${completed}:${item.index}:${item.status}`),
    });

    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.cancelled).toBe(false);
    expect(result.items.map((item) => item.status)).toEqual(['succeeded', 'succeeded']);
    expect(result.items.map((item) => item.index)).toEqual([0, 1]);
    expect(result.resultHash).toMatch(/^fnv1a-32:[0-9a-f]{8}$/);
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
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.items[0].status).toBe('skipped');
    expect(result.items[0].warnings).toEqual(['Did not match filter criteria.']);
  });

  it('applies a SMARTS filter and skips molecules without a match', async () => {
    (wasmBridge.getProperties as jest.Mock).mockReturnValue({ molecular_weight: 50, logp: 0 });
    (wasmBridge.smarts as jest.Mock).mockReturnValue([]);
    const result = await processBatch([molecule(1)], { operation: 'filter', smartsPattern: '[N]' });

    expect(wasmBridge.smarts).toHaveBeenCalledWith(expect.anything(), '[N]');
    expect(result.skipped).toBe(1);
    expect(result.items[0].status).toBe('skipped');
  });

  it('honors zero-valued filter boundaries', async () => {
    (wasmBridge.getProperties as jest.Mock).mockReturnValue({ molecular_weight: 0, logp: 0 });
    const result = await processBatch([molecule(1)], {
      operation: 'filter',
      filterOptions: { maxMW: 0, minLogP: 0 },
    });

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.items[0].status).toBe('succeeded');
  });

  it('applies LogP filter boundaries', async () => {
    (wasmBridge.getProperties as jest.Mock).mockReturnValue({ molecular_weight: 50, logp: 2.5 });
    const result = await processBatch([molecule(1)], {
      operation: 'filter', filterOptions: { minLogP: 2, maxLogP: 3 },
    });

    expect(result.processed).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('produces the same result hash for the same task and inputs', async () => {
    const first = await processBatch([molecule(1)], { operation: 'convert' });
    const second = await processBatch([molecule(1)], { operation: 'convert' });
    expect(second.resultHash).toBe(first.resultHash);
  });

  it('normalizes task key order before hashing a result', async () => {
    (wasmBridge.getProperties as jest.Mock).mockReturnValue({ molecular_weight: 50, logp: 0 });
    const first = await processBatch([molecule(1)], { operation: 'filter', filterOptions: { minMW: 0, maxMW: 100 } });
    const second = await processBatch([molecule(1)], { filterOptions: { maxMW: 100, minMW: 0 }, operation: 'filter' });
    expect(second.resultHash).toBe(first.resultHash);
  });
});
