import { MoleculeDto } from '../store/types';

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
