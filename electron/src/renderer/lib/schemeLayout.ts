import { ReactionSchemeContext, MoleculeDto } from '../store/types';
import { MechanismStep } from '../store/types';

/**
 * Represents a step box in the scheme layout
 */
export interface StepBox {
  stepIndex: number;
  x: number;           // screen position
  y: number;
  width: number;       // box dimensions
  height: number;
  selected: boolean;
  hovered: boolean;
}

/**
 * Arrow between two consecutive steps
 */
export interface StepArrow {
  fromIndex: number;
  toIndex: number;
  x1: number;          // start position
  y1: number;
  x2: number;          // end position
  y2: number;
}

/**
 * Complete scheme layout
 */
export interface SchemeLayout {
  stepBoxes: StepBox[];
  stepArrows: StepArrow[];
  canvasWidth: number;
  canvasHeight: number;
  padding: number;
}

// Constants for layout
const BOX_WIDTH = 300;
const BOX_HEIGHT = 220;        // base height
const SPACING_HORIZONTAL = 50; // between boxes
const SPACING_VERTICAL = 20;   // padding
const MIN_CANVAS_WIDTH = 800;
const MIN_CANVAS_HEIGHT = 400;

/**
 * Calculate height of a step box based on content
 */
function calculateBoxHeight(step: MechanismStep): number {
  // Base height + extra space for content
  const reactantLines = Math.max(step.reactants.length, 1);
  const productLines = Math.max(step.products.length, 1);
  const arrowLines = Math.ceil(step.arrows.length / 2); // 2 arrows per line

  const contentHeight = (reactantLines + 1 + arrowLines + 1 + productLines + 1) * 16; // ~16px per line
  return Math.max(BOX_HEIGHT, contentHeight + 40);
}

/**
 * Calculate the complete layout for a reaction scheme
 */
export function calculateSchemeLayout(scheme: ReactionSchemeContext): SchemeLayout {
  const numSteps = scheme.steps.length;
  if (numSteps === 0) {
    return {
      stepBoxes: [],
      stepArrows: [],
      canvasWidth: MIN_CANVAS_WIDTH,
      canvasHeight: MIN_CANVAS_HEIGHT,
      padding: SPACING_VERTICAL,
    };
  }

  // Calculate box heights
  const boxHeights = scheme.steps.map((step) => calculateBoxHeight(step));
  const maxBoxHeight = Math.max(...boxHeights);

  // Calculate canvas dimensions
  const totalWidth =
    numSteps * BOX_WIDTH + (numSteps - 1) * SPACING_HORIZONTAL + 2 * SPACING_VERTICAL;
  const canvasWidth = Math.max(totalWidth, MIN_CANVAS_WIDTH);
  const canvasHeight = Math.max(maxBoxHeight + 2 * SPACING_VERTICAL, MIN_CANVAS_HEIGHT);

  // Calculate step box positions
  const centerY = canvasHeight / 2;
  const startX = SPACING_VERTICAL;

  const stepBoxes: StepBox[] = scheme.steps.map((step, index) => {
    const x = startX + index * (BOX_WIDTH + SPACING_HORIZONTAL);
    const y = centerY - maxBoxHeight / 2;

    return {
      stepIndex: index,
      x,
      y,
      width: BOX_WIDTH,
      height: boxHeights[index],
      selected: index === scheme.currentStepIndex,
      hovered: false,
    };
  });

  // Calculate step arrows (between boxes)
  const stepArrows: StepArrow[] = [];
  for (let i = 0; i < numSteps - 1; i++) {
    const fromBox = stepBoxes[i];
    const toBox = stepBoxes[i + 1];

    // Arrow starts at right edge of current box, ends at left edge of next box
    const x1 = fromBox.x + fromBox.width;
    const y1 = fromBox.y + fromBox.height / 2;
    const x2 = toBox.x;
    const y2 = toBox.y + toBox.height / 2;

    stepArrows.push({
      fromIndex: i,
      toIndex: i + 1,
      x1,
      y1,
      x2,
      y2,
    });
  }

  return {
    stepBoxes,
    stepArrows,
    canvasWidth,
    canvasHeight,
    padding: SPACING_VERTICAL,
  };
}

/**
 * Hit detection: find which step box is at the given position
 */
export function getStepBoxAtPosition(
  x: number,
  y: number,
  layout: SchemeLayout
): number | null {
  for (const box of layout.stepBoxes) {
    if (x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height) {
      return box.stepIndex;
    }
  }
  return null;
}

/**
 * Hit detection: find which step arrow is at the given position (10px tolerance)
 */
export function getStepArrowAtPosition(
  x: number,
  y: number,
  layout: SchemeLayout,
  tolerance: number = 10
): { from: number; to: number } | null {
  for (const arrow of layout.stepArrows) {
    // Simple distance check to line segment
    const dist = distanceToLineSegment(x, y, arrow.x1, arrow.y1, arrow.x2, arrow.y2);
    if (dist < tolerance) {
      return { from: arrow.fromIndex, to: arrow.toIndex };
    }
  }
  return null;
}

/**
 * Helper: distance from point to line segment
 */
function distanceToLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;

  if (len2 === 0) {
    // Degenerate segment
    return Math.hypot(px - x1, py - y1);
  }

  // Parameter t of closest point on line segment
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.hypot(px - closestX, py - closestY);
}

/**
 * Get summary of a step for display
 */
export function getStepSummary(step: MechanismStep): {
  reactantCount: number;
  productCount: number;
  arrowCount: number;
  mechanismType: string;
} {
  return {
    reactantCount: step.reactants.length,
    productCount: step.products.length,
    arrowCount: step.arrows.length,
    mechanismType: step.mechanismType,
  };
}

/**
 * Export layout as JSON (for debugging)
 */
export function exportLayoutAsJSON(layout: SchemeLayout): string {
  return JSON.stringify(layout, null, 2);
}
