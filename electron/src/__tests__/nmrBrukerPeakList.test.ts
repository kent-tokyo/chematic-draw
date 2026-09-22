import { parseBrukerPeakList } from '../renderer/lib/nmrBrukerPeakList';

describe('Bruker 1D peak-list import', () => {
  it('normalizes an explicitly identified peak list with provenance', () => {
    const spectrum = parseBrukerPeakList([
      '##TITLE= TopSpin export',
      '##$NUC1= <^1H>',
      '##$SOLVENT= <CDCl3>',
      '##$SFO1= 400.13',
      '7.260 1000',
      '1.245, 250',
    ].join('\n'), 'sample.pks', '2026-09-22T00:00:00.000Z');

    expect(spectrum).toMatchObject({
      nucleus: '1H',
      solvent: 'CDCl3',
      frequencyMHz: 400.13,
      provenance: { kind: 'experimental-import', source: 'sample.pks', importedAt: '2026-09-22T00:00:00.000Z' },
      rawVendorMetadata: { format: 'bruker-topspin-1d-peak-list' },
    });
    expect(spectrum.peaks).toEqual([
      expect.objectContaining({ shiftPpm: 7.26, intensity: 1000 }),
      expect.objectContaining({ shiftPpm: 1.245, intensity: 250 }),
    ]);
  });

  it('rejects text that has no Bruker nucleus header or usable peaks', () => {
    expect(() => parseBrukerPeakList('7.26 1000', 'missing-header.pks')).toThrow('##$NUC1=');
    expect(() => parseBrukerPeakList('##$NUC1= <1H>\nno peaks', 'empty.pks')).toThrow('contains no finite');
  });
});
