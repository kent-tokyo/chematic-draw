import * as wasmBridge from '../wasm/wasmBridge';
import { MoleculeDto } from '../store/types';

export type BatchOperation = 'convert' | 'standardize' | 'filter' | 'properties';

export interface BatchTask {
  operation: BatchOperation;
  inputFormat?: string; // 'smiles', 'mol', 'sdf'
  outputFormat?: string;
  filterOptions?: {
    minMW?: number;
    maxMW?: number;
    minLogP?: number;
    maxLogP?: number;
  };
  smartsPattern?: string;
}

export type BatchItemStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';

export interface BatchItemResult {
  index: number;
  status: BatchItemStatus;
  input: MoleculeDto;
  output?: MoleculeDto & Partial<{ properties: any }>;
  warnings: string[];
  error?: string;
}

export interface BatchProgress {
  completed: number;
  total: number;
  item: BatchItemResult;
}

export interface ProcessBatchOptions {
  signal?: AbortSignal;
  onProgress?: (progress: BatchProgress) => void;
}

export async function processBatch(
  molecules: MoleculeDto[],
  task: BatchTask,
  options: ProcessBatchOptions = {}
): Promise<ProcessResult> {
  const results: ProcessResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    molecules: [],
    errors: [],
    items: [],
    cancelled: false,
  };

  for (const [index, mol] of molecules.entries()) {
    if (options.signal?.aborted) {
      results.cancelled = true;
      results.items.push({ index, status: 'cancelled', input: mol, warnings: [] });
      continue;
    }

    const item: BatchItemResult = { index, status: 'running', input: mol, warnings: [] };
    results.items.push(item);
    options.onProgress?.({ completed: index, total: molecules.length, item });
    try {
      let processed: MoleculeDto & Partial<{ properties: any }> = mol;

      if (task.operation === 'standardize') {
        processed = wasmBridge.standardizeMolecule(mol);
      } else if (task.operation === 'convert') {
        // Format conversion handled at file I/O level
        processed = mol;
      } else if (task.operation === 'filter') {
        const props = wasmBridge.getProperties(mol);
        const passes =
          (!task.filterOptions?.minMW || props.molecular_weight >= task.filterOptions.minMW) &&
          (!task.filterOptions?.maxMW || props.molecular_weight <= task.filterOptions.maxMW) &&
          (!task.filterOptions?.minLogP || props.logp >= task.filterOptions.minLogP) &&
          (!task.filterOptions?.maxLogP || props.logp <= task.filterOptions.maxLogP);
        if (!passes) {
          results.skipped++;
          item.status = 'skipped';
          item.warnings.push('Did not match filter criteria.');
          options.onProgress?.({ completed: index + 1, total: molecules.length, item });
          continue;
        }
        processed = mol;
      } else if (task.operation === 'properties') {
        const props = wasmBridge.getProperties(mol);
        processed = {
          ...mol,
          properties: props,
        };
      }

      results.molecules.push(processed);
      results.processed++;
      item.status = 'succeeded';
      item.output = processed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.errors.push(message);
      results.failed++;
      item.status = 'failed';
      item.error = message;
    }
    options.onProgress?.({ completed: index + 1, total: molecules.length, item });
  }

  return results;
}

export interface ProcessResult {
  processed: number;
  failed: number;
  skipped: number;
  molecules: (MoleculeDto & Partial<{ properties: any }>)[];
  errors: string[];
  items: BatchItemResult[];
  cancelled: boolean;
}
