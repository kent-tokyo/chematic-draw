import { validateNmrSpectrum, type NmrSpectrum } from '../../../packages/chematic-contract/src/index';

const spectrum: NmrSpectrum = {
  schema: 'chematic-draw/nmr-spectrum',
  schema_version: 1,
  nucleus: '1H',
  frequencyMHz: 400,
  solvent: 'DMSO-d6',
  reference: 'TMS',
  peaks: [{ id: 'p1', shiftPpm: 7.26, intensity: 1, multiplicity: 's', assignment: 'Ar-H' }],
  rawVendorMetadata: { instrument: 'local-fixture', processed: true },
  provenance: { kind: 'experimental-import', source: 'fixture.jdx' },
};

describe('NMR contract', () => {
  it('accepts a loss-aware experimental spectrum', () => {
    expect(validateNmrSpectrum(spectrum)).toEqual([]);
  });

  it('rejects malformed peak identity and numeric ranges', () => {
    const invalid = {
      ...spectrum,
      frequencyMHz: 0,
      peaks: [
        { id: 'duplicate', shiftPpm: Number.NaN, intensity: -1 },
        { id: 'duplicate', shiftPpm: 1, widthPpm: -0.1 },
      ],
    } as NmrSpectrum;
    const errors = validateNmrSpectrum(invalid);
    expect(errors.map((error) => error.path)).toEqual(expect.arrayContaining([
      'frequencyMHz', 'peaks[0].shiftPpm', 'peaks[0].intensity', 'peaks[1].id', 'peaks[1].widthPpm',
    ]));
  });

  it('rejects unknown schema versions instead of discarding vendor data', () => {
    expect(validateNmrSpectrum({ ...spectrum, schema_version: 2 } as unknown as NmrSpectrum)).toEqual([
      { code: 'invalid', path: '$', message: 'Unsupported NMR spectrum schema' },
    ]);
  });

  it('rejects malformed runtime enum and metadata values while preserving valid vendor metadata', () => {
    const invalid = {
      ...spectrum,
      nucleus: '31Si',
      provenance: { kind: 'vendor-import' },
      temperatureC: Number.NaN,
      rawVendorMetadata: { finite: 'yes', bad: Number.NaN, nested: {} },
      peaks: [{ id: 'p1', shiftPpm: 1, assignment: 42 }],
    } as unknown as NmrSpectrum;
    expect(validateNmrSpectrum(invalid).map((error) => error.path)).toEqual(expect.arrayContaining([
      'nucleus', 'provenance.kind', 'temperatureC', 'rawVendorMetadata', 'peaks[0].assignment',
    ]));
    expect(validateNmrSpectrum(spectrum)).toEqual([]);
  });
});
