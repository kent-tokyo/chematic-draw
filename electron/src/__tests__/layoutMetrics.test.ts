import { calculateSchemeLayout } from '../renderer/lib/schemeLayout';
import { estimatePublicationTextBox, measureSchemeLayout, repairPublicationLayout } from '../renderer/lib/layoutMetrics';
import { ReactionSchemeContext } from '../renderer/store/types';

const scheme: ReactionSchemeContext = { id: 'golden', title: 'Golden', currentStepIndex: 0, viewMode: 'scheme', steps: [
  { id: 's1', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
  { id: 's2', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
] };

describe('publication layout metrics', () => {
  it('has no box overlap, crossing, or clipping for the deterministic baseline', () => {
    const layout = calculateSchemeLayout(scheme);
    expect(measureSchemeLayout(layout)).toMatchObject({ boxOverlaps: 0, arrowCrossings: 0, clippedBoxes: 0, arrowOverflow: 0, textOverlaps: 0, textOverflow: 0, invalidGeometry: 0 });
  });

  it('wraps long reaction routes into a deterministic publication flow', () => {
    const longRoute: ReactionSchemeContext = {
      ...scheme,
      steps: Array.from({ length: 20 }, (_, index) => ({ id: `step-${index + 1}`, reactants: [], products: [], arrows: [], mechanismType: 'sn2' as const })),
    };
    const layout = calculateSchemeLayout(longRoute);
    expect(layout.stepBoxes).toHaveLength(20);
    expect(layout.canvasWidth).toBeLessThanOrEqual(1_400);
    expect(layout.stepBoxes[4].y).toBeGreaterThan(layout.stepBoxes[0].y);
    expect(layout.stepArrows[3]).toMatchObject({ fromIndex: 3, toIndex: 4 });
    expect(layout.stepArrows[3].y1).toBeLessThan(layout.stepArrows[4].y1);
    expect(measureSchemeLayout(layout)).toMatchObject({ boxOverlaps: 0, arrowCrossings: 0, clippedBoxes: 0, arrowOverflow: 0, invalidGeometry: 0 });
    expect(calculateSchemeLayout(longRoute)).toEqual(layout);
  });

  it('detects clipping rather than hiding it in a derived label', () => {
    const layout = calculateSchemeLayout(scheme);
    layout.stepBoxes[0].x = -1;
    expect(measureSchemeLayout(layout).clippedBoxes).toBe(1);
  });

  it('rejects non-finite geometry before publication export', () => {
    const layout = calculateSchemeLayout(scheme);
    layout.stepBoxes[0].x = Number.NaN;
    expect(measureSchemeLayout(layout).invalidGeometry).toBe(1);
  });

  it('repairs corrupted geometry deterministically without mutating the source', () => {
    const layout = calculateSchemeLayout(scheme);
    layout.stepBoxes[0].x = -100;
    layout.stepBoxes[1].width = Number.NaN;
    layout.stepArrows = [{ fromIndex: 0, toIndex: 1, x1: Number.NaN, y1: 0, x2: -1, y2: 0 }];
    const repaired = repairPublicationLayout(layout);
    expect(measureSchemeLayout(repaired)).toMatchObject({ boxOverlaps: 0, arrowCrossings: 0, clippedBoxes: 0, arrowOverflow: 0, invalidGeometry: 0 });
    expect(repaired).toEqual(repairPublicationLayout(layout));
    expect(layout.stepBoxes[0].x).toBe(-100);
  });

  it('detects overlapping and overflowing publication text boxes', () => {
    const layout = calculateSchemeLayout(scheme);
    layout.textBoxes = [
      { id: 'title', x: 10, y: 10, width: 120, height: 20, text: 'Reaction' },
      { id: 'note', x: 80, y: 15, width: 120, height: 20, text: 'annotation' },
      { id: 'footer', x: 0, y: layout.canvasHeight - 5, width: 20, height: 20, text: 'out' },
    ];
    expect(measureSchemeLayout(layout)).toMatchObject({ textOverlaps: 1, textOverflow: 1 });
  });

  it('estimates multilingual text conservatively and feeds the publication gate', () => {
    const layout = calculateSchemeLayout(scheme);
    const title = estimatePublicationTextBox('title', '反応 Reaction', 10, 10, 12);
    layout.textBoxes = [title, { ...estimatePublicationTextBox('note', 'annotation', 10, 10, 12), width: 20 }];
    expect(title.width).toBeGreaterThan(70);
    expect(measureSchemeLayout(layout).textOverlaps).toBe(1);
  });
});
