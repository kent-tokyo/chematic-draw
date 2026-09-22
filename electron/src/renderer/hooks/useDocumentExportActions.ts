import { useCallback } from 'react';
import { MoleculeDto } from '../store/types';
import { svgToPngBase64 } from '../lib/svgToPng';
import { runAnalysisInWorker } from '../lib/analysisWorkerClient';
import { confirmLossAwareExport } from './useDocumentFileActions';
import { getElectronApi } from '../electronApi';

interface UseDocumentExportActionsOptions {
  molecule: MoleculeDto;
  filePath: string | null;
  setStatus: (message: string) => void;
  onExportCancelled: () => void;
}

/** Export menu actions. The host owns menu subscription and document state. */
export function useDocumentExportActions({ molecule, filePath, setStatus, onExportCancelled }: UseDocumentExportActionsOptions) {
  const exportSvg = useCallback(async () => {
    const api = getElectronApi();
    const result = await api?.fileSaveDialog?.('untitled.svg');
    if (!result || result.canceled || !result.filePath) return;
    const content = await runAnalysisInWorker('svg', molecule) as string;
    const writeResult = await api.fileWrite(result.filePath, content);
    setStatus(writeResult.success ? `Exported: ${result.filePath}` : `Export failed: ${writeResult.error}`);
  }, [molecule, setStatus]);

  const exportPng = useCallback(async () => {
    const api = getElectronApi();
    const result = await api?.fileSaveDialog?.('untitled.png');
    if (!result || result.canceled || !result.filePath) return;
    try {
      const svg = await runAnalysisInWorker('svg', molecule) as string;
      const base64 = await svgToPngBase64(svg);
      const writeResult = await api.fileWriteBinary(result.filePath, base64);
      setStatus(writeResult.success ? `Exported: ${result.filePath}` : `Export failed: ${writeResult.error}`);
    } catch (error) {
      setStatus(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [molecule, setStatus]);

  const exportPdf = useCallback(async () => {
    const api = getElectronApi();
    const result = await api?.fileSaveDialog?.('untitled.pdf');
    if (!result || result.canceled || !result.filePath) return;
    try {
      const svg = await runAnalysisInWorker('svg', molecule) as string;
      const writeResult = await api.exportPdf(result.filePath, svg);
      setStatus(writeResult.success ? `Exported: ${result.filePath}` : `Export failed: ${writeResult.error}`);
    } catch (error) {
      setStatus(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [molecule, setStatus]);

  const exportTextDocument = useCallback(async (suggestedName: string, operation: 'mol-v2000' | 'canonical-smiles') => {
    const api = getElectronApi();
    const result = await api?.fileSaveDialog?.(suggestedName);
    if (!result || result.canceled || !result.filePath) return;
    if (!confirmLossAwareExport(molecule, result.filePath)) {
      onExportCancelled();
      return;
    }
    const content = await runAnalysisInWorker(operation, molecule) as string;
    const writeResult = await api.fileWrite(result.filePath, content);
    setStatus(writeResult.success ? `Exported: ${result.filePath}` : `Export failed: ${writeResult.error}`);
  }, [molecule, onExportCancelled, setStatus]);

  const exportMol = useCallback(() => exportTextDocument('untitled.mol', 'mol-v2000'), [exportTextDocument]);
  const exportSmiles = useCallback(() => exportTextDocument('untitled.smi', 'canonical-smiles'), [exportTextDocument]);

  const exportSession = useCallback(async () => {
    const api = getElectronApi();
    const result = await api?.fileSaveDialog?.('untitled.schematic.json');
    if (!result || result.canceled || !result.filePath) return;
    const content = await runAnalysisInWorker('serialize-session', molecule, undefined, undefined, filePath) as string;
    const writeResult = await api.fileWrite(result.filePath, content);
    setStatus(writeResult.success ? `Exported session bundle: ${result.filePath}` : `Export failed: ${writeResult.error}`);
  }, [filePath, molecule, setStatus]);

  return { exportSvg, exportPng, exportPdf, exportMol, exportSmiles, exportSession };
}
