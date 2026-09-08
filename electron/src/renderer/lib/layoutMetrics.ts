import { SchemeLayout } from './schemeLayout';
import type { LayoutMetrics as ContractLayoutMetrics } from '../../../../packages/chematic-contract/src/index';
export type { LayoutMetrics } from '../../../../packages/chematic-contract/src/index';
type LayoutMetrics = ContractLayoutMetrics;

/** Conservative, deterministic fallback metrics for preflight layout checks. */
export function estimatePublicationTextBox(id: string, text: string, x: number, y: number, fontSize = 12): { id: string; x: number; y: number; width: number; height: number; text: string } {
  const safeSize = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 12;
  const width = [...text].reduce((total, character) => {
    if (/\s/.test(character)) return total + safeSize * 0.28;
    if (/[\u3000-\u9fff\uac00-\ud7af]/u.test(character)) return total + safeSize;
    return total + safeSize * 0.56;
  }, 0);
  return { id, x, y, width, height: safeSize * 1.25, text };
}

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
  const finite = (value: number): boolean => Number.isFinite(value);
  let invalidGeometry = [layout.canvasWidth, layout.canvasHeight, layout.padding].filter((value) => !finite(value) || value < 0).length;
  invalidGeometry += layout.stepBoxes.filter((box) => [box.x, box.y, box.width, box.height].some((value) => !finite(value) || value < 0)).length;
  invalidGeometry += layout.stepArrows.filter((arrow) => [arrow.x1, arrow.y1, arrow.x2, arrow.y2].some((value) => !finite(value))).length;
  invalidGeometry += (layout.textBoxes ?? []).filter((box) => !box.id || typeof box.text !== 'string' || [box.x, box.y, box.width, box.height].some((value) => !finite(value) || value < 0)).length;
  let boxOverlaps = 0;
  for (let i = 0; i < layout.stepBoxes.length; i++) for (let j = i + 1; j < layout.stepBoxes.length; j++) if (intersects(layout.stepBoxes[i], layout.stepBoxes[j])) boxOverlaps++;
  let arrowCrossings = 0;
  for (let i = 0; i < layout.stepArrows.length; i++) for (let j = i + 1; j < layout.stepArrows.length; j++) if (segmentsCross(layout.stepArrows[i], layout.stepArrows[j])) arrowCrossings++;
  const clippedBoxes = layout.stepBoxes.filter((box) => box.x < 0 || box.y < 0 || box.x + box.width > layout.canvasWidth || box.y + box.height > layout.canvasHeight).length;
  const arrowOverflow = layout.stepArrows.filter((arrow) => [arrow.x1, arrow.y1, arrow.x2, arrow.y2].some((value, index) => value < 0 || value > (index % 2 === 0 ? layout.canvasWidth : layout.canvasHeight))).length;
  const textBoxes = layout.textBoxes ?? [];
  let textOverlaps = 0;
  for (let i = 0; i < textBoxes.length; i++) for (let j = i + 1; j < textBoxes.length; j++) if (intersects(textBoxes[i], textBoxes[j])) textOverlaps++;
  const textOverflow = textBoxes.filter((box) => box.x < 0 || box.y < 0 || box.x + box.width > layout.canvasWidth || box.y + box.height > layout.canvasHeight).length;
  return { boxOverlaps, arrowCrossings, clippedBoxes, arrowOverflow, textOverlaps, textOverflow, invalidGeometry, deterministicKey: JSON.stringify(layout) };
}

export function assertPublicationLayout(layout: SchemeLayout): LayoutMetrics {
  const metrics = measureSchemeLayout(layout);
  if (metrics.boxOverlaps || metrics.arrowCrossings || metrics.clippedBoxes || metrics.arrowOverflow || metrics.textOverlaps || metrics.textOverflow || metrics.invalidGeometry) throw new Error(`Publication layout failed: ${JSON.stringify(metrics)}`);
  return metrics;
}

/** Deterministically rebuild the scheme geometry without mutating the input. */
export function repairPublicationLayout(layout: SchemeLayout): SchemeLayout {
  const padding = Number.isFinite(layout.padding) && layout.padding >= 0 ? layout.padding : 20;
  const boxes = layout.stepBoxes.map((box, index) => ({
    ...box,
    stepIndex: index,
    x: padding + index * ((Number.isFinite(box.width) && box.width >= 0 ? box.width : 300) + 50),
    y: 0,
    width: Number.isFinite(box.width) && box.width > 0 ? box.width : 300,
    height: Number.isFinite(box.height) && box.height > 0 ? box.height : 220,
  }));
  const maxHeight = Math.max(0, ...boxes.map((box) => box.height));
  const canvasHeight = Math.max(400, maxHeight + padding * 2);
  for (const box of boxes) box.y = (canvasHeight - box.height) / 2;
  const canvasWidth = Math.max(800, (boxes.at(-1)?.x ?? padding) + (boxes.at(-1)?.width ?? 0) + padding);
  const arrows = boxes.slice(0, -1).map((fromBox, index) => {
    const toBox = boxes[index + 1];
    return { fromIndex: index, toIndex: index + 1, x1: fromBox.x + fromBox.width, y1: fromBox.y + fromBox.height / 2, x2: toBox.x, y2: toBox.y + toBox.height / 2 };
  });
  return { stepBoxes: boxes, stepArrows: arrows, canvasWidth, canvasHeight, padding };
}
