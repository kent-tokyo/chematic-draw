import * as fs from 'fs';
import * as path from 'path';
import { measureSchemeLayout } from '../renderer/lib/layoutMetrics';
import { calculateSchemeLayout } from '../renderer/lib/schemeLayout';
import { exportSchemeAsSVG } from '../renderer/lib/schemeExport';
import { isSafeSvgForPdf } from '../lib/pdfExportContract';
import { svgPageSizeInches } from '../lib/svgPageSize';
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

  it('keeps the complete SVG golden corpus safe and PDF-sizeable', () => {
    const names = fs.readdirSync(fixtureDir).filter((name) => name.endsWith('.svg')).sort();
    expect(names.length).toBeGreaterThanOrEqual(3);
    for (const name of names) {
      const svg = fs.readFileSync(path.join(fixtureDir, name), 'utf8');
      expect(isSafeSvgForPdf(svg)).toBe(true);
      const page = svgPageSizeInches(svg);
      expect(page.width).toBeGreaterThanOrEqual(0.1);
      expect(page.height).toBeGreaterThanOrEqual(0.1);
      expect(page.width).toBeLessThanOrEqual(100);
      expect(page.height).toBeLessThanOrEqual(100);
    }
  });

  it('requires zero automatic layout defects for the publication baseline', () => {
    const scheme: ReactionSchemeContext = { id: 'publication', title: 'Publication', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
      { id: 'two', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    expect(measureSchemeLayout(calculateSchemeLayout(scheme))).toMatchObject({ boxOverlaps: 0, arrowCrossings: 0, clippedBoxes: 0, arrowOverflow: 0, textOverlaps: 0, textOverflow: 0, invalidGeometry: 0 });
  });

  it('refuses to publish a layout with clipped or overlapping geometry', () => {
    const scheme: ReactionSchemeContext = { id: 'invalid-publication', title: 'Invalid', currentStepIndex: 0, viewMode: 'scheme', steps: [{ id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' }] };
    const layout = calculateSchemeLayout(scheme);
    expect(() => exportSchemeAsSVG(scheme, { ...layout, stepBoxes: [{ ...layout.stepBoxes[0], x: -1 }] }, null, null)).toThrow('Publication layout failed');
  });

  it('keeps scheme SVG output byte-identical across repeated exports', () => {
    const scheme: ReactionSchemeContext = { id: 'stable', title: 'Stable', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    const layout = calculateSchemeLayout(scheme);
    expect(exportSchemeAsSVG(scheme, layout, null, null)).toBe(exportSchemeAsSVG(scheme, layout, null, null));
  });

  it('offers a deterministic monochrome journal preset', () => {
    const scheme: ReactionSchemeContext = { id: 'preset', title: 'Preset', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    const layout = calculateSchemeLayout(scheme);
    const journal = exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal' });
    const screen = exportSchemeAsSVG(scheme, layout, null, null, { preset: 'screen' });
    expect(journal).toContain('fill: #ffffff');
    expect(journal).toContain('font-family: Arial, Helvetica, sans-serif');
    expect(journal).not.toBe(screen);
    expect(exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal' })).toBe(journal);
  });

  it('supports deterministic compact and large publication text scales', () => {
    const scheme: ReactionSchemeContext = { id: 'font-scale', title: 'Font scale', currentStepIndex: 0, viewMode: 'scheme', steps: [{ id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' }] };
    const layout = calculateSchemeLayout(scheme);
    const compact = exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal', fontScale: 'compact' });
    const standard = exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal', fontScale: 'standard' });
    const large = exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal', fontScale: 'large' });
    expect(compact).toContain('.step-title { font-size: 11.90px;');
    expect(standard).toContain('.step-title { font-size: 14.00px;');
    expect(large).toContain('.step-title { font-size: 16.80px;');
    expect(compact).not.toBe(standard);
    expect(large).not.toBe(standard);
  });

  it('fits publication output to an explicit A4 page without changing the content contract', () => {
    const scheme: ReactionSchemeContext = { id: 'a4', title: 'A4', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    const layout = calculateSchemeLayout(scheme);
    const svg = exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal', pageSize: 'a4' });
    expect(svg).toContain('width="794" height="1123" viewBox="0 0 794 1123"');
    expect(svg).toContain('<g transform="translate(');
    expect(svg).toContain('scale(');
    expect(svg).toBe(exportSchemeAsSVG(scheme, layout, null, null, { preset: 'journal', pageSize: 'a4' }));
  });

  it('renders molecule connectivity and element labels in publication SVG', () => {
    const scheme: ReactionSchemeContext = { id: 'molecule-svg', title: 'Molecule SVG', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [{ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, { id: 2, element: 'O', x: 1.4, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] }], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    const svg = exportSchemeAsSVG(scheme, calculateSchemeLayout(scheme), null, null, { preset: 'journal' });
    expect(svg).toContain('class="molecule"');
    expect(svg).toContain('>C</text>');
    expect(svg).toContain('>O</text>');
    expect(svg).toContain('stroke-width="1.2"');
  });

  it('preserves stereobonds, isotope labels, and formal charges in publication SVG', () => {
    const molecule = { atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 1, atom_map: 0, isotope: 13 }, { id: 2, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 1 }] };
    const scheme: ReactionSchemeContext = { id: 'stereo-svg', title: 'Stereo SVG', currentStepIndex: 0, viewMode: 'scheme', steps: [{ id: 'one', reactants: [molecule], products: [], arrows: [], mechanismType: 'sn2' }] };
    const svg = exportSchemeAsSVG(scheme, calculateSchemeLayout(scheme), null, null, { preset: 'journal' });
    expect(svg).toContain('class="stereo-wedge"');
    expect(svg).toContain('>13</text>');
    expect(svg).toContain('>+1</text>');
  });

  it('shows stoichiometric coefficients, agents, and conditions in publication SVG', () => {
    const scheme: ReactionSchemeContext = { id: 'metadata-svg', title: 'Metadata SVG', currentStepIndex: 0, viewMode: 'scheme', steps: [{
      id: 'one', reactants: [{ atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [] }], products: [], agents: [], reactantCoefficients: [2], productCoefficients: [], arrows: [], mechanismType: 'sn2', conditions: { temperature: '80 C', catalyst: 'Pd' },
    }] };
    const svg = exportSchemeAsSVG(scheme, calculateSchemeLayout(scheme), null, null, { preset: 'journal' });
    expect(svg).toContain('Reactants: 1 [2]');
    expect(svg).toContain('Agents: 0');
    expect(svg).toContain('temperature: 80 C · catalyst: Pd');
  });

  it('renders the authored reaction arrow type instead of flattening every step to one arrow', () => {
    const exportFor = (arrowType: 'single' | 'double' | 'equilibrium' | 'retro') => exportSchemeAsSVG(
      { id: arrowType, title: arrowType, currentStepIndex: 0, viewMode: 'scheme', steps: [
        { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2', arrowType },
        { id: 'two', reactants: [], products: [], arrows: [], mechanismType: 'sn2', arrowType: 'single' },
      ] },
      calculateSchemeLayout({ id: arrowType, title: arrowType, currentStepIndex: 0, viewMode: 'scheme', steps: [
        { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2', arrowType },
        { id: 'two', reactants: [], products: [], arrows: [], mechanismType: 'sn2', arrowType: 'single' },
      ] }),
      null,
      null,
      { preset: 'journal' },
    );
    const count = (svg: string, pattern: RegExp) => svg.match(pattern)?.length ?? 0;
    expect(count(exportFor('single'), /class="arrow-line"/g)).toBe(1);
    expect(count(exportFor('double'), /class="arrow-line"/g)).toBe(2);
    expect(count(exportFor('equilibrium'), /class="arrow-line"/g)).toBe(2);
    const retro = exportFor('retro').match(/<line x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)"/);
    expect(retro).not.toBeNull();
    expect(Number(retro![1])).toBeGreaterThan(Number(retro![2]));
  });

  it('escapes authored titles before placing them in SVG text', () => {
    const scheme: ReactionSchemeContext = { id: 'escaped', title: '<script>alert("x")</script> & test', currentStepIndex: 0, viewMode: 'scheme', steps: [
      { id: 'one', reactants: [], products: [], arrows: [], mechanismType: 'sn2' },
    ] };
    const svg = exportSchemeAsSVG(scheme, calculateSchemeLayout(scheme), null, null, { preset: 'journal' });
    expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; test');
    expect(svg).not.toContain('<script>alert');
  });
});
