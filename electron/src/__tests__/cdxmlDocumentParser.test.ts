import { exportCdxmlDocument } from '../renderer/lib/cdxmlExport';
import { parseCdxmlDocument } from '../renderer/lib/cdxmlDocumentParser';

describe('CDXML document page round-trip', () => {
  it('preserves page count, dimensions, annotations, and fragment chemistry', () => {
    const source = { pages: [{ id: 'one', title: 'One', width: 612, height: 792, attributes: { ShowPageBreaks: 'yes' }, molecule: { atoms: [{ id: 10, element: 'O', x: 2, y: 3, charge: -1, atom_map: 0, display_label: 'OH' }], bonds: [] }, text: [{ id: 'note', x: 4, y: 5, value: 'note' }], arrows: [{ id: 'arrow', x1: 0, y1: 0, x2: 10, y2: 10, label: 'heat' }] }, { id: 'two', molecule: { atoms: [], bonds: [] } }] };
    expect(parseCdxmlDocument(exportCdxmlDocument(source))).toEqual(source);
  });
});
