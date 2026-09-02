import { runQueryInWorker } from '../renderer/lib/queryWorkerClient';

describe('query worker boundary', () => {
  it('transfers a query document and returns the WASM matcher result', async () => {
    const terminate = jest.fn();
    const worker = { terminate, onmessage: null as ((event: MessageEvent) => void) | null, onerror: null as ((event: ErrorEvent) => void) | null, postMessage: jest.fn() };
    (globalThis as unknown as { Worker: typeof Worker }).Worker = jest.fn(() => worker) as unknown as typeof Worker;
    const promise = runQueryInWorker({ schema: 'chematic-draw/query-document', schema_version: 1, atoms: [{ id: 1, x: 0, y: 0, constraint: { elements: ['O'] } }], bonds: [] }, { atoms: [], bonds: [] });
    const payload = worker.postMessage.mock.calls[0][0] as { id: string; query: unknown };
    worker.onmessage!({ data: { id: payload.id, pattern: 'O', matches: [3] } } as MessageEvent);
    await expect(promise).resolves.toEqual({ pattern: 'O', matches: [3] });
    expect(terminate).toHaveBeenCalled();
  });
});
