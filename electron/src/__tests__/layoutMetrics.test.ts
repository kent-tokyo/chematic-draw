import { calculateSchemeLayout } from '../renderer/lib/schemeLayout';
import { measureSchemeLayout } from '../renderer/lib/layoutMetrics';
import { ReactionSchemeContext } from '../renderer/store/types';

const scheme: ReactionSchemeContext = { id: 'golden', title: 'Golden', currentStepIndex: 0, viewMode: 'scheme', steps: [
  { id: 's1', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
  { id: 's2', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
] };

describe('publication layout metrics', () => {
  it('has no box overlap, crossing, or clipping for the deterministic baseline', () => {
    const layout = calculateSchemeLayout(scheme);
    expect(measureSchemeLayout(layout)).toMatchObject({ boxOverlaps: 0, arrowCrossings: 0, clippedBoxes: 0, arrowOverflow: 0 });
  });

  it('detects clipping rather than hiding it in a derived label', () => {
    const layout = calculateSchemeLayout(scheme);
    layout.stepBoxes[0].x = -1;
    expect(measureSchemeLayout(layout).clippedBoxes).toBe(1);
  });
});
