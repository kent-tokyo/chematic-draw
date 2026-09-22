import { exportCdxmlDocument } from '../renderer/lib/cdxmlExport';
import { parseCdxmlDocument } from '../renderer/lib/cdxmlDocumentParser';

describe('CDXML document page round-trip', () => {
  it('keeps all molecule fragments on a page', () => {
    const xml = '<CDXML><page id="p1"><fragment id="f1"><n id="1" p="0 0" Element="6"/></fragment><fragment id="f2"><n id="2" p="20 0" Element="8"/><n id="3" p="30 0" Element="1"/><b B="2" E="3" Order="1"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(xml);
    expect(parsed.pages[0].molecule.atoms.map((atom) => atom.element)).toEqual(['C', 'O', 'H']);
    expect(parsed.pages[0].molecule.bonds).toEqual([{ id: 1, from: 2, to: 3, order: 1, stereo: 0 }]);
  });

  it('accepts empty self-closing fragments used by document exporters', () => {
    const parsed = parseCdxmlDocument('<CDXML><page id="p1"><fragment id="empty"/><fragment id="chem"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>');
    expect(parsed.pages[0].molecule.atoms).toHaveLength(1);
    expect(parsed.pages[0].contentOrder).toEqual([
      { kind: 'fragment', id: 'empty' },
      { kind: 'fragment', id: 'chem' },
    ]);
  });

  it('accepts presentation-only pages without inventing a chemistry fragment', () => {
    const parsed = parseCdxmlDocument('<CDXML><page id="p1"><graphic id="g1"/><arrow id="a1" Begin="0 0" End="10 10"/></page></CDXML>');
    expect(parsed.pages[0].molecule).toEqual({ atoms: [], bonds: [] });
    expect(parsed.pages[0].graphics).toEqual([{ id: 'g1' }]);
    expect(parsed.pages[0].arrows).toEqual([{ id: 'a1', x1: 0, y1: 0, x2: 10, y2: -10, label: undefined }]);
  });

  it('imports fragments nested in groups while keeping presentation-only groups opaque', () => {
    const parsed = parseCdxmlDocument('<CDXML><page id="p1"><group id="chem-group"><fragment id="nested"><n id="1" p="0 0" Element="8"/></fragment></group><group id="art-group"><arrow id="nested-arrow" Begin="0 0" End="1 1"/></group></page></CDXML>');
    expect(parsed.pages[0].molecule.atoms.map((atom) => atom.element)).toEqual(['O']);
    expect(parsed.pages[0].objects).toEqual([{ id: 'art-group', tag: 'group', rawXml: '<group id="art-group"><arrow id="nested-arrow" Begin="0 0" End="1 1"/></group>' }]);
  });

  it('preserves page count, dimensions, annotations, and fragment chemistry', () => {
    const source = { pages: [{ id: 'one', title: 'One', width: 612, height: 792, attributes: { ShowPageBreaks: 'yes' }, molecule: { atoms: [{ id: 10, element: 'O', x: 2, y: 3, charge: -1, atom_map: 0, display_label: 'OH' }], bonds: [] }, text: [{ id: 'note', x: 4, y: 5, value: 'note' }], graphics: [{ id: 'g1', attributes: { GraphicType: 'Line', BoundingBox: '0 0 10 10', Note: 'A & B' } }], arrows: [{ id: 'arrow', x1: 0, y1: 0, x2: 10, y2: 10, label: 'heat' }] }, { id: 'two', molecule: { atoms: [], bonds: [] } }] };
    const parsed = parseCdxmlDocument(exportCdxmlDocument(source));
    expect(parsed.pages[0]).toMatchObject(source.pages[0]);
    expect(parsed.pages[0].contentOrder).toEqual([
      { kind: 'title', id: 'one-title' }, { kind: 'text', id: 'note' },
      { kind: 'graphic', id: 'g1' }, { kind: 'arrow', id: 'arrow' }, { kind: 'fragment', id: '1' },
    ]);
  });

  it('decodes escaped and numeric entities in annotations and labels', () => {
    const xml = '<?xml version="1.0"?><CDXML><page id="p1" Width="612" Height="792" Note="A &amp; B"><t id="p1-title" p="0 0" Label="&quot;Title&quot;"/><t id="note" p="1 -2" Label="A &#x26; B &#38; C"/><fragment id="1"><n id="1" p="0 0" Element="6" Label="C &lt;tag&gt;"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(xml);
    expect(parsed.pages[0].title).toBe('"Title"');
    expect(parsed.pages[0].text?.[0].value).toBe('A & B & C');
    expect(parsed.pages[0].molecule.atoms[0].display_label).toBe('C <tag>');
    expect(parsed.pages[0].attributes).toEqual({ Note: 'A & B' });
  });

  it('preserves valid atom map numbers and rejects invalid ones', () => {
    const parsed = parseCdxmlDocument('<CDXML><fragment id="1"><n id="1" p="0 0" Element="6" Map="42"/></fragment></CDXML>');
    expect(parsed.pages[0].molecule.atoms[0].atom_map).toBe(42);
    expect(() => parseCdxmlDocument('<CDXML><fragment id="1"><n id="1" p="0 0" Element="6" Map="65536"/></fragment></CDXML>')).toThrow(/Invalid CDXML atom map/);
  });

  it('rejects an unsupported atomic number instead of silently converting it to carbon', () => {
    expect(() => parseCdxmlDocument('<CDXML><fragment id="1"><n id="1" p="0 0" Element="999"/></fragment></CDXML>'))
      .toThrow('Unsupported CDXML element atomic number: 999');
  });

  it('round-trips common transition and post-transition elements', () => {
    const parsed = parseCdxmlDocument('<CDXML><fragment id="1"><n id="1" p="0 0" Element="26"/><n id="2" p="20 0" Element="79"/><n id="3" p="40 0" Element="82"/></fragment></CDXML>');
    expect(parsed.pages[0].molecule.atoms.map((atom) => atom.element)).toEqual(['Fe', 'Au', 'Pb']);
    expect(parseCdxmlDocument(exportCdxmlDocument(parsed)).pages[0].molecule.atoms.map((atom) => atom.element)).toEqual(['Fe', 'Au', 'Pb']);
  });

  it('reads styled container text instead of dropping nested CDXML text', () => {
    const xml = '<CDXML><page id="p1"><t id="p1-title" p="0 0"><s font="Arial">A &amp; </s><s>title</s></t><t id="note" p="2 -3"><s>See </s><s>Figure 1</s></t><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(xml);
    expect(parsed.pages[0].title).toBe('A & title');
    expect(parsed.pages[0].titleRuns).toEqual([{ value: 'A & ' , attributes: { font: 'Arial' } }, { value: 'title' }]);
    expect(parsed.pages[0].text).toEqual([{ id: 'note', x: 2, y: 3, value: 'See Figure 1', runs: [{ value: 'See ' }, { value: 'Figure 1' }] }]);
  });

  it('accepts XML single-quoted attributes', () => {
    const parsed = parseCdxmlDocument("<CDXML><page id='p1' Note='A &amp; B'><fragment id='1'><n id='1' p='0 0' Element='8' Label='O&apos;H'/></fragment></page></CDXML>");
    expect(parsed.pages[0].attributes).toEqual({ Note: 'A & B' });
    expect(parsed.pages[0].molecule.atoms[0].display_label).toBe("O'H");
  });

  it('uses the deterministic fallback page id when recovering an unlabelled page title', () => {
    const parsed = parseCdxmlDocument('<CDXML><page><t id="page-1-title" p="0 0" Label="Fallback title"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>');
    expect(parsed.pages[0].id).toBe('page-1');
    expect(parsed.pages[0].title).toBe('Fallback title');
    expect(parsed.pages[0].contentOrder).toContainEqual({ kind: 'title', id: 'page-1-title' });
  });

  it('preserves simple self-closing graphic attributes', () => {
    const parsed = parseCdxmlDocument('<CDXML><page id="p1"><graphic id="g1" GraphicType="Line" BoundingBox="0 0 10 10" Note="A &amp; B"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>');
    expect(parsed.pages[0].graphics).toEqual([{ id: 'g1', attributes: { GraphicType: 'Line', BoundingBox: '0 0 10 10', Note: 'A & B' } }]);
  });

  it('preserves grouped page objects and their z-order as opaque XML', () => {
    const source = '<CDXML><page id="p1"><graphic id="before"/><group id="g1" Unknown="keep"><arrow id="nested" Custom="keep"/></group><graphic id="after"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(source);
    expect(parsed.pages[0].objects).toEqual([{ id: 'g1', tag: 'group', rawXml: '<group id="g1" Unknown="keep"><arrow id="nested" Custom="keep"/></group>' }]);
    expect(parsed.pages[0].arrows).toBeUndefined();
    expect(parsed.pages[0].contentOrder).toEqual([
      { kind: 'graphic', id: 'before' }, { kind: 'object', id: 'g1' },
      { kind: 'graphic', id: 'after' }, { kind: 'fragment', id: '1' },
    ]);
    const roundTripped = exportCdxmlDocument(parsed);
    expect(roundTripped.indexOf('<graphic id="before"/>')).toBeLessThan(roundTripped.indexOf('<group id="g1"'));
    expect(roundTripped.indexOf('<group id="g1"')).toBeLessThan(roundTripped.indexOf('<graphic id="after"/>'));
    expect(roundTripped).toContain('<arrow id="nested" Custom="keep"/>');
  });

  it('preserves validated basic graphic children and their entities', () => {
    const source = '<CDXML><page id="p1"><graphic id="g1" GraphicType="Rectangle"><line BoundingBox="0 0 10 10" Note="A &amp; B"/><ellipse BoundingBox="1 2 3 4"/></graphic><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(source);
    expect(parsed.pages[0].graphics).toEqual([{
      id: 'g1',
      attributes: { GraphicType: 'Rectangle' },
      children: [
        { name: 'line', attributes: { BoundingBox: '0 0 10 10', Note: 'A & B' } },
        { name: 'ellipse', attributes: { BoundingBox: '1 2 3 4' } },
      ],
    }]);
    expect(parseCdxmlDocument(exportCdxmlDocument(parsed))).toEqual(parsed);
  });

  it('preserves text content in a direct graphic child and rejects nested markup', () => {
    const parsed = parseCdxmlDocument('<CDXML><page id="p1"><graphic id="g1"><path d="M 0 0">path data &amp; more</path></graphic><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>');
    expect(parsed.pages[0].graphics?.[0].children).toEqual([{ name: 'path', attributes: { d: 'M 0 0' }, content: 'path data & more' }]);
    expect(parseCdxmlDocument(exportCdxmlDocument(parsed))).toEqual(parsed);
    expect(() => parseCdxmlDocument('<CDXML><page id="p1"><graphic id="g1"><path><line/></path></graphic><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>')).toThrow(/graphic child markup/);
  });

  it('preserves text-node font and layout attributes', () => {
    const xml = '<CDXML><page id="p1"><t id="note" p="2 -3" Font="Arial" Size="12" Justification="center" Label="Styled"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(xml);
    expect(parsed.pages[0].text).toEqual([{ id: 'note', x: 2, y: 3, value: 'Styled', attributes: { Font: 'Arial', Size: '12', Justification: 'center' } }]);
    expect(parseCdxmlDocument(exportCdxmlDocument(parsed))).toEqual(parsed);
  });

  it('preserves validated page and graphic transform matrices', () => {
    const source = '<CDXML><page id="p1" Matrix="1 0 0 1 12 -8"><graphic id="g1" Matrix="0 -1 1 0 20 30"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const parsed = parseCdxmlDocument(source);
    expect(parsed.pages[0].transform).toEqual({ a: 1, b: 0, c: 0, d: 1, tx: 12, ty: -8 });
    expect(parsed.pages[0].graphics?.[0].transform).toEqual({ a: 0, b: -1, c: 1, d: 0, tx: 20, ty: 30 });
    expect(parseCdxmlDocument(exportCdxmlDocument(parsed)).pages[0]).toMatchObject(parsed.pages[0]);
  });

  it.each(['1 0 0', '1 0 NaN 1 0 0'])('rejects malformed transform matrices: %s', (matrix) => {
    expect(() => parseCdxmlDocument(`<CDXML><page id="p1" Matrix="${matrix}"><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>`)).toThrow(/Invalid CDXML page matrix/);
  });

  it('recovers and reapplies page child order', () => {
    const xml = '<CDXML><page id="p1"><fragment id="f1"><n id="1" p="0 0" Element="6"/></fragment><graphic id="g1"/><t id="note" p="1 1" Label="Note"/><arrow id="a1" Begin="0 0" End="2 2"/></page></CDXML>';
    const parsed = parseCdxmlDocument(xml);
    expect(parsed.pages[0].contentOrder).toEqual([
      { kind: 'fragment', id: 'f1' }, { kind: 'graphic', id: 'g1' },
      { kind: 'text', id: 'note' }, { kind: 'arrow', id: 'a1' },
    ]);
    const output = exportCdxmlDocument(parsed);
    expect(output.indexOf('<fragment')).toBeLessThan(output.indexOf('<graphic'));
    expect(output.indexOf('<graphic')).toBeLessThan(output.indexOf('<t'));
    expect(output.indexOf('<t')).toBeLessThan(output.indexOf('<arrow'));
  });

  it.each(['NaN', 'Infinity', '1.5'])('rejects invalid integer CDXML values: %s', (charge) => {
    const xml = `<CDXML><fragment id="1"><n id="1" p="0 0" Element="6" Charge="${charge}"/></fragment></CDXML>`;
    expect(() => parseCdxmlDocument(xml)).toThrow(/Invalid CDXML charge/);
  });

  it('rejects invalid page dimensions', () => {
    expect(() => parseCdxmlDocument('<CDXML><page id="p1" Width="NaN"><fragment id="1"></fragment></page></CDXML>')).toThrow(/page width/);
  });
});
