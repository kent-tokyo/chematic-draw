import initWasm, { smarts_search } from '../wasm/pkg/chem_wasm';
import { QueryDocument, queryDocumentToSmarts, validateQueryDocument } from '../lib/queryDocument';
import { MoleculeDto } from '../store/types';

interface QueryTask { id: string; query: QueryDocument; molecule: MoleculeDto; }

let ready: Promise<unknown> | null = null;
function ensureReady(): Promise<unknown> {
  ready ??= initWasm(new URL('../wasm/pkg/chem_wasm_bg.wasm', import.meta.url));
  return ready;
}

self.onmessage = (event: MessageEvent<QueryTask>) => {
  void (async () => {
    try {
      const { id, query, molecule } = event.data;
      const errors = validateQueryDocument(query);
      if (errors.length) throw new Error(errors.map((error) => `${error.path}: ${error.message}`).join('; '));
      const pattern = queryDocumentToSmarts(query);
      if (!pattern) throw new Error('Query must contain at least one atom');
      await ensureReady();
      const matches = Array.from(smarts_search(molecule, pattern));
      self.postMessage({ id, pattern, matches });
    } catch (error) {
      self.postMessage({ id: event.data?.id, error: error instanceof Error ? error.message : String(error) });
    }
  })();
};

export {};
