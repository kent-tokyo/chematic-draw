import { type Molecule } from '@chematic/contract';
import { finiteMolecule } from './moleculeValidation';

const ATOMIC_WEIGHTS: Record<string, number> = { H: 1.008, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, P: 30.974, S: 32.06, Cl: 35.45, Br: 79.904, I: 126.904 };

export interface EmbeddedMoleculeSummary { formula: string; atomCount: number; heavyAtomCount: number; bondCount: number; formalCharge: number; connectedComponentCount: number; approximateMolecularWeight: number | null; }

export function summarizeEmbeddedMolecule(molecule: Molecule): EmbeddedMoleculeSummary {
  const current = finiteMolecule(molecule);
  const counts = new Map<string, number>();
  let formalCharge = 0;
  let approximateMolecularWeight = 0;
  let knownWeight = true;
  for (const atom of current.atoms) {
    counts.set(atom.element, (counts.get(atom.element) ?? 0) + 1);
    const hydrogens = atom.hydrogen_count ?? 0;
    if (Number.isInteger(hydrogens) && hydrogens > 0) counts.set('H', (counts.get('H') ?? 0) + hydrogens);
    formalCharge += atom.charge;
    const weight = ATOMIC_WEIGHTS[atom.element];
    if (weight === undefined) knownWeight = false;
    else approximateMolecularWeight += weight + (Number.isInteger(hydrogens) && hydrogens > 0 ? hydrogens * ATOMIC_WEIGHTS.H : 0);
  }
  const orderedElements = [...counts.keys()].sort((left, right) => left === 'C' ? -1 : right === 'C' ? 1 : left === 'H' ? -1 : right === 'H' ? 1 : left.localeCompare(right));
  const formula = orderedElements.map((element) => `${element}${counts.get(element)! === 1 ? '' : counts.get(element)}`).join('') || '(empty)';
  const adjacency = new Map(current.atoms.map((atom) => [atom.id, [] as number[]]));
  for (const bond of current.bonds) { adjacency.get(bond.from)?.push(bond.to); adjacency.get(bond.to)?.push(bond.from); }
  const visited = new Set<number>();
  let connectedComponentCount = 0;
  for (const atom of current.atoms) {
    if (visited.has(atom.id)) continue;
    connectedComponentCount++;
    const queue = [atom.id];
    visited.add(atom.id);
    while (queue.length) {
      const atomId = queue.shift()!;
      for (const neighbor of adjacency.get(atomId) ?? []) if (!visited.has(neighbor)) { visited.add(neighbor); queue.push(neighbor); }
    }
  }
  return { formula, atomCount: current.atoms.length, heavyAtomCount: current.atoms.filter((atom) => atom.element !== 'H').length, bondCount: current.bonds.length, formalCharge, connectedComponentCount, approximateMolecularWeight: knownWeight ? Number(approximateMolecularWeight.toFixed(4)) : null };
}
