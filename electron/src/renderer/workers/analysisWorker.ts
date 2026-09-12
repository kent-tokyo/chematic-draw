import initWasm, { find_mcs, get_extended_properties, get_fingerprint, get_properties, inchi_to_inchikey, iupac_name, mol_to_inchi, parse_any, tanimoto_similarity, to_canonical_smiles, to_cml, to_mol_v2000, to_sdf, to_svg } from '../wasm/pkg/chem_wasm';
import { MoleculeDto } from '../store/types';
import { parseSessionBundle, serializeSessionBundle } from '../lib/sessionBundle';

export type AnalysisOperation = 'properties' | 'extended-properties' | 'fingerprint' | 'similarity' | 'iupac' | 'identifiers' | 'mcs' | 'parse' | 'parse-session' | 'serialize-session' | 'canonical-smiles' | 'mol-v2000' | 'sdf' | 'cml' | 'svg';
export interface AnalysisTask { id: string; operation: AnalysisOperation; molecule?: MoleculeDto; comparison?: MoleculeDto; text?: string; }

let ready: Promise<unknown> | null = null;
function ensureReady(): Promise<unknown> {
  ready ??= initWasm(new URL('../wasm/pkg/chem_wasm_bg.wasm', import.meta.url));
  return ready;
}

self.onmessage = (event: MessageEvent<AnalysisTask>) => {
  void (async () => {
    try {
      const { id, operation, molecule, comparison, text } = event.data;
      let value: unknown;
      if (operation === 'parse-session') {
        value = parseSessionBundle(text ?? '').document.molecule;
      } else if (operation === 'serialize-session') {
        if (!molecule) throw new Error('Molecule is required for session serialization');
        value = serializeSessionBundle(molecule, text ?? null);
      } else {
        await ensureReady();
        if (operation === 'parse') {
          value = parse_any(text ?? '');
        } else {
          if (!molecule) throw new Error('Molecule is required for this analysis operation');
          switch (operation) {
            case 'properties': value = get_properties(molecule); break;
            case 'extended-properties': value = get_extended_properties(molecule); break;
            case 'fingerprint': value = get_fingerprint(molecule); break;
            case 'similarity': {
              if (!comparison) throw new Error('Similarity comparison molecule is required');
              value = tanimoto_similarity(get_fingerprint(molecule), get_fingerprint(comparison));
              break;
            }
            case 'canonical-smiles': value = to_canonical_smiles(molecule); break;
            case 'mol-v2000': value = to_mol_v2000(molecule); break;
            case 'sdf': value = to_sdf(molecule); break;
            case 'cml': value = to_cml(molecule); break;
            case 'svg': value = to_svg(molecule); break;
            case 'iupac': value = iupac_name(molecule); break;
            case 'identifiers': {
              const inchi = mol_to_inchi(molecule);
              value = { inchi, inchikey: inchi_to_inchikey(inchi) };
              break;
            }
            case 'mcs':
              if (!comparison) throw new Error('MCS comparison molecule is required');
              value = find_mcs(molecule, comparison);
              break;
            default: throw new Error(`Unknown analysis operation: ${String(operation)}`);
          }
        }
      }
      if (operation === 'parse' && !value) throw new Error('Failed to parse molecule');
      self.postMessage({ id, operation, value });
    } catch (error) {
      self.postMessage({ id: event.data?.id, error: error instanceof Error ? error.message : String(error) });
    }
  })();
};

export {};
