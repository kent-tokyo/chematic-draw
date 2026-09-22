import { Dispatch, SetStateAction, useCallback } from 'react';
import { MoleculeDto } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';
import { exportCdxml } from '../lib/cdxmlExport';
import { canPreserveCdxml, captureRichCdxmlSession, cdxmlSessionLossWarnings, RichCdxmlSession, serializeCdxmlForPath } from '../lib/cdxmlWorkflow';
import { exportLossMessage, exportLosses, formatForFilePath, MoleculeExportFormat } from '../lib/exportLoss';
import { runAnalysisInWorker } from '../lib/analysisWorkerClient';
import { getElectronApi } from '../electronApi';

interface UseDocumentFileActionsOptions {
  molecule: MoleculeDto;
  filePath: string | null;
  richCdxmlSession: RichCdxmlSession | null;
  setMolecule: (molecule: MoleculeDto) => void;
  setFilePath: Dispatch<SetStateAction<string | null>>;
  setRichCdxmlSession: Dispatch<SetStateAction<RichCdxmlSession | null>>;
  setStatus: (message: string) => void;
  pushUndo: () => void;
  centerOnLoad: () => void;
}

interface OpenedFile {
  path: string;
  content: string;
}

async function parseMoleculeDocument(content: string, filePath: string): Promise<MoleculeDto> {
  return await runAnalysisInWorker(filePath.toLowerCase().endsWith('.json') ? 'parse-session' : 'parse', undefined, undefined, undefined, content) as MoleculeDto;
}

async function serializeMoleculeForPath(molecule: MoleculeDto, filePath: string): Promise<string> {
  if (filePath.toLowerCase().endsWith('.json')) return await runAnalysisInWorker('serialize-session', molecule, undefined, undefined, filePath) as string;
  switch (formatForFilePath(filePath)) {
    case 'smiles': return await runAnalysisInWorker('canonical-smiles', molecule) as string;
    case 'sdf': return await runAnalysisInWorker('sdf', molecule) as string;
    case 'cml': return await runAnalysisInWorker('cml', molecule) as string;
    case 'mol-v2000': return await runAnalysisInWorker('mol-v2000', molecule) as string;
    case 'cdxml': return exportCdxml(molecule);
  }
}

export function confirmLossAwareExport(molecule: MoleculeDto, filePath: string, extraWarnings: string[] = []): boolean {
  const format: MoleculeExportFormat = formatForFilePath(filePath);
  const losses = exportLosses(molecule, format);
  if (losses.some((loss) => loss.code === 'unsupported-format')) return false;
  if (extraWarnings.length === 0) return losses.length === 0 || window.confirm(exportLossMessage(filePath, losses));
  return window.confirm([
    `Exporting to ${filePath} may lose document information:`,
    ...losses.map((loss) => `• ${loss.message}`),
    ...extraWarnings.map((warning) => `• ${warning}`),
    '',
    'Continue anyway?',
  ].join('\n'));
}

/** File dialogs, persistence, and CDXML preservation; App owns document state. */
export function useDocumentFileActions({ molecule, filePath, richCdxmlSession, setMolecule, setFilePath, setRichCdxmlSession, setStatus, pushUndo, centerOnLoad }: UseDocumentFileActionsOptions) {
  const openDocument = useCallback(async ({ path, content }: OpenedFile) => {
    try {
      const isCdxml = path.toLowerCase().endsWith('.cdxml');
      if (isCdxml) wasmBridge.cdxmlDocumentJson(content);
      const loaded = await parseMoleculeDocument(content, path);
      setMolecule(loaded);
      setFilePath(path);
      setRichCdxmlSession(isCdxml ? captureRichCdxmlSession(content, path, loaded) : null);
      void getElectronApi()?.recordRecentFile(path);
      centerOnLoad();
      setStatus(`Opened: ${path}`);
    } catch (error) {
      setStatus(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [centerOnLoad, setFilePath, setMolecule, setRichCdxmlSession, setStatus]);

  const handleToolbarOpen = useCallback(async () => {
    const result = await getElectronApi()?.fileOpenDialog();
    if (!result) return;
    if (result.canceled || !result.path || typeof result.content !== 'string') {
      if (result.error) setStatus(`Failed to open file: ${result.error}`);
      return;
    }
    await openDocument({ path: result.path, content: result.content });
  }, [openDocument, setStatus]);

  const writeDocument = useCallback(async (destination: string) => {
    const api = getElectronApi();
    if (!api) return false;
    const sessionBundle = destination.toLowerCase().endsWith('.json');
    const format = formatForFilePath(destination);
    const preserveRichCdxml = canPreserveCdxml(molecule, destination, richCdxmlSession);
    if (!sessionBundle && !preserveRichCdxml && !confirmLossAwareExport(molecule, destination, format === 'cdxml' ? cdxmlSessionLossWarnings(richCdxmlSession) : [])) return false;
    const content = !sessionBundle && format === 'cdxml' ? serializeCdxmlForPath(molecule, destination, richCdxmlSession) : await serializeMoleculeForPath(molecule, destination);
    const result = await api.fileWrite(destination, content);
    if (!result.success) {
      setStatus(`Save failed: ${result.error}`);
      return false;
    }
    setFilePath(destination);
    setRichCdxmlSession(format === 'cdxml' ? captureRichCdxmlSession(content, destination, molecule) : null);
    void api.recordRecentFile(destination);
    setStatus(`Saved: ${destination}`);
    return true;
  }, [molecule, richCdxmlSession, setFilePath, setRichCdxmlSession, setStatus]);

  const handleToolbarSaveAs = useCallback(async () => {
    const result = await getElectronApi()?.fileSaveDialog('untitled.mol');
    if (!result?.canceled && result?.filePath) await writeDocument(result.filePath);
  }, [writeDocument]);

  const handleToolbarSave = useCallback(async () => {
    if (filePath) await writeDocument(filePath);
    else await handleToolbarSaveAs();
  }, [filePath, handleToolbarSaveAs, writeDocument]);

  const handleBrowserMoleculeLoaded = useCallback((loaded: MoleculeDto, sourceName?: string) => {
    pushUndo();
    setMolecule(loaded);
    setFilePath(sourceName ?? null);
    setRichCdxmlSession(null);
    centerOnLoad();
  }, [centerOnLoad, pushUndo, setFilePath, setMolecule, setRichCdxmlSession]);

  return { openDocument, handleToolbarOpen, handleToolbarSave, handleToolbarSaveAs, handleBrowserMoleculeLoaded };
}
