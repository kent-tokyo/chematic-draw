/** @jest-environment node */
import { cdxmlDocumentLosses, exportCdxml, exportCdxmlDocument } from '../renderer/lib/cdxmlExport';
import { parseCdxmlDocument } from '../renderer/lib/cdxmlDocumentParser';
import type { MoleculeDto } from '../renderer/store/types';

const molecule: MoleculeDto = {
  atoms: [
    { id: 10, element: 'C', x: 0, y: 12, charge: 0, atom_map: 0 },
    { id: 20, element: 'O', x: 40, y: 12, charge: -1, atom_map: 0, isotope: 18 },
  ],
  bonds: [{ id: 99, from: 10, to: 20, order: 2, stereo: 0 }],
};

describe('CDXML writer', () => {
  it('writes multiple pages with labels, text, arrows, and stereo attributes', () => {
    const xml = exportCdxmlDocument({ pages: [{ id: 'p1', title: 'Page 1', width: 612, height: 792, molecule: { atoms: [{ id: 1, element: 'C', x: 1, y: 2, charge: 0, atom_map: 0, display_label: 'Me' }], bonds: [] }, text: [{ id: 'note', x: 3, y: 4, value: 'A & B' }], arrows: [{ id: 'a1', x1: 0, y1: 0, x2: 10, y2: 10, label: 'heat' }] }, { id: 'p2', molecule: { atoms: [], bonds: [] } }] });
    expect(xml.match(/<page /g)).toHaveLength(2);
    expect(xml).toContain('Width="612"');
    expect(xml).toContain('Label="A &amp; B"');
    expect(xml).toContain('<arrow');
    expect(xml).toContain('Label="Me"');
  });
  it('round-trips the supported corpus through the real CDXML parser', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wasm = require('../renderer/wasm/pkg-node/chem_wasm') as { parse_any: (text: string) => MoleculeDto };
    for (const fixture of [molecule, {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'C', x: 40, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 80, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 2, stereo: 0 },
      ],
    } satisfies MoleculeDto]) {
      const parsed = wasm.parse_any(exportCdxml(fixture));
      expect(parsed.atoms).toHaveLength(fixture.atoms.length);
      expect(parsed.bonds).toHaveLength(fixture.bonds.length);
      expect(parsed.atoms.map((atom) => atom.element).sort()).toEqual(fixture.atoms.map((atom) => atom.element).sort());
      expect(parsed.bonds.map((bond) => bond.order).sort()).toEqual(fixture.bonds.map((bond) => bond.order).sort());
    }
  });

  it('writes the supported node and bond subset with stable local ids', () => {
    const xml = exportCdxml(molecule);
    expect(xml).toContain('<CDXML>');
    expect(xml).toContain('<fragment id="1" Name="chematic-draw">');
    expect(xml).toContain('<n id="10" p="0 -12" Element="6"/>');
    expect(xml).toContain('<n id="20" p="40 -12" Element="8" Charge="-1" Isotope="18"/>');
    expect(xml).toContain('<b B="10" E="20" Order="2"/>');
  });

  it('writes atom map numbers for reaction round-trips', () => {
    const xml = exportCdxml({ ...molecule, atoms: molecule.atoms.map((atom, index) => ({ ...atom, atom_map: index === 0 ? 42 : 0 })) });
    expect(xml).toContain('Map="42"');
    expect(parseCdxmlDocument(xml).pages[0].molecule.atoms[0].atom_map).toBe(42);
  });

  it('rejects elements outside the supported CDXML mapping', () => {
    expect(() => exportCdxml({ ...molecule, atoms: [{ ...molecule.atoms[0], element: 'Xx' }] }))
      .toThrow('CDXML does not support element: Xx');
  });

  it('reports the supported-subset loss matrix before export', () => {
    const losses = cdxmlDocumentLosses({ pages: [{ id: 'p1', width: -1, molecule: {
      atoms: [{ ...molecule.atoms[0], wildcard: true }, { ...molecule.atoms[1], element: 'Xx' }],
      bonds: [{ ...molecule.bonds[0], order: 9 }],
    } }] });
    expect(losses.map((loss) => loss.code)).toEqual(['invalid-page', 'wildcard-atom', 'unsupported-element', 'unsupported-bond']);
  });

  it('exports styled text runs and preserves their attributes on parse', () => {
    const source = { pages: [{ id: 'p1', title: 'Styled', titleRuns: [{ value: 'Styled', attributes: { font: 'Arial', size: '12' } }], molecule: { atoms: [], bonds: [] }, text: [{ id: 'note', x: 1, y: 2, value: 'A & B', runs: [{ value: 'A ', attributes: { font: 'Arial' } }, { value: '& B', attributes: { face: 'Bold' } }] }] }] };
    const parsed = parseCdxmlDocument(exportCdxmlDocument(source));
    expect(parsed.pages[0].titleRuns).toEqual(source.pages[0].titleRuns);
    expect(parsed.pages[0].text).toEqual(source.pages[0].text);
  });

  it('rejects invalid or reserved custom page attribute names', () => {
    expect(() => exportCdxmlDocument({ pages: [{ id: 'p1', molecule, attributes: { 'bad name': 'x' } }] })).toThrow('invalid or reserved attribute name');
    expect(() => exportCdxmlDocument({ pages: [{ id: 'p1', molecule, attributes: { Width: 'override' } }] })).toThrow('invalid or reserved attribute name');
  });

  it('writes page and graphic transform matrices without duplicating Matrix attributes', () => {
    const xml = exportCdxmlDocument({ pages: [{ id: 'p1', transform: { a: 1, b: 0, c: 0, d: 1, tx: 4, ty: 5 }, graphics: [{ id: 'g1', transform: { a: 0, b: -1, c: 1, d: 0, tx: 10, ty: 20 }, attributes: { GraphicType: 'Line' } }], molecule }] });
    expect(xml).toContain('Matrix="1 0 0 1 4 5"');
    expect(xml).toContain('Matrix="0 -1 1 0 10 20"');
    expect(xml.match(/Matrix=/g)).toHaveLength(2);
  });

  it('writes validated graphic children without allowing nested graphic markup', () => {
    const xml = exportCdxmlDocument({ pages: [{ id: 'p1', graphics: [{ id: 'g1', children: [{ name: 'line', attributes: { BoundingBox: '0 0 10 10' }, content: 'path data' }] }], molecule }] });
    expect(xml).toContain('<line BoundingBox="0 0 10 10">path data</line>');
    expect(exportCdxmlDocument({ pages: [{ id: 'p1', graphics: [{ id: 'g1', children: [{ name: 'line', attributes: { BoundingBox: '0 0 10 10' } }] }], molecule }] })).toContain('<line BoundingBox="0 0 10 10"/>');
    expect(() => exportCdxmlDocument({ pages: [{ id: 'p1', graphics: [{ id: 'g1', children: [{ name: 'graphic' }] }], molecule }] })).toThrow(/invalid child tag/);
    expect(() => exportCdxmlDocument({ pages: [{ id: 'p1', graphics: [{ id: 'g1', children: [{ name: 'line', content: '<nested/>' }] }], molecule }] })).toThrow(/invalid XML content/);
  });
});
