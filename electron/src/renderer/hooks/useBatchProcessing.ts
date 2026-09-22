import { useCallback } from 'react';
import { BatchConfig } from '../components/modals/BatchProcessDialog';
import { BatchResultSummary, useUIStore } from '../store/uiStore';
import { MoleculeDto } from '../store/types';
import * as batchLib from '../lib/batch';
import { ENGINE_ID } from '../../engineMetadata';

type AddBatchResult = ReturnType<typeof useUIStore.getState>['addBatchResult'];

interface UseBatchProcessingOptions {
  molecule: MoleculeDto;
  setMolecule: (molecule: MoleculeDto) => void;
  pushUndo: () => void;
  setStatus: (message: string) => void;
  addBatchResult: AddBatchResult;
  hideBatchModal: () => void;
}

function batchItems(result: Awaited<ReturnType<typeof batchLib.processBatch>>) {
  return result.items.map(({ index, status, warnings, error, input, output }) => ({
    index,
    status: status === 'succeeded' || status === 'failed' || status === 'skipped' || status === 'cancelled' ? status : 'cancelled',
    warnings,
    error,
    inputAtomCount: input.atoms.length,
    inputBondCount: input.bonds.length,
    outputAtomCount: output?.atoms.length,
    outputBondCount: output?.bonds.length,
    properties: output?.properties && {
      formula: output.properties.formula,
      molecular_weight: output.properties.molecular_weight,
      logp: output.properties.logp,
      tpsa: output.properties.tpsa,
    },
  }));
}

/** Batch execution and result recording; document state remains owned by App. */
export function useBatchProcessing({ molecule, setMolecule, pushUndo, setStatus, addBatchResult, hideBatchModal }: UseBatchProcessingOptions) {
  const handleBatchProcess = useCallback(async (
    config: BatchConfig,
    options: { signal: AbortSignal; onProgress: (completed: number, total: number) => void },
  ) => {
    try {
      setStatus(`Batch processing: ${config.operation}...`);
      const task: batchLib.BatchTask = {
        operation: config.operation,
        inputFormat: config.inputFormat,
        outputFormat: config.outputFormat,
        filterOptions: config.operation === 'filter' ? { minMW: config.filterMinMW, maxMW: config.filterMaxMW, minLogP: config.filterMinLogP, maxLogP: config.filterMaxLogP } : undefined,
        smartsPattern: config.operation === 'filter' ? config.filterSmarts : undefined,
      };
      const result = await batchLib.processBatch([molecule], task, { signal: options.signal, onProgress: ({ completed, total }) => options.onProgress(completed, total) });
      const provenance = {
        engine: ENGINE_ID,
        inputFormat: config.inputFormat,
        outputFormat: config.outputFormat,
        filterOptions: task.filterOptions,
        smartsPattern: task.smartsPattern,
      };
      addBatchResult(config.operation, result.processed, result.failed, result.skipped, result.resultHash, result.errors, provenance, {
        cancelled: result.cancelled,
        retry: { task, molecules: [molecule] },
        items: batchItems(result),
      });
      if (result.cancelled) {
        setStatus(`Batch processing cancelled: ${result.processed} processed, ${result.failed} failed, ${result.skipped} skipped`);
        return;
      } else if (result.molecules.length > 0) {
        pushUndo();
        setMolecule(result.molecules[0]);
        setStatus(`Batch processing complete: ${result.processed} processed, ${result.failed} failed, ${result.skipped} skipped`);
      } else {
        setStatus('No molecules matched the filter criteria');
      }
      if (result.errors.length > 0) console.error('Batch processing errors:', result.errors);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Batch processing failed: ${message}`);
      console.error('Batch error:', error);
      addBatchResult(config.operation, 0, 1, 0, 'fnv1a-32:00000000', [message], { engine: ENGINE_ID, inputFormat: config.inputFormat, outputFormat: config.outputFormat }, {
        cancelled: false,
        items: [{ index: 0, status: 'failed', warnings: [], error: message }],
      });
    }
    hideBatchModal();
  }, [addBatchResult, hideBatchModal, molecule, pushUndo, setMolecule, setStatus]);

  const handleRetryBatch = useCallback(async (previous: BatchResultSummary) => {
    if (!previous.retry) return;
    setStatus(`Retrying ${previous.failed} failed batch item${previous.failed === 1 ? '' : 's'}...`);
    try {
      const result = await batchLib.retryFailedBatchItems(previous.retry.molecules, previous.retry.task, {
        processed: 0, failed: previous.failed, skipped: previous.skipped, resultHash: previous.resultHash,
        molecules: [], errors: previous.errors,
        items: previous.items.map((item) => ({ index: item.index, status: item.status, input: previous.retry!.molecules[item.index], warnings: item.warnings, error: item.error })),
        cancelled: previous.cancelled ?? false,
      });
      const task = previous.retry.task;
      addBatchResult(task.operation, result.processed, result.failed, result.skipped, result.resultHash, result.errors, previous.provenance, {
        cancelled: result.cancelled,
        retry: previous.retry,
        items: batchItems(result),
      });
      if (result.molecules.length > 0) {
        pushUndo();
        setMolecule(result.molecules[0]);
      }
      setStatus(`Batch retry complete: ${result.processed} processed, ${result.failed} failed`);
    } catch (error) {
      setStatus(`Batch retry failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [addBatchResult, pushUndo, setMolecule, setStatus]);

  return { handleBatchProcess, handleRetryBatch };
}
