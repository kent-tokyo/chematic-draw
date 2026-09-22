import { MechanismStep, MoleculeDto, PropertiesDto } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';
import { getExtendedPropertiesCached } from './analysisCache';
import { runAnalysisInWorker } from './analysisWorkerClient';
export type { StereoAssignmentDto } from '../wasm/wasmBridge';
export type { DatabaseResult, LipinskiViolation, PropertyPrediction, StereoisomerResult } from '../../../../packages/chematic-contract/src/index';
import type { DatabaseResult, ExtendedProperties, LipinskiViolation, PropertyPrediction, StereoisomerResult } from '../../../../packages/chematic-contract/src/index';

export type DatabaseSource = 'pubchem' | 'chemspider';

/**
 * A source may appear in document/result types before it is safe to call from
 * the product. Keep the availability decision in one place so the UI never
 * advertises an unconfigured provider as a working search destination.
 */
export const DATABASE_PROVIDERS: Record<DatabaseSource, { available: boolean; unavailableReason?: string }> = {
  pubchem: { available: true },
  chemspider: { available: false, unavailableReason: 'ChemSpider requires a configured Electron host API key and attribution acknowledgement.' },
};

// Phase 6: Stereoisomer Enumeration
export function enumerateStereoisomers(mol: MoleculeDto): StereoisomerResult {
  // Use the pinned chematic API: enumerate_stereoisomers
  try {
    const isomers = wasmBridge.enumerateStereoisomers(mol);
    return {
      stereoisomers: isomers,
      count: isomers.length,
      description: `${isomers.length} stereoisomer${isomers.length !== 1 ? 's' : ''} found`,
    };
  } catch (e) {
    // A real failure must not look like "found 1 real stereoisomer" — returning
    // the unchanged input with count: 1 did exactly that; count/list must reflect
    // that nothing was actually enumerated.
    console.error('Stereoisomer enumeration failed:', e);
    const message = e instanceof Error ? e.message : String(e);
    return {
      stereoisomers: [],
      count: 0,
      description: `Enumeration failed: ${message}`,
    };
  }
}

export function assignCipDescriptors(mol: MoleculeDto): wasmBridge.StereoAssignmentDto[] {
  return wasmBridge.assignCip(mol);
}

// Phase 7: Lipinski Rules & Structure Validation
export function checkLipinski(props: PropertiesDto): LipinskiViolation[] {
  const violations: LipinskiViolation[] = [
    { rule: 'MW ≤ 500', value: props.molecular_weight || 0, limit: 500, violated: (props.molecular_weight || 0) > 500 },
    { rule: 'LogP ≤ 5', value: props.logp || 0, limit: 5, violated: (props.logp || 0) > 5 },
    { rule: 'HBA ≤ 10', value: props.hba || 0, limit: 10, violated: (props.hba || 0) > 10 },
    { rule: 'HBD ≤ 5', value: props.hbd || 0, limit: 5, violated: (props.hbd || 0) > 5 },
  ];
  return violations;
}

