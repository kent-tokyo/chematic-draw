import { captureRichCdxmlSession, cdxmlSessionLossWarnings, serializeCdxmlForPath } from '../renderer/lib/cdxmlWorkflow';

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

  it('patches atom coordinates while retaining rich page objects', () => {
    const source = '<CDXML>\n<page id="p1"><arrow id="keep"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page>\n</CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    const moved = { ...molecule(), atoms: [{ ...molecule().atoms[0], x: 12 }] };
    const output = serializeCdxmlForPath(moved, '/tmp/output.cdxml', session);
    expect(output).toContain('<arrow id="keep"/>');
    expect(output).toContain('p="12 0"');
  });

  it('does not rewrite atom-like tags outside chemistry fragments', () => {
    const source = '<CDXML><page id="p1"><group id="annotation"><n id="1" p="99 99" Element="6"/></group><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    const moved = { ...molecule(), atoms: [{ ...molecule().atoms[0], x: 12 }] };
    const output = serializeCdxmlForPath(moved, '/tmp/output.cdxml', session);
    expect(output).toContain('<group id="annotation"><n id="1" p="99 99" Element="6"/></group>');
    expect(output).toContain('<fragment id="1"><n id="1" p="12 0" Element="6"/></fragment>');
  });

  it('patches atom annotations and bond presentation without flattening the page', () => {
    const source = '<CDXML><page id="p1"><text id="caption"/><fragment id="1"><n id="1" p="0 0" Element="6"/><n id="2" p="10 0" Element="6"/><b id="7" B="1" E="2" Order="1" Custom="keep"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', { atoms: [{ ...molecule().atoms[0] }, { id: 2, element: 'C', x: 10, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 7, from: 1, to: 2, order: 1, stereo: 0 }] });
    const edited = { atoms: [{ ...session.molecule.atoms[0], charge: 1, display_label: 'N+' }, session.molecule.atoms[1]], bonds: [{ ...session.molecule.bonds[0], order: 2, stereo: 1 }] };
    const output = serializeCdxmlForPath(edited, '/tmp/output.cdxml', session);
    expect(output).toContain('<text id="caption"/>');
    expect(output).toContain('Charge="1"');
    expect(output).toContain('Label="N+"');
    expect(output).toContain('Order="2"');
    expect(output).toContain('Display="WedgeBegin"');
    expect(output).toContain('Custom="keep"');
  });

  it('patches atom map changes while retaining the rich page', () => {
    const source = '<CDXML><page id="p1"><fragment id="1"><n id="1" p="0 0" Element="6" Map="7"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', { atoms: [{ ...molecule().atoms[0], atom_map: 7 }], bonds: [] });
    const output = serializeCdxmlForPath({ atoms: [{ ...session.molecule.atoms[0], atom_map: 42 }], bonds: [] }, '/tmp/output.cdxml', session);
    expect(output).toContain('Map="42"');
  });

  it('patches single-fragment atom and bond additions while retaining page objects', () => {
    const source = '<CDXML><page id="p1"><arrow id="keep"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    const addedAtom = { id: 2, element: 'O', x: 10, y: 0, charge: 0, atom_map: 0 };
    const output = serializeCdxmlForPath({ atoms: [...session.molecule.atoms, addedAtom], bonds: [{ id: 1, from: 1, to: 2, order: 1, stereo: 0 }] }, '/tmp/output.cdxml', session);
    expect(output).toContain('<arrow id="keep"/>');
    expect(output).toContain('id="2"');
    expect(output).toContain('B="1" E="2"');
  });

  it('patches single-fragment atom and bond removal without leaving dangling references', () => {
    const source = '<CDXML><page id="p1"><text id="keep"/><fragment id="1"><n id="1" p="0 0" Element="6"/><n id="2" p="10 0" Element="8"/><b id="3" B="1" E="2" Order="1"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', { atoms: [{ ...molecule().atoms[0] }, { id: 2, element: 'O', x: 10, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 3, from: 1, to: 2, order: 1, stereo: 0 }] });
    const output = serializeCdxmlForPath({ atoms: [session.molecule.atoms[0]], bonds: [] }, '/tmp/output.cdxml', session);
    expect(output).toContain('<text id="keep"/>');
    expect(output).not.toContain('<n id="2"');
    expect(output).not.toContain('<b ');
  });

  it('patches existing-node removal across multiple fragments without flattening pages', () => {
    const source = '<CDXML><page id="p1"><fragment id="1"><n id="1" p="0 0" Element="6"/><n id="2" p="10 0" Element="8"/><b id="3" B="1" E="2" Order="1"/></fragment></page><page id="p2"><arrow id="keep"/><fragment id="2"><n id="4" p="0 0" Element="7"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', { atoms: [{ ...molecule().atoms[0] }, { id: 2, element: 'O', x: 10, y: 0, charge: 0, atom_map: 0 }, { id: 4, element: 'N', x: 0, y: 0, charge: 0, atom_map: 0 }], bonds: [{ id: 3, from: 1, to: 2, order: 1, stereo: 0 }] });
    const output = serializeCdxmlForPath({ atoms: [session.molecule.atoms[0], session.molecule.atoms[2]], bonds: [] }, '/tmp/output.cdxml', session);
    expect(output).toContain('<page id="p1">');
    expect(output).toContain('<page id="p2">');
    expect(output).toContain('<arrow id="keep"/>');
    expect(output).not.toContain('<n id="2"');
    expect(output).not.toContain('<b ');
  });

  it('places a connected addition in the owning fragment of its existing neighbor', () => {
    const source = '<CDXML><page id="p1"><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment><fragment id="2"><n id="4" p="20 0" Element="7"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', { atoms: [{ ...molecule().atoms[0] }, { id: 4, element: 'N', x: 20, y: 0, charge: 0, atom_map: 0 }], bonds: [] });
    const addedAtom = { id: 5, element: 'O', x: 30, y: 0, charge: 0, atom_map: 0 };
    const output = serializeCdxmlForPath({ atoms: [...session.molecule.atoms, addedAtom], bonds: [{ id: 8, from: 4, to: 5, order: 1, stereo: 0 }] }, '/tmp/output.cdxml', session);
    expect(output).toMatch(/<fragment id="1">[\s\S]*<\/fragment><fragment id="2">[\s\S]*id="5"[\s\S]*B="4" E="5"[\s\S]*<\/fragment>/);
  });

  it('keeps empty self-closing fragments when editing a populated fragment', () => {
    const source = '<CDXML><page id="p1"><fragment id="empty"/><fragment id="chem"><n id="1" p="0 0" Element="6"/></fragment><graphic id="keep"/></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    const moved = { atoms: [{ ...molecule().atoms[0], x: 4, y: 5 }], bonds: [] };
    const output = serializeCdxmlForPath(moved, '/tmp/output.cdxml', session);
    expect(output).toContain('<fragment id="empty"/>');
    expect(output).toContain('<graphic id="keep"/>');
    expect(output).toContain('p="4 -5"');
  });

  it('falls back when a new component has no fragment owner', () => {
    const source = '<CDXML><page id="p1"><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment><fragment id="2"><n id="4" p="20 0" Element="7"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', { atoms: [{ ...molecule().atoms[0] }, { id: 4, element: 'N', x: 20, y: 0, charge: 0, atom_map: 0 }], bonds: [] });
    const addedAtom = { id: 5, element: 'O', x: 30, y: 0, charge: 0, atom_map: 0 };
    const output = serializeCdxmlForPath({ atoms: [...session.molecule.atoms, addedAtom], bonds: [] }, '/tmp/output.cdxml', session);
    expect(output).toContain('<fragment id="1" Name="chematic-draw">');
    expect(output).not.toContain('<page id="p1">');
    expect(output).not.toContain('<fragment id="2">');
  });

  it('does not reuse a rich source for a non-CDXML destination', () => {
    const source = '<CDXML>\n<page id="p1"><arrow id="keep"/></page>\n</CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    expect(serializeCdxmlForPath(molecule(), '/tmp/output.mol', session)).not.toBe(source);
  });

  it('reports presentation loss before an edited rich CDXML falls back to molecule-only output', () => {
    const source = '<CDXML><page id="p1" Width="612"><t id="title" p="0 0"><s font="Arial">Title</s></t><graphic id="g1"></graphic><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page><page id="p2"><fragment id="2"><n id="2" p="0 0" Element="8"/></fragment></page></CDXML>';
    const session = captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule());
    expect(cdxmlSessionLossWarnings(session)).toEqual([
      'Unsupported CDXML presentation objects will be dropped: graphic',
      'The edited molecule-only CDXML fallback cannot retain multiple page boundaries.',
      'The edited molecule-only CDXML fallback cannot retain page text and reaction annotations.',
    ]);
  });

  it('does not classify supported styled text runs as presentation loss', () => {
    const source = '<CDXML><page id="p1"><t id="note" p="0 0"><s font="Arial">Note</s></t><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    expect(cdxmlSessionLossWarnings(captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule()))).toEqual([
      'The edited molecule-only CDXML fallback cannot retain page text and reaction annotations.',
    ]);
  });

  it('does not warn for a plain single-fragment CDXML source', () => {
    const session = captureRichCdxmlSession('<CDXML><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></CDXML>', '/tmp/source.cdxml', molecule());
    expect(cdxmlSessionLossWarnings(session)).toEqual([]);
  });

  it('does not warn for simple self-closing graphics', () => {
    const source = '<CDXML><page id="p1"><graphic id="g1" GraphicType="Line"/><fragment id="1"><n id="1" p="0 0" Element="6"/></fragment></page></CDXML>';
    expect(cdxmlSessionLossWarnings(captureRichCdxmlSession(source, '/tmp/source.cdxml', molecule()))).toEqual([]);
  });
});
