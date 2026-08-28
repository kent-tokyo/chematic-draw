import { AtomDto, BondDto, MoleculeDto } from '../store/types';
import { CanvasState } from '../store/types';

const SNAP_THRESHOLD = 10;
const ATOM_RADIUS = 8;

export interface HitResult {
  type: 'atom' | 'bond' | 'empty';
  id?: number;
}

/**
 * Find which atom (if any) is under the given screen coordinates.
 */
export function hitTestAtom(
  molecule: MoleculeDto,
  screenX: number,
  screenY: number,
  state: Pick<CanvasState, 'offset' | 'zoom'>
): number | null {
  for (const atom of molecule.atoms) {
    const x = atom.x * state.zoom + state.offset.x;
    const y = atom.y * state.zoom + state.offset.y;
    const dist = Math.hypot(screenX - x, screenY - y);
    if (dist <= SNAP_THRESHOLD) {
      return atom.id;
    }
  }
  return null;
}

/**
 * Find which bond (if any) is under the given screen coordinates.
 */
export function hitTestBond(
  molecule: MoleculeDto,
  screenX: number,
  screenY: number,
  state: Pick<CanvasState, 'offset' | 'zoom'>
): number | null {
  for (const bond of molecule.bonds) {
    const from = molecule.atoms.find((a) => a.id === bond.from);
    const to = molecule.atoms.find((a) => a.id === bond.to);
    if (!from || !to) continue;

    const x1 = from.x * state.zoom + state.offset.x;
    const y1 = from.y * state.zoom + state.offset.y;
    const x2 = to.x * state.zoom + state.offset.x;
    const y2 = to.y * state.zoom + state.offset.y;

    const dist = pointToSegmentDistance(screenX, screenY, x1, y1, x2, y2);
    if (dist <= SNAP_THRESHOLD) {
      return bond.id;
    }
  }
  return null;
}

/**
 * Distance from point (px, py) to line segment (x1, y1)-(x2, y2).
 */
export function pointToSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const nearX = x1 + t * dx;
  const nearY = y1 + t * dy;

  return Math.hypot(px - nearX, py - nearY);
}

/**
 * Get unoccupied direction (120° apart) from an atom.
 * Used to place new bonds at nice angles.
 */
export function getUnoccupiedDirection(
  molecule: MoleculeDto,
  atomId: number,
  preferredAngle: number = 0
): number {
  const atom = molecule.atoms.find((a) => a.id === atomId);
  if (!atom) return preferredAngle;

  // Find existing bond angles from this atom
  const bondAngles = new Set<number>();
  for (const bond of molecule.bonds) {
    if (bond.from !== atomId && bond.to !== atomId) continue;
    const otherId = bond.from === atomId ? bond.to : bond.from;
    const other = molecule.atoms.find((a) => a.id === otherId);
    if (!other) continue;

    const dx = other.x - atom.x;
    const dy = other.y - atom.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = ((angle % 360) + 360) % 360;
    bondAngles.add(Math.round(angle / 15) * 15); // Snap to 15° grid
  }

  // Try standard directions: 0°, 120°, 240°, -120° (=240°), -60° (=300°), 60°
  const candidates = [0, 60, 120, 180, 240, 300];
  for (const angle of candidates) {
    if (!bondAngles.has(angle)) {
      return angle;
    }
  }

  return preferredAngle;
}

/**
 * Calculate position for a new atom bonded to an existing one.
 */
export function calculateBondedAtomPosition(
  molecule: MoleculeDto,
  fromId: number,
  bondLength: number = 60
): { x: number; y: number } {
  const from = molecule.atoms.find((a) => a.id === fromId);
  if (!from) return { x: 0, y: 0 };

  const angle = getUnoccupiedDirection(molecule, fromId);
  const rad = (angle * Math.PI) / 180;

  return {
    x: from.x + bondLength * Math.cos(rad),
    y: from.y + bondLength * Math.sin(rad),
  };
}

/**
 * Find all atoms connected to a given atom (BFS).
 */
export function getConnectedComponent(molecule: MoleculeDto, atomId: number): Set<number> {
  const visited = new Set<number>();
  const queue = [atomId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const bond of molecule.bonds) {
      if (bond.from === current && !visited.has(bond.to)) {
        queue.push(bond.to);
      } else if (bond.to === current && !visited.has(bond.from)) {
        queue.push(bond.from);
      }
    }
  }

  return visited;
}
