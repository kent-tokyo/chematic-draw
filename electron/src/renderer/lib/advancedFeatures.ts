import { MoleculeDto, MechanismStep } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';

// Phase 6: Stereoisomer Enumeration
export interface StereoisomerResult {
  stereoisomers: MoleculeDto[];
  count: number;
  description: string;
}

export function enumerateStereoisomers(mol: MoleculeDto): StereoisomerResult {
  // Use chematic 0.1.36 API: enumerate_stereoisomers
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

// Phase 7: Lipinski Rules & Structure Validation
export interface LipinskiViolation {
  rule: string;
  value: number;
  limit: number;
  violated: boolean;
}

export function checkLipinski(props: any): LipinskiViolation[] {
  const violations: LipinskiViolation[] = [
    { rule: 'MW ≤ 500', value: props.mw || 0, limit: 500, violated: (props.mw || 0) > 500 },
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
export interface PropertyPrediction {
  property: string;
  predictedValue: number | string;
  source: string;
}

export function predictProperties(mol: MoleculeDto): PropertyPrediction[] {
  // Use chematic 0.1.36 API: get extended properties
  try {
    const props = wasmBridge.getExtendedProperties(mol);
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
  } catch (e) {
    // Must not return [] here: an empty predictions array reads as "no
    // properties to show," not "the calculation failed" — the caller
    // (PropertyPredictionPanel) has an explicit error state for exactly
    // this and needs the throw to reach it.
    throw e instanceof Error ? e : new Error(String(e));
  }
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
export interface DatabaseResult {
  molId: string;
  name: string;
  source: 'pubchem' | 'chemspider' | 'zinc';
  similarity: number;
  properties: Record<string, any>;
}

export async function searchDatabase(mol: MoleculeDto, source: 'pubchem' | 'chemspider'): Promise<DatabaseResult[]> {
  try {
    // Get InChIKey from the molecule. Note: chematic-inchi's InChI is a pure-Rust
    // approximation, not bit-exact with the real IUPAC reference implementation
    // (see wasmBridge.molToInchi), so the InChIKey computed here will often not
    // match PubChem's own InChIKey for the same molecule — this lookup can
    // legitimately return no results for a molecule that IS in PubChem.
    const inchi = wasmBridge.molToInchi(mol);
    if (!inchi || inchi.startsWith('InChI_placeholder')) {
      throw new Error('Failed to generate InChI for molecule');
    }

    const inchiKey = wasmBridge.inchiToInchikey(inchi);
    if (!inchiKey || inchiKey.startsWith('ERROR-')) {
      throw new Error('Failed to generate InChIKey');
    }

    if (source === 'pubchem') {
      return await searchPubChem(inchiKey);
    } else if (source === 'chemspider') {
      throw new Error('ChemSpider search not yet implemented');
    }

    return [];
  } catch (error) {
    console.error('Database search error:', error);
    throw error;
  }
}

async function searchPubChem(inchiKey: string): Promise<DatabaseResult[]> {
  const baseUrl = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey';
  const url = `${baseUrl}/${inchiKey}/JSON`;

  try {
    const response = await fetch(url);
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

    // Fetch compound details for name and properties
    const detailUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/JSON`;
    const detailResponse = await fetch(detailUrl);

    if (!detailResponse.ok) {
      return [{
        molId: String(cid),
        name: `Compound ${cid}`,
        source: 'pubchem',
        similarity: 1.0,
        properties: {},
      }];
    }

    const detailData = await detailResponse.json();
    const detailCompound = detailData.PC_Compounds?.[0];

    const properties: Record<string, any> = {};

    // Extract molecular properties if available
    if (detailCompound?.props) {
      for (const prop of detailCompound.props) {
        if (prop.urn?.label && prop.value) {
          properties[prop.urn.label] = prop.value.sval || prop.value.ival || prop.value.fval;
        }
      }
    }

    const iupacName = properties['IUPAC Name'] || `Compound ${cid}`;

    return [
      {
        molId: String(cid),
        name: iupacName,
        source: 'pubchem',
        similarity: 1.0,
        properties,
      },
    ];
  } catch (error) {
    console.error('PubChem API error:', error);
    return [];
  }
}
