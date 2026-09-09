import initWasm, { find_mcs, get_extended_properties, get_fingerprint, get_properties, inchi_to_inchikey, iupac_name, mol_to_inchi, parse_any, to_canonical_smiles, to_cml, to_mol_v2000, to_sdf, to_svg } from '../wasm/pkg/chem_wasm';
import { MoleculeDto } from '../store/types';

export type AnalysisOperation = 'properties' | 'extended-properties' | 'fingerprint' | 'iupac' | 'identifiers' | 'mcs' | 'parse' | 'canonical-smiles' | 'mol-v2000' | 'sdf' | 'cml' | 'svg';
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
      await ensureReady();
      const value = operation === 'parse'
        ? parse_any(text ?? '')
        : !molecule
          ? (() => { throw new Error('Molecule is required for this analysis operation'); })()
          : operation === 'properties'
            ? get_properties(molecule)
        : operation === 'extended-properties'
          ? get_extended_properties(molecule)
          : operation === 'fingerprint'
            ? get_fingerprint(molecule)
          : operation === 'canonical-smiles'
            ? to_canonical_smiles(molecule)
          : operation === 'mol-v2000'
            ? to_mol_v2000(molecule)
          : operation === 'sdf'
            ? to_sdf(molecule)
          : operation === 'cml'
            ? to_cml(molecule)
          : operation === 'svg'
            ? to_svg(molecule)
          : operation === 'iupac'
              ? iupac_name(molecule)
            : operation === 'identifiers'
              ? (() => { const inchi = mol_to_inchi(molecule); return { inchi, inchikey: inchi_to_inchikey(inchi) }; })()
              : comparison ? find_mcs(molecule, comparison) : (() => { throw new Error('MCS comparison molecule is required'); })();
      if (operation === 'parse' && !value) throw new Error('Failed to parse molecule');
      self.postMessage({ id, operation, value });
    } catch (error) {
      self.postMessage({ id: event.data?.id, error: error instanceof Error ? error.message : String(error) });
    }
  })();
};

export {};
