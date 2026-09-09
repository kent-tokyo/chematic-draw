import { MoleculeDto } from '../store/types';
import { runAnalysisInWorker } from './analysisWorkerClient';

export async function copyText(text: string): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const result = await (window as any).electronAPI.copyToClipboard('text/plain', text);
    if (!result.success) throw new Error(result.error);
    return;
  }
  throw new Error('Clipboard API not available');
}

export async function copyMoleculeSmiles(mol: MoleculeDto): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const smiles = await runAnalysisInWorker('canonical-smiles', mol) as string;
    const result = await (window as any).electronAPI.copyToClipboard('text/plain', smiles);
    if (!result.success) throw new Error(result.error);
  }
}

export async function copyMoleculeMol(mol: MoleculeDto): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const molContent = await runAnalysisInWorker('mol-v2000', mol) as string;
    const result = await (window as any).electronAPI.copyToClipboard('text/plain', molContent);
    if (!result.success) throw new Error(result.error);
  }
}

export async function pasteFromClipboard(): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const result = await (window as any).electronAPI.pasteFromClipboard();
    if (!result.success) throw new Error(result.error);
    return result.content || '';
  }
  throw new Error('Clipboard API not available');
}

export async function parsePastedContent(text: string): Promise<MoleculeDto> {
  try {
    return await runAnalysisInWorker('parse', undefined, undefined, undefined, text) as MoleculeDto;
  } catch (err) {
    throw new Error(`Invalid chemical format: ${(err as Error).message}`);
  }
}
