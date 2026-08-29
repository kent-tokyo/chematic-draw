import { MoleculeDto, ReactionCondition } from '../store/types';
import * as wasmBridge from '../wasm/wasmBridge';

export interface ReactionStep {
  id: string;
  reactants: MoleculeDto[];
  products: MoleculeDto[];
  conditions: ReactionCondition;
  arrowType: 'single' | 'double' | 'equilibrium' | 'retro';
}

/**
 * Result of executing a reaction step: distinguishes a successful application from
 * a valid "SMIRKS didn't match this molecule" outcome and a real execution error,
 * so callers can show the user an accurate message instead of one generic failure.
 */
export type ExecuteReactionResult =
  | { status: 'applied'; step: ReactionStep }
  | { status: 'no_match' }
  | { status: 'invalid_reaction'; message: string }
  | { status: 'unsupported_chemistry'; message: string }
  | { status: 'error'; message: string };

/**
 * Execute a SMIRKS-based reaction on a molecule.
 * Returns the product molecules as a new ReactionStep, or the reason it didn't.
 */
export function executeReaction(
  reactant: MoleculeDto,
  smirks: string
): ExecuteReactionResult {
  const result = wasmBridge.runReactants(reactant, smirks);
  if (result.status !== 'applied') {
    return result;
  }

  return {
    status: 'applied',
    step: {
      id: `reaction-${Date.now()}`,
      reactants: [reactant],
      products: result.products,
      conditions: {},
      arrowType: 'single',
    },
  };
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
