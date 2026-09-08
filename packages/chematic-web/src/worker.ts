import { validateMolecule, type Molecule } from '@chematic/contract';
import { renderMoleculeSvg, serializeMolecule } from './index';

export interface MoleculeWorkerRequest { type: 'render' | 'serialize' | 'validate'; molecule: Molecule; }
export type MoleculeWorkerResponse = { ok: true; type: MoleculeWorkerRequest['type']; value: string } | { ok: false; error: string };
export type MoleculeWorkerMessage = MoleculeWorkerRequest & { id: string };
export type MoleculeWorkerMessageResponse = MoleculeWorkerResponse & { id: string };

/** Worker-safe handler: no DOM, Electron, network, or framework imports. */
export function handleMoleculeWorkerRequest(request: MoleculeWorkerRequest): MoleculeWorkerResponse {
  try {
    const value = request.type === 'render' ? renderMoleculeSvg(request.molecule) : request.type === 'serialize' ? serializeMolecule(request.molecule) : JSON.stringify(validateMolecule(request.molecule));
    return { ok: true, type: request.type, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Add a stable request ID so a shared browser Worker can multiplex callers. */
export function handleMoleculeWorkerMessage(message: MoleculeWorkerMessage): MoleculeWorkerMessageResponse {
  const { id, ...request } = message;
  return { id, ...handleMoleculeWorkerRequest(request) } as MoleculeWorkerMessageResponse;
}
