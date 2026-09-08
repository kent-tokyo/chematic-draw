import { handleMoleculeWorkerMessage, type MoleculeWorkerMessage, type MoleculeWorkerMessageResponse } from './worker';

export interface MoleculeWorkerScope {
  onmessage: ((event: MessageEvent<MoleculeWorkerMessage>) => void) | null;
  postMessage(message: MoleculeWorkerMessageResponse): void;
}

/** Install the protocol handler in a dedicated browser Worker global scope. */
export function installMoleculeWorker(scope: MoleculeWorkerScope): void {
  scope.onmessage = ({ data }) => scope.postMessage(handleMoleculeWorkerMessage(data));
}

// This module is intended to be the Worker entrypoint. The guard keeps it
// importable by SSR/tooling while installing the handler in a real Worker.
if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  installMoleculeWorker(self as unknown as MoleculeWorkerScope);
}
