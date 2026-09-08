import type { MoleculeWorkerMessage, MoleculeWorkerMessageResponse, MoleculeWorkerRequest } from './worker';

export interface MoleculeWorkerLike {
  postMessage(message: MoleculeWorkerMessage): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<MoleculeWorkerMessageResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

export interface MoleculeWorkerClient {
  request(request: MoleculeWorkerRequest, signal?: AbortSignal): Promise<string>;
  dispose(): void;
}

let nextRequestId = 0;

/** Lifecycle-safe client for a browser Worker running the molecule protocol. */
export function createMoleculeWorkerClient(worker: MoleculeWorkerLike, timeoutMs = 10_000): MoleculeWorkerClient {
  const pending = new Map<string, { resolve: (value: string) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout>; signal?: AbortSignal; onAbort?: () => void }>();
  let disposed = false;

  const settle = (id: string, callback: (entry: (typeof pending extends Map<string, infer V> ? V : never)) => void) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    if (entry.signal && entry.onAbort) entry.signal.removeEventListener('abort', entry.onAbort);
    callback(entry);
  };

  worker.onmessage = ({ data }) => settle(data.id, (entry) => {
    if ('value' in data) entry.resolve(data.value);
    else entry.reject(new Error(data.error));
  });
  worker.onerror = (event) => {
    const error = new Error(event.message || 'Molecule worker failed');
    for (const id of [...pending.keys()]) settle(id, (entry) => entry.reject(error));
  };

  return {
    request(request, signal) {
      if (disposed) return Promise.reject(new Error('Molecule worker client is disposed'));
      if (signal?.aborted) return Promise.reject(new Error('Molecule worker request aborted'));
      const id = `molecule-${++nextRequestId}`;
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => settle(id, (entry) => entry.reject(new Error('Molecule worker timed out'))), timeoutMs);
        const onAbort = () => settle(id, (entry) => entry.reject(new Error('Molecule worker request aborted')));
        pending.set(id, { resolve, reject, timer, signal, onAbort });
        signal?.addEventListener('abort', onAbort, { once: true });
        worker.postMessage({ id, ...request });
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const error = new Error('Molecule worker client is disposed');
      for (const id of [...pending.keys()]) settle(id, (entry) => entry.reject(error));
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    },
  };
}
