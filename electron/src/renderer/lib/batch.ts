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

export async function processBatch(molecules: MoleculeDto[], task: BatchTask): Promise<ProcessResult> {
  const results: ProcessResult = {
    processed: 0,
    failed: 0,
    molecules: [],
    errors: [],
  };

  for (const mol of molecules) {
    try {
      let processed = mol;

      if (task.operation === 'standardize') {
        processed = wasmBridge.standardizeMolecule(mol);
      } else if (task.operation === 'convert') {
        // Format conversion handled at file I/O level
        processed = mol;
      } else if (task.operation === 'filter') {
        const props = wasmBridge.getProperties(mol);
        const passes =
          (!task.filterOptions?.minMW || props.mw >= task.filterOptions.minMW) &&
          (!task.filterOptions?.maxMW || props.mw <= task.filterOptions.maxMW) &&
          (!task.filterOptions?.minLogP || props.logp >= task.filterOptions.minLogP) &&
          (!task.filterOptions?.maxLogP || props.logp <= task.filterOptions.maxLogP);
        if (!passes) {
          results.failed++;
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
    } catch (err) {
      results.errors.push((err as Error).message);
      results.failed++;
    }
  }

  return results;
}

export interface ProcessResult {
  processed: number;
  failed: number;
  molecules: (MoleculeDto & Partial<{ properties: any }>)[];
  errors: string[];
}
