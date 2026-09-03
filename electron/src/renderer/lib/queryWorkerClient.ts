import { MoleculeDto } from '../store/types';
import { QueryDocument } from './queryDocument';
export type { QueryWorkerResult } from '../../../../packages/chematic-contract/src/index';
import type { QueryWorkerResult } from '../../../../packages/chematic-contract/src/index';

const QUERY_WORKER_TIMEOUT_MS = 15_000;

/** Worker-first query execution. The query document is cloned by postMessage,
 * so callers cannot accidentally share mutable editor state with WASM. */
export function runQueryInWorker(query: QueryDocument, molecule: MoleculeDto, signal?: AbortSignal): Promise<QueryWorkerResult> {
  return new Promise((resolve, reject) => {
    // Resolve against the document URL so this module remains consumable by
    // Jest/CommonJS as well as Vite's browser bundle (import.meta is not
    // available in the unit-test transform used by this project).
    const workerUrl = new URL('/src/renderer/workers/queryWorker.ts', document.baseURI);
    const worker = new Worker(workerUrl, { type: 'module' });
    const id = `query-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let settled = false;
    let removeAbortListener = () => {};
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      removeAbortListener();
      worker.terminate();
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    worker.onmessage = (event: MessageEvent<{ id: string; pattern?: string; matches?: number[]; error?: string }>) => {
      if (event.data.id !== id) return;
      if (settled) return;
      settled = true;
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve({ pattern: event.data.pattern ?? '', matches: event.data.matches ?? [] });
    };
    worker.onerror = (event) => fail(new Error(event.message || 'Query worker failed'));
    const timeoutId = window.setTimeout(() => fail(new Error('Query worker timed out')), QUERY_WORKER_TIMEOUT_MS);
    if (signal) {
      const handleAbort = () => fail(new Error('Query worker aborted'));
      signal.addEventListener('abort', handleAbort, { once: true });
      removeAbortListener = () => signal.removeEventListener('abort', handleAbort);
      if (signal.aborted) handleAbort();
    }
    if (settled) return;
    try {
      worker.postMessage({ id, query, molecule });
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
