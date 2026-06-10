import { ReactionSchemeContext, MechanismStep, MoleculeDto } from '../store/types';

/**
 * Validation result for reaction scheme
 */
export interface ValidationResult {
  valid: boolean;
  issues: string[];
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
