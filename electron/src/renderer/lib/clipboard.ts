import * as wasmBridge from '../wasm/wasmBridge';
import { MoleculeDto } from '../store/types';

export async function copyMoleculeSmiles(mol: MoleculeDto): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const smiles = wasmBridge.toCanonicalSmiles(mol);
    const result = await (window as any).electronAPI.copyToClipboard('text/plain', smiles);
    if (!result.success) throw new Error(result.error);
  }
}

export async function copyMoleculeMol(mol: MoleculeDto): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const molContent = wasmBridge.toMolV2000(mol);
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

export function parsePastedContent(text: string): MoleculeDto {
  try {
    return wasmBridge.parseMolecule(text);
  } catch (err) {
    throw new Error(`Invalid chemical format: ${(err as Error).message}`);
  }
}
