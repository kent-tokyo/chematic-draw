import { MoleculeDto } from '../store/types';
import { QueryDocument } from './queryDocument';

export interface QueryWorkerResult { pattern: string; matches: number[]; }

/** Worker-first query execution. The query document is cloned by postMessage,
 * so callers cannot accidentally share mutable editor state with WASM. */
export function runQueryInWorker(query: QueryDocument, molecule: MoleculeDto): Promise<QueryWorkerResult> {
  return new Promise((resolve, reject) => {
    // Resolve against the document URL so this module remains consumable by
    // Jest/CommonJS as well as Vite's browser bundle (import.meta is not
    // available in the unit-test transform used by this project).
    const workerUrl = new URL('/src/renderer/workers/queryWorker.ts', document.baseURI);
    const worker = new Worker(workerUrl, { type: 'module' });
    const id = `query-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cleanup = () => worker.terminate();
    worker.onmessage = (event: MessageEvent<{ id: string; pattern?: string; matches?: number[]; error?: string }>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve({ pattern: event.data.pattern ?? '', matches: event.data.matches ?? [] });
    };
    worker.onerror = (event) => { cleanup(); reject(new Error(event.message || 'Query worker failed')); };
    worker.postMessage({ id, query, molecule });
  });
}
