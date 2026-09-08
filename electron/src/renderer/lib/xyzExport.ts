import type { Coords3d } from '../../../../packages/chematic-contract/src/index';

/** Serialize validated 3D coordinates to deterministic six-decimal XYZ text. */
export function formatCoordsAsXyz(coords: Coords3d): string {
  if (!coords || !Array.isArray(coords.atoms)) throw new TypeError('3D coordinates must contain an atoms array');
  const ids = new Set<number>();
  for (const atom of coords.atoms) {
    if (!atom || !Number.isInteger(atom.id) || ids.has(atom.id)) throw new TypeError('3D atom IDs must be unique integers');
    if (typeof atom.element !== 'string' || atom.element.length === 0) throw new TypeError(`3D atom ${atom.id} must have an element`);
    if (![atom.x, atom.y, atom.z].every(Number.isFinite)) throw new TypeError(`3D atom ${atom.id} must have finite coordinates`);
    ids.add(atom.id);
  }
  return `${coords.atoms.length}\n\n${coords.atoms.map((atom) => `${atom.element} ${atom.x.toFixed(6)} ${atom.y.toFixed(6)} ${atom.z.toFixed(6)}`).join('\n')}\n`;
}
