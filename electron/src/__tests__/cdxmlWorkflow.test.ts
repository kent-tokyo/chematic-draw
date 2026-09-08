import { captureRichCdxmlSession, serializeCdxmlForPath } from '../renderer/lib/cdxmlWorkflow';

const molecule = (element = 'C') => ({
  atoms: [{ id: 1, element, x: 0, y: 0, charge: 0, atom_map: 0 }],
  bonds: [],
});

describe('rich CDXML workflow preservation', () => {
  it('keeps the original document when chemistry has not changed', () => {
    const source = '<CDXML>\n<page id="p1"><arrow id="keep"/></page>\n</CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    expect(serializeCdxmlForPath(molecule(), '/tmp/output.cdxml', session)).toBe(source);
  });

  it('falls back to the explicit molecule writer after a chemistry edit', () => {
    const source = '<CDXML>\n<page id="p1"><arrow id="keep"/></page>\n</CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    const output = serializeCdxmlForPath(molecule('N'), '/tmp/output.cdxml', session);
    expect(output).not.toBe(source);
    expect(output).toContain('Element="7"');
  });

  it('falls back after an atom coordinate edit', () => {
    const source = '<CDXML>\n<page id="p1"><arrow id="keep"/></page>\n</CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    const moved = { ...molecule(), atoms: [{ ...molecule().atoms[0], x: 12 }] };
    expect(serializeCdxmlForPath(moved, '/tmp/output.cdxml', session)).not.toBe(source);
  });

  it('does not reuse a rich source for a non-CDXML destination', () => {
    const source = '<CDXML>\n<page id="p1"><arrow id="keep"/></page>\n</CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    expect(serializeCdxmlForPath(molecule(), '/tmp/output.mol', session)).not.toBe(source);
  });
});
