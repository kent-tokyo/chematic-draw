import * as fs from 'fs';
import * as path from 'path';
import { measureSchemeLayout } from '../renderer/lib/layoutMetrics';
import { calculateSchemeLayout } from '../renderer/lib/schemeLayout';
import { exportSchemeAsSVG } from '../renderer/lib/schemeExport';
import { ReactionSchemeContext } from '../renderer/store/types';

const fixtureDir = path.join(__dirname, '../renderer/wasm/__fixtures__/golden-svg');

describe('publication artifact gate', () => {
  it('keeps committed SVG goldens bounded and free of executable content', () => {
    for (const name of ['benzene', 'caffeine', 'ring-chain-ring']) {
      const svg = fs.readFileSync(path.join(fixtureDir, `${name}.svg`), 'utf8');
      expect(svg).toMatch(/^<svg /);
      expect(svg).not.toMatch(/<script|on[a-z]+\s*=|javascript:/i);
      const size = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
      expect(size).not.toBeNull();
      expect(Number(size![3])).toBeGreaterThan(0);
      expect(Number(size![4])).toBeGreaterThan(0);
    }
  });

  it('requires zero automatic layout defects for the publication baseline', () => {
    const scheme: ReactionSchemeContext = { id: 'publication', title: 'Publication', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
      { id: 'two', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    expect(measureSchemeLayout(calculateSchemeLayout(scheme))).toMatchObject({ boxOverlaps: 0, arrowCrossings: 0, clippedBoxes: 0, arrowOverflow: 0, textOverlaps: 0, textOverflow: 0, invalidGeometry: 0 });
  });

  it('keeps scheme SVG output byte-identical across repeated exports', () => {
    const scheme: ReactionSchemeContext = { id: 'stable', title: 'Stable', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    const layout = calculateSchemeLayout(scheme);
    expect(exportSchemeAsSVG(scheme, layout, null, null)).toBe(exportSchemeAsSVG(scheme, layout, null, null));
  });
});
