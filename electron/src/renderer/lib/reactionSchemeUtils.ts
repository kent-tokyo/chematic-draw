import { ReactionSchemeContext, MechanismStep, MoleculeDto } from '../store/types';

/**
 * Validation result for reaction scheme
 */
export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface ReactionDiagnostics {
  status: 'verified' | 'not_verified';
  issues: string[];
  stepResults: Array<{
    stepIndex: number;
    status: 'verified' | 'not_verified';
    atomCount: { reactants: number; products: number };
    atomBalance: { balanced: boolean; differences: string[] };
    chargeBalance: { balanced: boolean; difference: number };
    mapping: ReactionDiagnostics['mapping'] & { mappedAtomCount: number };
  }>;
  atomBalance: {
    balanced: boolean;
    differences: string[];
  };
  chargeBalance: {
    balanced: boolean;
    difference: number;
  };
  mapping: {
    complete: boolean;
    duplicateMapNumbers: number[];
    unmatchedMapNumbers: number[];
  };
}

function atomBalanceForStep(step: MechanismStep): { balanced: boolean; differences: string[]; chargeDifference: number } {
  const countAtoms = (molecules: MoleculeDto[]) => {
    const counts = new Map<string, number>();
    for (const molecule of molecules) {
      for (const atom of molecule.atoms) {
        const key = atom.isotope === undefined ? atom.element : `${atom.isotope}${atom.element}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        if (atom.hydrogen_count !== undefined) {
          counts.set('H', (counts.get('H') ?? 0) + atom.hydrogen_count);
        }
      }
    }
    return counts;
  };
  const reactants = countAtoms(step.reactants);
  const products = countAtoms(step.products);
  const elements = new Set([...reactants.keys(), ...products.keys()]);
  const differences = [...elements].sort().flatMap((element) => {
    const delta = (reactants.get(element) ?? 0) - (products.get(element) ?? 0);
    return delta === 0 ? [] : [`${element}: ${delta > 0 ? `${delta} extra on reactants` : `${Math.abs(delta)} missing from reactants`}`];
  });
  const reactantCharge = step.reactants.flatMap((molecule) => molecule.atoms).reduce((sum, atom) => sum + atom.charge, 0);
  const productCharge = step.products.flatMap((molecule) => molecule.atoms).reduce((sum, atom) => sum + atom.charge, 0);
  return { balanced: differences.length === 0, differences, chargeDifference: reactantCharge - productCharge };
}

function mappingForStep(step: MechanismStep): ReactionDiagnostics['mapping'] & { mappedAtomCount: number } {
  const reactantMaps = new Map<number, string>();
  const productMaps = new Map<number, string>();
  const duplicateMapNumbers = new Set<number>();

  const collect = (molecules: MoleculeDto[], target: Map<number, string>) => {
    for (const molecule of molecules) {
      for (const atom of molecule.atoms) {
        if (!atom.atom_map || atom.atom_map <= 0) continue;
        if (target.has(atom.atom_map)) duplicateMapNumbers.add(atom.atom_map);
        target.set(atom.atom_map, atom.isotope === undefined ? atom.element : `${atom.isotope}${atom.element}`);
      }
    }
  };
  collect(step.reactants, reactantMaps);
  collect(step.products, productMaps);

  const unmatched = new Set<number>();
  for (const mapNumber of new Set([...reactantMaps.keys(), ...productMaps.keys()])) {
    if (!reactantMaps.has(mapNumber) || !productMaps.has(mapNumber) || reactantMaps.get(mapNumber) !== productMaps.get(mapNumber)) {
      unmatched.add(mapNumber);
    }
  }
  return {
    // An unannotated reaction is not evidence of a complete atom mapping.
    complete: reactantMaps.size > 0 && productMaps.size > 0 && duplicateMapNumbers.size === 0 && unmatched.size === 0,
    mappedAtomCount: [...reactantMaps.keys()].filter((mapNumber) => productMaps.has(mapNumber)).length,
    duplicateMapNumbers: [...duplicateMapNumbers].sort((a, b) => a - b),
    unmatchedMapNumbers: [...unmatched].sort((a, b) => a - b),
  };
}

/**
 * Diagnose only facts present in the authored reaction document. This does
 * not infer products, repair maps, or classify a reaction mechanism.
 */
export function diagnoseReactionScheme(scheme: ReactionSchemeContext): ReactionDiagnostics {
  if (!scheme || scheme.steps.length === 0) {
    return {
      status: 'not_verified',
      issues: ['No reaction steps are available for verification.'],
      stepResults: [],
      atomBalance: { balanced: false, differences: [] },
      chargeBalance: { balanced: false, difference: 0 },
      mapping: { complete: false, duplicateMapNumbers: [], unmatchedMapNumbers: [] },
    };
  }

  const issues: string[] = [];
  const allDifferences: string[] = [];
  let allBalanced = true;
  let allMapped = true;
  let allChargesBalanced = true;
  let totalChargeDifference = 0;
  const duplicateMapNumbers = new Set<number>();
  const unmatchedMapNumbers = new Set<number>();
  const stepResults: ReactionDiagnostics['stepResults'] = [];

  scheme.steps.forEach((step, index) => {
    if (step.reactants.length === 0 || step.products.length === 0) {
      allBalanced = false;
      allMapped = false;
      issues.push(`Step ${index + 1}: atom balance is not verified.`);
      issues.push(`Step ${index + 1}: reactants and products are required for mapping verification.`);
      stepResults.push({
        stepIndex: index,
        status: 'not_verified',
        atomCount: { reactants: step.reactants.reduce((sum, molecule) => sum + molecule.atoms.length, 0), products: step.products.reduce((sum, molecule) => sum + molecule.atoms.length, 0) },
        atomBalance: { balanced: false, differences: [] },
        chargeBalance: { balanced: false, difference: 0 },
        mapping: { complete: false, mappedAtomCount: 0, duplicateMapNumbers: [], unmatchedMapNumbers: [] },
      });
      return;
    }
    const balance = atomBalanceForStep(step);
    if (!balance.balanced) {
      allBalanced = false;
      balance.differences.forEach((difference) => allDifferences.push(`Step ${index + 1}: ${difference}`));
      issues.push(`Step ${index + 1}: atom balance is not verified.`);
    }
    totalChargeDifference += balance.chargeDifference;
    if (balance.chargeDifference !== 0) {
      allChargesBalanced = false;
      issues.push(`Step ${index + 1}: formal charge is not balanced (${balance.chargeDifference > 0 ? `${balance.chargeDifference} extra charge on reactants` : `${Math.abs(balance.chargeDifference)} extra charge on products`}).`);
    }
    const mapping = mappingForStep(step);
    if (!mapping.complete) {
      allMapped = false;
      mapping.duplicateMapNumbers.forEach((number) => duplicateMapNumbers.add(number));
      mapping.unmatchedMapNumbers.forEach((number) => unmatchedMapNumbers.add(number));
      issues.push(`Step ${index + 1}: atom mapping is incomplete or inconsistent.`);
    }
    stepResults.push({
      stepIndex: index,
      status: balance.balanced && balance.chargeDifference === 0 && mapping.complete ? 'verified' : 'not_verified',
      atomCount: { reactants: step.reactants.reduce((sum, molecule) => sum + molecule.atoms.length, 0), products: step.products.reduce((sum, molecule) => sum + molecule.atoms.length, 0) },
      atomBalance: balance,
      chargeBalance: { balanced: balance.chargeDifference === 0, difference: balance.chargeDifference },
      mapping,
    });
  });

  if (allMapped && allBalanced && allChargesBalanced) issues.push('Atom balance, formal charge, and mapping verified from authored atoms.');
  return {
    status: allMapped && allBalanced && allChargesBalanced ? 'verified' : 'not_verified',
    issues,
    stepResults,
    atomBalance: { balanced: allBalanced, differences: allDifferences },
    chargeBalance: { balanced: allChargesBalanced, difference: totalChargeDifference },
    mapping: {
      complete: allMapped,
      duplicateMapNumbers: [...duplicateMapNumbers].sort((a, b) => a - b),
      unmatchedMapNumbers: [...unmatchedMapNumbers].sort((a, b) => a - b),
    },
  };
}

/**
 * Check if two molecules are equivalent (simplified comparison)
 * Compares SMILES or atom count as proxy for equality
 */
function moleculesMatch(mol1: MoleculeDto, mol2: MoleculeDto): boolean {
  if (!mol1 || !mol2) return false;

  // Simple comparison: atom count and element composition
  if (mol1.atoms.length !== mol2.atoms.length) return false;

  // Count atoms by element
  const countAtoms = (mol: MoleculeDto) => {
    const counts: Record<string, number> = {};
    mol.atoms.forEach((atom) => {
      counts[atom.element] = (counts[atom.element] || 0) + 1;
    });
    return counts;
  };

  const counts1 = countAtoms(mol1);
  const counts2 = countAtoms(mol2);

  return JSON.stringify(counts1) === JSON.stringify(counts2);
}

/**
 * Validate a reaction scheme for consistency
 * Checks that products of step N match reactants of step N+1
 */
export function validateReactionScheme(scheme: ReactionSchemeContext): ValidationResult {
  const issues: string[] = [];

  if (!scheme || scheme.steps.length === 0) {
    return { valid: false, issues: ['Reaction scheme has no steps'] };
  }

  // Check each step's products match next step's reactants
  for (let i = 0; i < scheme.steps.length - 1; i++) {
    const currentStep = scheme.steps[i];
    const nextStep = scheme.steps[i + 1];

    if (currentStep.products.length === 0) {
      issues.push(`Step ${i + 1}: No products defined`);
      continue;
    }

    if (nextStep.reactants.length === 0) {
      issues.push(`Step ${i + 2}: No reactants defined`);
      continue;
    }

    // Try to match products to reactants
    let matched = false;
    for (const product of currentStep.products) {
      for (const reactant of nextStep.reactants) {
        if (moleculesMatch(product, reactant)) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      issues.push(
        `Step ${i + 1} → Step ${i + 2}: Products don't match reactants (consider adding reagents)`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get intermediates between two consecutive steps
 * Returns molecules that are products of step N and reactants of step N+1
 */
export function getIntermediates(
  currentStep: MechanismStep,
  nextStep: MechanismStep | null
): MoleculeDto[] {
  if (!nextStep) return currentStep.products;

  // Find products from current step that appear in next step's reactants
  const intermediates: MoleculeDto[] = [];

  for (const product of currentStep.products) {
    for (const reactant of nextStep.reactants) {
      if (moleculesMatch(product, reactant)) {
        intermediates.push(product);
        break;
      }
    }
  }

  return intermediates;
}

/**
 * Get external reagents for a step (reactants not from previous step)
 */
export function getExternalReagents(
  step: MechanismStep,
  previousStep: MechanismStep | null
): MoleculeDto[] {
  if (!previousStep) {
    // First step: all reactants are external
    return step.reactants;
  }

  // Filter out intermediates from previous step
  const intermediates = getIntermediates(previousStep, step);
  return step.reactants.filter(
    (reactant) => !intermediates.some((inter) => moleculesMatch(inter, reactant))
  );
}

/**
 * Export reaction scheme as JSON
 */
export function exportSchemeAsJSON(scheme: ReactionSchemeContext): string {
  return JSON.stringify(scheme, null, 2);
}

/**
 * Import reaction scheme from JSON
 */
export function importSchemeFromJSON(json: string): ReactionSchemeContext | null {
  try {
    const parsed = JSON.parse(json);
    // Basic validation
    if (!parsed.id || !parsed.steps) return null;
    return parsed as ReactionSchemeContext;
  } catch (error) {
    console.error('Failed to import scheme:', error);
    return null;
  }
}

/**
 * Get a human-readable summary of a reaction scheme
 */
export function getSchemeDescription(scheme: ReactionSchemeContext): string {
  if (!scheme || scheme.steps.length === 0) {
    return 'Empty reaction scheme';
  }

  const steps = scheme.steps.map((step, i) => {
    const reactantsStr = step.reactants.map((r) => r.atoms[0]?.element || '?').join('/');
    const productsStr = step.products.map((p) => p.atoms[0]?.element || '?').join('/');
    return `Step ${i + 1}: ${reactantsStr} → ${productsStr}`;
  });

  return steps.join(' → ');
}
