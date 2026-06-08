import { MoleculeDto } from '../store/types';
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
    console.error('Stereoisomer enumeration failed:', e);
    return {
      stereoisomers: [mol],
      count: 1,
      description: 'Enumeration unavailable',
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

// Phase 8: Property Prediction
export interface PropertyPrediction {
  property: string;
  predictedValue: number | string;
  confidence: number;
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
        confidence: 0.95,
        source: 'chematic-chem',
      },
      {
        property: 'ESOL Solubility (log S)',
        predictedValue: props.esol_solubility.toFixed(2),
        confidence: 0.90,
        source: 'chematic-chem',
      },
      {
        property: 'Fraction sp3 carbons',
        predictedValue: props.fsp3.toFixed(3),
        confidence: 1.0,
        source: 'chematic-chem',
      },
      {
        property: 'PAINS Alerts',
        predictedValue: props.pains_violations ? 'VIOLATED' : 'PASS',
        confidence: 1.0,
        source: 'chematic-chem',
      },
      {
        property: 'Stereocenters',
        predictedValue: `${props.num_stereocenters} (${props.num_unspecified_stereocenters} unspecified)`,
        confidence: 1.0,
        source: 'chematic-chem',
      },
    ];
    return predictions;
  } catch (e) {
    console.error('Property prediction failed:', e);
    return [];
  }
}

// Phase 9: Reaction Mechanism Drawing
export interface MechanismStep {
  id: string;
  reactants: MoleculeDto[];
  products: MoleculeDto[];
  arrows: 'forward' | 'retro' | 'resonance';
  mechanismType: 'sn2' | 'sn1' | 'e1' | 'e2' | 'electrophilic_addition';
}

export function createMechanismStep(id: string): MechanismStep {
  // Framework: Reaction mechanism visualization tool
  return {
    id,
    reactants: [],
    products: [],
    arrows: 'forward',
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
  // Framework: HTTP calls to PubChem/ChemSpider API
  // Example: fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/substructure/smiles/${smiles}/JSON`)
  return [
    {
      molId: 'example-001',
      name: 'Example compound',
      source: 'pubchem',
      similarity: 0.95,
      properties: {},
    },
  ];
}