// Phase 8: Extended Property Calculation
// Named "prediction" historically, but these are deterministic descriptor
// calculations (chematic-chem), not statistical/ML predictions — there's no real
// confidence interval to report, so this no longer fabricates one.
export function predictProperties(mol: MoleculeDto): PropertyPrediction[] {
  // Use the pinned chematic API: get extended properties
  try {
    const props = getExtendedPropertiesCached(mol);
    return formatPredictedProperties(props);
  } catch (e) {
    // Must not return [] here: an empty predictions array reads as "no
    // properties to show," not "the calculation failed" — the caller
    // (PropertyPredictionPanel) has an explicit error state for exactly
    // this and needs the throw to reach it.
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export function formatPredictedProperties(props: ExtendedProperties): PropertyPrediction[] {
    const predictions: PropertyPrediction[] = [
      {
        property: 'Synthetic Accessibility Score',
        predictedValue: props.sa_score.toFixed(2),
        source: 'chematic-chem',
      },
      {
        property: 'ESOL Solubility (log S)',
        predictedValue: props.esol_solubility.toFixed(2),
        source: 'chematic-chem',
      },
      {
        property: 'Fraction sp3 carbons',
        predictedValue: props.fsp3.toFixed(3),
        source: 'chematic-chem',
      },
      {
        property: 'PAINS Alerts',
        predictedValue: props.pains_violations ? 'VIOLATED' : 'PASS',
        source: 'chematic-chem',
      },
      {
        property: 'Stereocenters',
        predictedValue: `${props.num_stereocenters} (${props.num_unspecified_stereocenters} unspecified)`,
        source: 'chematic-chem',
      },
    ];
    return predictions;
}

// Phase 9: Reaction Mechanism Drawing
export function createMechanismStep(id: string): MechanismStep {
  // Framework: Reaction mechanism visualization tool
  return {
    id,
    reactants: [],
    products: [],
    arrows: [],
    mechanismType: 'sn2',
  };
}

// Phase 10: Database Search
export async function searchDatabase(mol: MoleculeDto, source: DatabaseSource, signal?: AbortSignal): Promise<DatabaseResult[]> {
  try {
    // Get InChIKey from the molecule. Note: chematic-inchi's InChI is a pure-Rust
    // approximation, not bit-exact with the real IUPAC reference implementation
    // (see wasmBridge.molToInchi), so the InChIKey computed here will often not
    // match PubChem's own InChIKey for the same molecule — this lookup can
    // legitimately return no results for a molecule that IS in PubChem.
    const { inchi, inchikey: inchiKey } = await runAnalysisInWorker('identifiers', mol, signal) as { inchi: string; inchikey: string };
    if (!inchi || inchi.startsWith('InChI_placeholder')) {
      throw new Error('Failed to generate InChI for molecule');
    }

    if (!inchiKey || inchiKey.startsWith('ERROR-')) {
      throw new Error('Failed to generate InChIKey');
    }

    if (source === 'pubchem') {
      return await searchPubChem(inchiKey, signal);
    } else if (source === 'chemspider') {
      throw new Error('ChemSpider lookup is available only through a configured Electron host provider.');
    }

    return [];
  } catch (error) {
    console.error('Database search error:', error);
    throw error;
  }
}

async function searchPubChem(inchiKey: string, signal?: AbortSignal): Promise<DatabaseResult[]> {
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey';
  const url = `${baseUrl}/${inchiKey}/JSON`;

  try {
    const response = await fetch(url, { signal });
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new Error(`PubChem API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.PC_Compounds || data.PC_Compounds.length === 0) {
      return [];
    }

    // Parse first compound result
    const compound = data.PC_Compounds[0];
    const cid = compound.id?.id?.cid;

    if (!cid) {
      return [];
    }

    // Fetch the canonical structure alongside display properties so a user
    // can safely import the verified provider result into the editor.
    const detailUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName,CanonicalSMILES,MolecularFormula,MolecularWeight/JSON`;
    const detailResponse = await fetch(detailUrl, { signal });

    if (!detailResponse.ok) {
      return [{
        molId: String(cid),
        name: `Compound ${cid}`,
        source: 'pubchem',
        similarity: 1.0,
        properties: {},
      }];
    }

    const detailData = await detailResponse.json() as { PropertyTable?: { Properties?: Array<Record<string, string | number>> } };
    const detail = detailData.PropertyTable?.Properties?.[0] ?? {};
    const properties: Record<string, string | number> = {};
    for (const [key, label] of [['MolecularFormula', 'Molecular formula'], ['MolecularWeight', 'Molecular weight']] as const) {
      const value = detail[key];
      if (typeof value === 'string' || typeof value === 'number') properties[label] = value;
    }
    const iupacName = typeof detail.IUPACName === 'string' && detail.IUPACName.length > 0
      ? detail.IUPACName
      : `Compound ${cid}`;

    return [
      {
        molId: String(cid),
        name: iupacName,
        source: 'pubchem',
        similarity: 1.0,
        ...(typeof detail.CanonicalSMILES === 'string' ? { smiles: detail.CanonicalSMILES } : {}),
        properties,
      },
    ];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    console.error('PubChem API error:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
