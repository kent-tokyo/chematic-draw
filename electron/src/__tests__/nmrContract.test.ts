import { MAX_NMR_METADATA_ENTRIES, MAX_NMR_PEAKS, normalizeNmrSpectrum, serializeNmrSpectrum, validateNmrSpectrum, type NmrSpectrum } from '../../../packages/chematic-contract/src/index';

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

  it('normalizes peak and vendor metadata order without mutating the source', () => {
    const input = {
      ...spectrum,
      peaks: [
        { id: 'z', shiftPpm: 1 },
        { id: 'a', shiftPpm: 1 },
        { id: 'p', shiftPpm: 7.26 },
      ],
      rawVendorMetadata: { zeta: true, alpha: 'fixture' },
    };
    const normalized = normalizeNmrSpectrum(input);
    expect(normalized.peaks.map((peak) => peak.id)).toEqual(['a', 'z', 'p']);
    expect(Object.keys(normalized.rawVendorMetadata ?? {})).toEqual(['alpha', 'zeta']);
    expect(input.peaks.map((peak) => peak.id)).toEqual(['z', 'a', 'p']);
    expect(serializeNmrSpectrum(input)).toBe(serializeNmrSpectrum({ ...input, peaks: [...input.peaks].reverse() }));
  });

  it('refuses to serialize invalid spectra instead of exporting an unvalidated document', () => {
    expect(() => serializeNmrSpectrum({ ...spectrum, peaks: [{ id: '', shiftPpm: 1 }] })).toThrow(/Invalid NMR spectrum/);
  });

  it('bounds imported spectrum size and rejects array-shaped vendor metadata', () => {
    const oversized = { ...spectrum, peaks: Array.from({ length: MAX_NMR_PEAKS + 1 }, (_, index) => ({ id: `p${index}`, shiftPpm: index })) };
    expect(validateNmrSpectrum(oversized).map((error) => error.path)).toContain('peaks');
    const metadata = Object.fromEntries(Array.from({ length: MAX_NMR_METADATA_ENTRIES + 1 }, (_, index) => [`k${index}`, true]));
    expect(validateNmrSpectrum({ ...spectrum, rawVendorMetadata: metadata }).map((error) => error.path)).toContain('rawVendorMetadata');
    expect(validateNmrSpectrum({ ...spectrum, rawVendorMetadata: [] } as unknown as NmrSpectrum).map((error) => error.path)).toContain('rawVendorMetadata');
  });
});
