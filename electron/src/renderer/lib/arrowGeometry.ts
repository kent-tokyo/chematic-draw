import { MoleculeDto, MechanismArrow } from '../store/types';
import type { ArrowPath, GeometryCanvasState } from '../../../../packages/chematic-contract/src/index';
export type { ArrowPath, GeometryCanvasState as CanvasState } from '../../../../packages/chematic-contract/src/index';

const ARROW_CURVE_OFFSET = 30;
const ARROW_HEAD_LENGTH = 15;
const ARROW_HEAD_WIDTH = 10;

export function calculateArrowPath(
  molecule: MoleculeDto,
  arrow: MechanismArrow,
  state: GeometryCanvasState
): ArrowPath | null {
  const source = molecule.atoms.find((a) => a.id === arrow.sourceAtomId);
  const sink = molecule.atoms.find((a) => a.id === arrow.sinkAtomId);
  if (!source || !sink) return null;

  const startX = source.x * state.zoom + state.offset.x;
  const startY = source.y * state.zoom + state.offset.y;
  const endX = sink.x * state.zoom + state.offset.x;
  const endY = sink.y * state.zoom + state.offset.y;

  const dx = endX - startX;
  const dy = endY - startY;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);

  // Return null for degenerate paths (atoms too close or identical)
  if (dist < 1) return null;

  const px = (-dy / dist) * ARROW_CURVE_OFFSET;
  const py = (dx / dist) * ARROW_CURVE_OFFSET;

  const controlX = startX + dx / 2 + px;
  const controlY = startY + dy / 2 + py;

  // Shrink endpoint to avoid overlap with atom circle (radius ~8px, margin 2px)
  const shrinkFactor = Math.max(0, (dist - 10) / dist);
  const actualEndX = startX + dx * shrinkFactor;
  const actualEndY = startY + dy * shrinkFactor;

  // Calculate angle at endpoint from quadratic bezier derivative
  const tangentX = 2 * (actualEndX - controlX);
  const tangentY = 2 * (actualEndY - controlY);
  const tangentDist = Math.hypot(tangentX, tangentY);

  // If tangent is degenerate, use direct path angle
  const endAngle = tangentDist > 0.1 ? Math.atan2(tangentY, tangentX) : Math.atan2(dy, dx);

  return {
    startX,
    startY,
    controlX,
    controlY,
    endX: actualEndX,
    endY: actualEndY,
    endAngle,
  };
}

export function getArrowHeadPoints(
  endX: number,
  endY: number,
  angle: number
): { x1: number; y1: number; x2: number; y2: number; x3: number; y3: number } {
  // Base of arrow head, at distance ARROW_HEAD_LENGTH from tip along angle
  const baseX = endX - ARROW_HEAD_LENGTH * Math.cos(angle);
  const baseY = endY - ARROW_HEAD_LENGTH * Math.sin(angle);

  // Perpendicular direction (rotated 90 degrees)
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  return {
    x1: endX,                                      // Arrow tip
    y1: endY,
    x2: baseX + perpX * ARROW_HEAD_WIDTH,         // Left side of base
    y2: baseY + perpY * ARROW_HEAD_WIDTH,
    x3: baseX - perpX * ARROW_HEAD_WIDTH,         // Right side of base
    y3: baseY - perpY * ARROW_HEAD_WIDTH,
  };
}

export function distanceToCurve(px: number, py: number, path: ArrowPath): number {
  // Sample the quadratic bezier curve at 20 points for better accuracy
  let minDist = Infinity;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const mt = 1 - t;

    // Quadratic bezier formula: B(t) = (1-t)^2 * P0 + 2*(1-t)*t * P1 + t^2 * P2
    const x = mt * mt * path.startX + 2 * mt * t * path.controlX + t * t * path.endX;
    const y = mt * mt * path.startY + 2 * mt * t * path.controlY + t * t * path.endY;

    const dist = Math.hypot(px - x, py - y);
    minDist = Math.min(minDist, dist);
  }
  return minDist;
}

export function getLabelPosition(
  path: ArrowPath,
  offsetDistance: number = 8
): { x: number; y: number; angle: number } {
  const t = 0.5;
  const mt = 1 - t;

  // Evaluate quadratic bezier curve at t=0.5 (center point)
  const labelX = mt * mt * path.startX + 2 * mt * t * path.controlX + t * t * path.endX;
  const labelY = mt * mt * path.startY + 2 * mt * t * path.controlY + t * t * path.endY;

  // Calculate tangent vector (derivative of bezier curve)
  const tangentX = 2 * mt * (path.controlX - path.startX) + 2 * t * (path.endX - path.controlX);
  const tangentY = 2 * mt * (path.controlY - path.startY) + 2 * t * (path.endY - path.controlY);
  const tangentLen = Math.hypot(tangentX, tangentY);

  // Perpendicular vector (rotate tangent 90 degrees counterclockwise)
  const perpX = tangentLen > 0.1 ? -tangentY / tangentLen : 0;
  const perpY = tangentLen > 0.1 ? tangentX / tangentLen : 1;

  // Apply perpendicular offset to avoid overlapping with arrow curve
  const finalX = labelX + perpX * offsetDistance;
  const finalY = labelY + perpY * offsetDistance;
  const angle = Math.atan2(tangentY, tangentX);

  return { x: finalX, y: finalY, angle };
}

export function getLabelDimensions(
  text: string,
  fontSize: number = 11
): { width: number; height: number } {
  // Simple estimation: text.length * fontSize * 0.6 for proportional fonts
  // This is approximate; actual measurement happens in canvas
  const estimatedWidth = Math.max(text.length * fontSize * 0.55, fontSize * 1.5);
  const estimatedHeight = fontSize + 4; // font size + padding

  return { width: estimatedWidth, height: estimatedHeight };
}
