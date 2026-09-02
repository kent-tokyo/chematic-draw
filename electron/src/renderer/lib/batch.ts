import * as wasmBridge from '../wasm/wasmBridge';
import { MoleculeDto, PropertiesDto } from '../store/types';
import { validateMoleculeDocument } from './documentCommands';

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
  output?: MoleculeDto & Partial<{ properties: PropertiesDto }>;
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
  /** Restrict processing to these original molecule indexes (for retries). */
  indices?: number[];
}

export function validateBatchTask(task: BatchTask): string[] {
  const errors: string[] = [];
  if (!task || !['convert', 'standardize', 'filter', 'properties'].includes(task.operation)) {
    return ['Unsupported batch operation'];
  }
  const filters = task.filterOptions;
  if (filters) {
    if (typeof filters !== 'object' || Array.isArray(filters)) {
      errors.push('filterOptions must be an object');
      return errors;
    }
    for (const [name, value] of Object.entries(filters)) {
      if (!['minMW', 'maxMW', 'minLogP', 'maxLogP'].includes(name)) {
        errors.push(`Unknown filter option: ${name}`);
        continue;
      }
      if (value !== undefined && !Number.isFinite(value)) errors.push(`${name} must be finite`);
    }
    if (filters.minMW !== undefined && filters.minMW < 0) errors.push('minMW must not be negative');
    if (filters.maxMW !== undefined && filters.maxMW < 0) errors.push('maxMW must not be negative');
    if (filters.minMW !== undefined && filters.maxMW !== undefined && filters.minMW > filters.maxMW) {
      errors.push('minMW must not exceed maxMW');
    }
    if (filters.minLogP !== undefined && filters.maxLogP !== undefined && filters.minLogP > filters.maxLogP) {
      errors.push('minLogP must not exceed maxLogP');
    }
  }
  if (task.smartsPattern !== undefined) {
    if (typeof task.smartsPattern !== 'string') {
      errors.push('smartsPattern must be a string');
    } else if (task.smartsPattern.trim().length === 0) {
      errors.push('smartsPattern must not be empty');
    } else if (task.smartsPattern.length > 10_000) {
      errors.push('smartsPattern exceeds the 10,000 character limit');
    }
  }
  for (const [name, value] of [['inputFormat', task.inputFormat], ['outputFormat', task.outputFormat]] as const) {
    if (value !== undefined && (typeof value !== 'string' || value.length === 0 || value.length > 64)) {
      errors.push(`${name} must be a non-empty string of at most 64 characters`);
    }
  }
  return errors;
}

export async function processBatch(
  molecules: MoleculeDto[],
  task: BatchTask,
  options: ProcessBatchOptions = {}
): Promise<ProcessResult> {
  const taskErrors = validateBatchTask(task);
  if (taskErrors.length > 0) throw new Error(`Invalid batch task: ${taskErrors.join('; ')}`);
  const results: ProcessResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    resultHash: '',
    molecules: [],
    errors: [],
    items: [],
    cancelled: false,
  };

  const entries = (options.indices ?? molecules.map((_, index) => index))
    .map((index) => [index, molecules[index]] as const)
    .filter((entry): entry is readonly [number, MoleculeDto] => entry[1] !== undefined);

  for (const [position, [index, mol]] of entries.entries()) {
    if (options.signal?.aborted) {
      results.cancelled = true;
      results.items.push({ index, status: 'cancelled', input: mol, warnings: [] });
      continue;
    }

    const item: BatchItemResult = { index, status: 'running', input: mol, warnings: [] };
    results.items.push(item);
    options.onProgress?.({ completed: position, total: entries.length, item });
    try {
      const inputErrors = validateMoleculeDocument(mol);
      if (inputErrors.length > 0) throw new Error(`Invalid molecule: ${inputErrors.join('; ')}`);
      let processed: MoleculeDto & Partial<{ properties: PropertiesDto }> = mol;

      if (task.operation === 'standardize') {
        processed = wasmBridge.standardizeMolecule(mol);
      } else if (task.operation === 'convert') {
        // Format conversion handled at file I/O level
        processed = mol;
      } else if (task.operation === 'filter') {
        const props = wasmBridge.getProperties(mol);
        const passes =
          (task.filterOptions?.minMW === undefined || props.molecular_weight >= task.filterOptions.minMW) &&
          (task.filterOptions?.maxMW === undefined || props.molecular_weight <= task.filterOptions.maxMW) &&
          (task.filterOptions?.minLogP === undefined || props.logp >= task.filterOptions.minLogP) &&
          (task.filterOptions?.maxLogP === undefined || props.logp <= task.filterOptions.maxLogP) &&
          (task.smartsPattern === undefined || wasmBridge.smarts(mol, task.smartsPattern).length > 0);
        if (!passes) {
          results.skipped++;
          item.status = 'skipped';
          item.warnings.push('Did not match filter criteria.');
          options.onProgress?.({ completed: position + 1, total: entries.length, item });
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
      results.errors.push(`Item ${index + 1}: ${message}`);
      results.failed++;
      item.status = 'failed';
      item.error = message;
    }
    options.onProgress?.({ completed: position + 1, total: entries.length, item });
  }

  results.resultHash = batchResultHash(task, results.items);
  return results;
}

/** Reprocess only failed items from a previous run, preserving original indexes. */
export function retryFailedBatchItems(
  molecules: MoleculeDto[],
  task: BatchTask,
  previous: ProcessResult,
  options: Omit<ProcessBatchOptions, 'indices'> = {}
): Promise<ProcessResult> {
  const indices = previous.items
    .filter((item) => item.status === 'failed')
    .map((item) => item.index);
  return processBatch(molecules, task, { ...options, indices });
}

export interface ProcessResult {
  processed: number;
  failed: number;
  skipped: number;
  resultHash: string;
  molecules: (MoleculeDto & Partial<{ properties: PropertiesDto }>)[];
  errors: string[];
  items: BatchItemResult[];
  cancelled: boolean;
}

function batchResultHash(task: BatchTask, items: BatchItemResult[]): string {
  const payload = stableJson({
    items: items.map(({ index, status, input, output, warnings, error }) => ({
      error: error ?? null, index, input, output: output ?? null, status, warnings,
    })),
    task,
  });
  let hash = 0x811c9dc5;
  for (const character of payload) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-32:${hash.toString(16).padStart(8, '0')}`;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
