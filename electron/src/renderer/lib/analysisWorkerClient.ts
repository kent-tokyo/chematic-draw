import type { MoleculeDto } from '../store/types';
import type { AnalysisOperation } from '../workers/analysisWorker';

const ANALYSIS_WORKER_TIMEOUT_MS = 10_000;
let nextId = 0;

interface AnalysisWorkerResponse { id: string; operation?: AnalysisOperation; value?: unknown; error?: string; }

export function runAnalysisInWorker(operation: AnalysisOperation, molecule: MoleculeDto | undefined, signal?: AbortSignal, comparison?: MoleculeDto, text?: string): Promise<unknown> {
  // Keep the source URL explicit so Vite can transform the worker in the
  // renderer dev server and in the packaged renderer alike.
  const worker = new Worker(new URL('/src/renderer/workers/analysisWorker.ts', document.baseURI), { type: 'module' });
  const id = `analysis-${++nextId}`;
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => { worker.terminate(); window.clearTimeout(timeoutId); signal?.removeEventListener('abort', onAbort); };
    const fail = (error: Error) => { if (settled) return; settled = true; cleanup(); reject(error); };
    const succeed = (value: unknown) => { if (settled) return; settled = true; cleanup(); resolve(value); };
    const onAbort = () => fail(new Error('Analysis worker aborted'));
    const timeoutId = window.setTimeout(() => fail(new Error('Analysis worker timed out')), ANALYSIS_WORKER_TIMEOUT_MS);
    worker.onmessage = ({ data }: MessageEvent<AnalysisWorkerResponse>) => {
      if (data.id !== id) return;
      if (data.error) fail(new Error(data.error));
      else succeed(data.value);
    };
    worker.onerror = (event) => fail(new Error(event.message || 'Analysis worker failed'));
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
    worker.postMessage({ id, operation, ...(molecule ? { molecule } : {}), ...(comparison ? { comparison } : {}), ...(text !== undefined ? { text } : {}) });
  });
}
