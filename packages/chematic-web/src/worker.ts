import { validateMolecule, type Molecule } from '@chematic/contract';
import { applyMoleculeEdit, type MoleculeEdit } from './editor';
import { renderMoleculeSvg, serializeMolecule, summarizeEmbeddedMolecule } from './index';

export type MoleculeWorkerRequest =
  | { type: 'render' | 'serialize' | 'validate' | 'summarize'; molecule: Molecule }
  | { type: 'edit'; molecule: Molecule; edit: MoleculeEdit }
  | { type: 'edit-batch'; molecule: Molecule; edits: MoleculeEdit[] };
export type MoleculeWorkerResponse = { ok: true; type: MoleculeWorkerRequest['type']; value: string } | { ok: false; error: string };
export type MoleculeWorkerMessage = MoleculeWorkerRequest & { id: string };
export type MoleculeWorkerMessageResponse = MoleculeWorkerResponse & { id: string };
export const MAX_MOLECULE_EDIT_BATCH = 256;

/** Worker-safe handler: no DOM, Electron, network, or framework imports. */
export function handleMoleculeWorkerRequest(request: MoleculeWorkerRequest): MoleculeWorkerResponse {
  try {
    let value: string;
    if (request.type === 'edit') value = serializeMolecule(applyMoleculeEdit(request.molecule, request.edit));
    else if (request.type === 'edit-batch') {
      if (!Array.isArray(request.edits) || request.edits.length > MAX_MOLECULE_EDIT_BATCH) throw new RangeError(`Molecule edit batch must contain at most ${MAX_MOLECULE_EDIT_BATCH} edits`);
      // Each operation works on a fresh immutable value. If any edit fails,
      // this local chain is discarded and the caller's molecule is untouched.
      const edited = request.edits.reduce((current, edit) => applyMoleculeEdit(current, edit), request.molecule);
      value = serializeMolecule(edited);
    }
    else if (request.type === 'render') value = renderMoleculeSvg(request.molecule);
    else if (request.type === 'serialize') value = serializeMolecule(request.molecule);
    else if (request.type === 'summarize') value = JSON.stringify(summarizeEmbeddedMolecule(request.molecule));
    else value = JSON.stringify(validateMolecule(request.molecule));
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
