import { MoleculeDto } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';

export interface ReactionCondition {
  temperature?: string; // e.g., "25°C", "RT", "reflux"
  catalyst?: string;
  solvent?: string;
  time?: string; // e.g., "2h", "overnight"
  yield?: number; // 0-100
  notes?: string;
}

export interface ReactionStep {
  id: string;
  reactants: MoleculeDto[];
  products: MoleculeDto[];
  conditions: ReactionCondition;
  arrowType: 'single' | 'double' | 'equilibrium' | 'retro';
}

export interface ReactionScheme {
  steps: ReactionStep[];
  title?: string;
  description?: string;
}

export function createReactionStep(
  id: string,
  reactants: MoleculeDto[],
  products: MoleculeDto[]
): ReactionStep {
  return {
    id,
    reactants,
    products,
    conditions: {},
    arrowType: 'single',
  };
}

export function addStep(scheme: ReactionScheme, step: ReactionStep): void {
  scheme.steps.push(step);
}

export function removeStep(scheme: ReactionScheme, stepId: string): void {
  scheme.steps = scheme.steps.filter(s => s.id !== stepId);
}

export function updateConditions(step: ReactionStep, conditions: Partial<ReactionCondition>): void {
  step.conditions = { ...step.conditions, ...conditions };
}

export function generateReactionSmiles(scheme: ReactionScheme): string[] {
  return scheme.steps.map(step => {
    const reactants = step.reactants.map(r => '(mol)').join('.');
    const products = step.products.map(p => '(mol)').join('.');
    return `${reactants}>>${products}`;
  });
}

/**
 * Execute a SMIRKS-based reaction on a molecule.
 * Returns the product molecules as a new ReactionStep.
 */
export function executeReaction(
  reactant: MoleculeDto,
  smirks: string
): ReactionStep | null {
  try {
    const products = wasmBridge.runReactants(reactant, smirks);
    if (products.length === 0) {
      console.warn('No products generated from reaction');
      return null;
    }

    return {
      id: `reaction-${Date.now()}`,
      reactants: [reactant],
      products,
      conditions: {},
      arrowType: 'single',
    };
  } catch (err) {
    console.error('Reaction execution error:', err);
    return null;
  }
}

/**
 * Common SMIRKS transformations library.
 * Provides templates for common organic reactions.
 */
export const SMIRKS_TEMPLATES = {
  carboxylic_acid_to_amide: '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]',
  ester_to_acid: '[C:1](=[O])[O][C:2]>>[C:1](=[O])[OH]',
  ester_to_alcohol: '[C:1](=[O])[O][C:2]>>[C:1](=[O])[O].[C:2]',
  alcohol_to_aldehyde: '[CH2:1][OH]>>[CH:1]=O',
  aldehyde_to_carboxylic_acid: '[C:1](=O)[H]>>[C:1](=O)O',
  ketone_to_alcohol: '[C:1](=[O])[C:2]>>[C:1]([OH])[C:2]',
};
