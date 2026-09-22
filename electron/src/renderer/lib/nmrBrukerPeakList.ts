import { validateNmrSpectrum, type NmrNucleus, type NmrSpectrum } from '../../../../packages/chematic-contract/src/index';

const NUCLEI: readonly NmrNucleus[] = ['1H', '13C', '19F', '31P', '15N', '29Si'];

function brukerHeader(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`^##\\$${key}=\\s*<?([^>\\r\\n]+)>?\\s*$`, 'mi'));
  return match?.[1]?.trim();
}

function normalizeNucleus(value: string | undefined): NmrNucleus {
  const normalized = value?.replace(/^\^/, '').replace(/\s+/g, '');
  return normalized && NUCLEI.includes(normalized as NmrNucleus) ? normalized as NmrNucleus : 'other';
}

/**
 * Import Bruker TopSpin-style exported 1D peak lists, not raw FID data.
 * The file must identify its nucleus through `##$NUC1=` and contain one
 * `ppm intensity` pair per data line. Keeping the parser this narrow avoids
 * fabricating a spectrum from unrelated acquisition or processing records.
 */
export function parseBrukerPeakList(text: string, source: string, importedAt = new Date().toISOString()): NmrSpectrum {
  const nucleusHeader = brukerHeader(text, 'NUC1');
  if (!nucleusHeader) throw new Error('Bruker peak list is missing the ##$NUC1= header.');
  const peaks = text.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(/^\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*[,;\t ]+(-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(?:[,;\t ].*)?$/);
    if (!match) return [];
    const shiftPpm = Number(match[1]);
    const intensity = Number(match[2]);
    return Number.isFinite(shiftPpm) && Number.isFinite(intensity)
      ? [{ id: `bruker-${index + 1}`, shiftPpm, intensity }]
      : [];
  }).sort((left, right) => right.shiftPpm - left.shiftPpm || left.id.localeCompare(right.id));
  if (peaks.length === 0) throw new Error('Bruker peak list contains no finite ppm/intensity pairs.');

  const spectrum: NmrSpectrum = {
    schema: 'chematic-draw/nmr-spectrum',
    schema_version: 1,
    nucleus: normalizeNucleus(nucleusHeader),
    ...(Number.isFinite(Number(brukerHeader(text, 'SFO1'))) ? { frequencyMHz: Number(brukerHeader(text, 'SFO1')) } : {}),
    ...(brukerHeader(text, 'SOLVENT') ? { solvent: brukerHeader(text, 'SOLVENT') } : {}),
    peaks,
    rawVendorMetadata: {
      format: 'bruker-topspin-1d-peak-list',
      source,
      ...(nucleusHeader ? { nucleusHeader } : {}),
    },
    provenance: { kind: 'experimental-import', source, importedAt },
  };
  const errors = validateNmrSpectrum(spectrum);
  if (errors.length > 0) throw new Error(`Bruker peak list normalization failed: ${errors.map((error) => `${error.path}: ${error.message}`).join('; ')}`);
  return spectrum;
}
