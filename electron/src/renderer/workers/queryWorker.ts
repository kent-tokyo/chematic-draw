import initWasm, { smarts_search } from '../wasm/pkg/chem_wasm';
import { QueryDocument, queryDocumentToSmarts, validateQueryDocument } from '../lib/queryDocument';
import { MoleculeDto } from '../store/types';

interface QueryTask { id: string; query?: QueryDocument; pattern?: string; molecule: MoleculeDto; }

let ready: Promise<unknown> | null = null;
function ensureReady(): Promise<unknown> {
  ready ??= initWasm(new URL('../wasm/pkg/chem_wasm_bg.wasm', import.meta.url));
  return ready;
}

self.onmessage = (event: MessageEvent<QueryTask>) => {
  void (async () => {
    try {
      const { id, query, molecule } = event.data;
      const pattern = event.data.pattern ?? (() => {
        if (!query) throw new Error('Query document or SMARTS pattern is required');
        const errors = validateQueryDocument(query);
        if (errors.length) throw new Error(errors.map((error) => `${error.path}: ${error.message}`).join('; '));
        return queryDocumentToSmarts(query);
      })();
      if (!pattern) throw new Error('Query must contain at least one atom');
      if (pattern.length > 100_000) throw new Error('SMARTS pattern is too long');
      await ensureReady();
      const matches = Array.from(smarts_search(molecule, pattern));
      self.postMessage({ id, pattern, matches });
    } catch (error) {
      self.postMessage({ id: event.data?.id, error: error instanceof Error ? error.message : String(error) });
    }
  })();
};

export {};
