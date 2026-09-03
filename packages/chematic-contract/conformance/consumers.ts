import { validateMolecule, type BatchResultSummary, type CanvasState, type GeometryCanvasState, type Molecule, type QueryDocument, type SessionBundle, type UIAction, type UIState } from '../src/index';

const molecule: Molecule = { atoms: [], bonds: [] };

/** HTML consumer: the public contract can be validated without Electron globals. */
export function htmlConsumer(input: Molecule): string[] { return validateMolecule(input); }

/** React consumer: props/state remain plain serializable contract values. */
export function reactConsumerProps(document: QueryDocument): { schema: string; atomCount: number } {
  return { schema: document.schema, atomCount: document.atoms.length };
}

/** Worker consumer: the same module is usable in a worker message handler. */
export function workerConsumer(input: Molecule): { ok: boolean; errors: string[] } {
  const errors = validateMolecule(input);
  return { ok: errors.length === 0, errors };
}

/** Cross-consumer fixture: every consumer sees the same public UI action type. */
export function uiConsumerConformance(action: UIAction): { html: UIAction; react: UIAction; worker: UIAction } {
  return { html: action, react: action, worker: action };
}

export const conformanceFixture = molecule;

export const contractSurfaceFixture: {
  canvas: CanvasState;
  ui: UIState;
  geometry: GeometryCanvasState;
  query: QueryDocument;
  session: SessionBundle;
  batch: BatchResultSummary;
  action: UIAction;
} = {
  canvas: { offset: { x: 0, y: 0 }, zoom: 1, activeTool: 'select', hoverAtomId: null, hoverBondId: null, selectedAtomIds: new Set(), selectedBondIds: new Set() },
  ui: { theme: 'dark', language: 'en', sidebarOpen: true, sidebarWidth: 260, focusMode: false },
  geometry: { offset: { x: 0, y: 0 }, zoom: 1 },
  query: { schema: 'chematic-draw/query-document', schema_version: 1, atoms: [], bonds: [] },
  session: { schema: 'chematic-draw/session-bundle', schema_version: 2, app: { name: 'chematic-draw', engine: 'chematic 0.35.0' }, source: { file_path: null }, document: { schema_version: 1, molecule }, provenance: { operation: 'export-session-bundle', structure_hash: 'fnv1a-32:00000000' } },
  batch: { operation: 'validate', processed: 0, failed: 0, skipped: 0, resultHash: 'fnv1a-32:00000000', errors: [], timestamp: 0, provenance: { engine: 'chematic 0.35.0' }, items: [] },
  action: 'showShortcuts',
};
