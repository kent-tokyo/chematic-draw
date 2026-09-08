import { runAnalysisInWorker } from '../renderer/lib/analysisWorkerClient';

describe('analysis worker client', () => {
  afterEach(() => jest.restoreAllMocks());

  it('dispatches a WASM analysis request and resolves its result', async () => {
    const worker = { terminate: jest.fn(), postMessage: jest.fn(), onmessage: null, onerror: null };
    (globalThis as unknown as { Worker: typeof Worker }).Worker = jest.fn(() => worker) as unknown as typeof Worker;
    const promise = runAnalysisInWorker('properties', { atoms: [], bonds: [] });
    const task = worker.postMessage.mock.calls[0][0] as { id: string; operation: string };
    worker.onmessage!({ data: { id: task.id, operation: task.operation, value: { molecular_weight: 0 } } } as MessageEvent);
    await expect(promise).resolves.toEqual({ molecular_weight: 0 });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('rejects an analysis error and aborts before posting', async () => {
    const worker = { terminate: jest.fn(), postMessage: jest.fn(), onmessage: null, onerror: null };
    (globalThis as unknown as { Worker: typeof Worker }).Worker = jest.fn(() => worker) as unknown as typeof Worker;
    const promise = runAnalysisInWorker('fingerprint', { atoms: [], bonds: [] });
    const task = worker.postMessage.mock.calls[0][0] as { id: string };
    worker.onmessage!({ data: { id: task.id, error: 'WASM analysis failed' } } as MessageEvent);
    await expect(promise).rejects.toThrow('WASM analysis failed');

    const controller = new AbortController();
    controller.abort();
    await expect(runAnalysisInWorker('properties', { atoms: [], bonds: [] }, controller.signal)).rejects.toThrow('aborted');
  });

  it('sends a second molecule for the MCS operation', async () => {
    const worker = { terminate: jest.fn(), postMessage: jest.fn(), onmessage: null, onerror: null };
    (globalThis as unknown as { Worker: typeof Worker }).Worker = jest.fn(() => worker) as unknown as typeof Worker;
    const molecule = { atoms: [], bonds: [] };
    const promise = runAnalysisInWorker('mcs', molecule, undefined, molecule);
    const task = worker.postMessage.mock.calls[0][0] as { id: string; comparison: unknown };
    expect(task.comparison).toEqual(molecule);
    worker.onmessage!({ data: { id: task.id, value: { similarity: 1 } } } as MessageEvent);
    await expect(promise).resolves.toEqual({ similarity: 1 });
  });

  it('sends text without fabricating a molecule for parse', async () => {
    const worker = { terminate: jest.fn(), postMessage: jest.fn(), onmessage: null, onerror: null };
    (globalThis as unknown as { Worker: typeof Worker }).Worker = jest.fn(() => worker) as unknown as typeof Worker;
    const promise = runAnalysisInWorker('parse', undefined, undefined, undefined, 'CCO');
    const task = worker.postMessage.mock.calls[0][0] as { id: string; text: string; molecule?: unknown };
    expect(task.text).toBe('CCO');
    expect(task.molecule).toBeUndefined();
    worker.onmessage!({ data: { id: task.id, value: { atoms: [], bonds: [] } } } as MessageEvent);
    await expect(promise).resolves.toEqual({ atoms: [], bonds: [] });
  });
});
