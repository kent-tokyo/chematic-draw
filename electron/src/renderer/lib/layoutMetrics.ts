import { SchemeLayout } from './schemeLayout';
import type { LayoutMetrics as ContractLayoutMetrics } from '../../../../packages/chematic-contract/src/index';
export type { LayoutMetrics } from '../../../../packages/chematic-contract/src/index';
type LayoutMetrics = ContractLayoutMetrics;

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function orientation(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  const value = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return Math.abs(value) < 1e-9 ? 0 : value > 0 ? 1 : -1;
}

function segmentsCross(a: { x1: number; y1: number; x2: number; y2: number }, b: { x1: number; y1: number; x2: number; y2: number }): boolean {
  const ab1 = orientation(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1);
  const ab2 = orientation(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);
  const ba1 = orientation(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1);
  const ba2 = orientation(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2);
  return ab1 * ab2 < 0 && ba1 * ba2 < 0;
}

export function measureSchemeLayout(layout: SchemeLayout): LayoutMetrics {
  let boxOverlaps = 0;
  for (let i = 0; i < layout.stepBoxes.length; i++) for (let j = i + 1; j < layout.stepBoxes.length; j++) if (intersects(layout.stepBoxes[i], layout.stepBoxes[j])) boxOverlaps++;
  let arrowCrossings = 0;
  for (let i = 0; i < layout.stepArrows.length; i++) for (let j = i + 1; j < layout.stepArrows.length; j++) if (segmentsCross(layout.stepArrows[i], layout.stepArrows[j])) arrowCrossings++;
  const clippedBoxes = layout.stepBoxes.filter((box) => box.x < 0 || box.y < 0 || box.x + box.width > layout.canvasWidth || box.y + box.height > layout.canvasHeight).length;
  const arrowOverflow = layout.stepArrows.filter((arrow) => [arrow.x1, arrow.y1, arrow.x2, arrow.y2].some((value, index) => value < 0 || value > (index % 2 === 0 ? layout.canvasWidth : layout.canvasHeight))).length;
  return { boxOverlaps, arrowCrossings, clippedBoxes, arrowOverflow, deterministicKey: JSON.stringify(layout) };
}

export function assertPublicationLayout(layout: SchemeLayout): LayoutMetrics {
  const metrics = measureSchemeLayout(layout);
  if (metrics.boxOverlaps || metrics.arrowCrossings || metrics.clippedBoxes || metrics.arrowOverflow) throw new Error(`Publication layout failed: ${JSON.stringify(metrics)}`);
  return metrics;
}
