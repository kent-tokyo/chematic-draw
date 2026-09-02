import { validateMolecule, type Molecule, type QueryDocument } from '../src/index';

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

export const conformanceFixture = molecule;
