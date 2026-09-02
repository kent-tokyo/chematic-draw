import {
  ReactionSchemeContext,
  MoleculeDto,
  AtomDto,
  AtomMapping,
  AtomMapEntry,
  ReactionClassification,
  GreenChemistryMetrics,
} from '../store/types';

const ATOM_MATCH_THRESHOLD = 0.75;
const COLORS = {
  persistent: '#51cf66',    // green
  new: '#4d8dff',           // blue
  leaving: '#ff6b6b',       // red
  spectator: '#888888',     // gray
};

/**
 * Calculate similarity between two atoms (0-1)
 */
function calculateAtomSimilarity(atom1: AtomDto, atom2: AtomDto, mol1: MoleculeDto, mol2: MoleculeDto): number {
  let score = 0;

  // Element match (strongest signal)
  if (atom1.element === atom2.element) {
    score += 0.5;
  } else {
    return 0; // Different elements, no match
  }

  // Formal charge match (using charge property)
  const chargeMatch = Math.abs((atom1.charge || 0) - (atom2.charge || 0));
  if (chargeMatch === 0) {
    score += 0.3;
  } else if (chargeMatch === 1) {
    score += 0.1;
  }

  // Connectivity (number of bonds)
  // Note: Using 'from' and 'to' properties of BondDto as they appear in types.ts
  const bonds1 = mol1.bonds.filter((b) => b.from === atom1.id || b.to === atom1.id).length;
  const bonds2 = mol2.bonds.filter((b) => b.from === atom2.id || b.to === atom2.id).length;
  const bondDiff = Math.abs(bonds1 - bonds2);
  if (bondDiff === 0) {
    score += 0.2;
  } else if (bondDiff === 1) {
    score += 0.05;
  }

  return Math.min(1.0, score);
}

/**
 * Map atoms across consecutive reaction steps
 */
export function mapAtomsAcrossSteps(scheme: ReactionSchemeContext): AtomMapping {
  const entries = new Map<number, AtomMapEntry>();
  let nextPersistentId = 1;

  if (!scheme || scheme.steps.length === 0) {
    return { entries, totalMappedAtoms: 0 };
  }

  // Track which atoms have been mapped to a persistent ID
  const atomToPersistentId = new Map<string, number>(); // "stepIndex:atomId" -> persistentId

  // Process each step
  for (let stepIdx = 0; stepIdx < scheme.steps.length; stepIdx++) {
    const step = scheme.steps[stepIdx];

    // Process products of current step
    for (const product of step.products) {
      for (const atom of product.atoms) {
        const atomKey = `${stepIdx}:${atom.id}`;

        // Check if this atom already has a persistent ID
        let persistentId = atomToPersistentId.get(atomKey);

        if (!persistentId) {
          // Check if it matches an atom in the next step's reactants
          if (stepIdx < scheme.steps.length - 1) {
            const nextStep = scheme.steps[stepIdx + 1];
            let matchedId: number | null = null;

            for (const reactant of nextStep.reactants) {
              for (const nextAtom of reactant.atoms) {
                const similarity = calculateAtomSimilarity(atom, nextAtom, product, reactant);
                if (similarity > ATOM_MATCH_THRESHOLD) {
                  matchedId = nextAtom.id;
                  break;
                }
              }
              if (matchedId) break;
            }

            if (matchedId) {
              // Assign existing persistent ID if next atom already has one
              const nextKey = `${stepIdx + 1}:${matchedId}`;
              persistentId = atomToPersistentId.get(nextKey) || nextPersistentId++;
              atomToPersistentId.set(atomKey, persistentId);
              atomToPersistentId.set(nextKey, persistentId);
            } else {
              // This atom is leaving
              persistentId = nextPersistentId++;
              atomToPersistentId.set(atomKey, persistentId);
            }
          } else {
            // Last step's products
            persistentId = nextPersistentId++;
            atomToPersistentId.set(atomKey, persistentId);
          }
        }

        // Add entry if not already present
        if (!entries.has(persistentId)) {
          entries.set(persistentId, {
            originalId: atom.id,
            element: atom.element,
            formalCharge: atom.charge || 0,
            color: COLORS.persistent,
            stepMappings: [],
          });
        }

        // Record this step mapping
        const entry = entries.get(persistentId)!;
        entry.stepMappings.push({
          stepIndex: stepIdx,
          atomIdInStep: atom.id,
          retained: stepIdx < scheme.steps.length - 1, // Assume retained unless last step
        });
      }
    }
  }

  // Assign colors based on atom fate
  assignAtomColors(entries, scheme);

  return {
    entries,
    totalMappedAtoms: entries.size,
  };
}

/**
 * Assign colors based on atom fate across reaction
 */
function assignAtomColors(entries: Map<number, AtomMapEntry>, scheme: ReactionSchemeContext): void {
  for (const [, entry] of entries) {
    const firstStep = entry.stepMappings[0]?.stepIndex || 0;
    const lastStep = entry.stepMappings[entry.stepMappings.length - 1]?.stepIndex || 0;

    // Persistent through entire scheme
    if (firstStep === 0 && lastStep === scheme.steps.length - 1) {
      entry.color = COLORS.persistent;
    }
    // Introduced mid-scheme
    else if (firstStep > 0) {
      entry.color = COLORS.new;
    }
    // Leaves mid-scheme
    else if (lastStep < scheme.steps.length - 1) {
      entry.color = COLORS.leaving;
    }
    // Spectator atom
    else {
      entry.color = COLORS.spectator;
    }
  }
}

/**
 * Summarize the structure of a drawn reaction scheme: step count and arrow count.
 * This is NOT a mechanism classification — distinguishing SN1/SN2/E1/E2/addition
 * requires real analysis (bonds broken/formed, nucleophile/electrophile character,
 * leaving groups) that this app doesn't perform, so it doesn't guess one.
 */
export function classifyReaction(scheme: ReactionSchemeContext): ReactionClassification {
  if (!scheme || scheme.steps.length === 0) {
    return { type: 'unknown', indicators: [] };
  }

  const stepCount = scheme.steps.length;
  const arrowCount = scheme.steps.reduce((sum, step) => sum + step.arrows.length, 0);

  const indicators: string[] = [
    stepCount > 1 ? `${stepCount} steps` : 'Single step',
    `${arrowCount} mechanism arrow${arrowCount !== 1 ? 's' : ''} drawn`,
  ];

  return {
    type: stepCount > 1 ? 'multi_step' : 'single_step',
    indicators,
  };
}

/**
 * Calculate green chemistry metrics
 */
export function calculateGreenChemistryMetrics(scheme: ReactionSchemeContext): GreenChemistryMetrics {
  const stepWaste: Array<{ stepIndex: number; wasteAtoms: number; percentage: number }> = [];
  let totalAtoms = 0;
  let totalProductAtoms = 0;

  for (let i = 0; i < scheme.steps.length; i++) {
    const step = scheme.steps[i];
    const reactantAtoms = step.reactants.reduce((sum, mol) => sum + mol.atoms.length, 0);
    const productAtoms = step.products.reduce((sum, mol) => sum + mol.atoms.length, 0);
    const waste = reactantAtoms - productAtoms;

    totalAtoms += reactantAtoms;
    totalProductAtoms += productAtoms;

    stepWaste.push({
      stepIndex: i,
      wasteAtoms: Math.max(0, waste),
      percentage: reactantAtoms > 0 ? (waste / reactantAtoms) * 100 : 0,
    });
  }

  const atomEconomy = totalAtoms > 0 ? (totalProductAtoms / totalAtoms) * 100 : 0;
  const eFactorApprox = totalProductAtoms > 0 ? (totalAtoms - totalProductAtoms) / totalProductAtoms : 0;

  return {
    atomEconomy: Math.round(atomEconomy * 100) / 100,
    eFactorApprox: Math.round(eFactorApprox * 100) / 100,
    stepWaste,
  };
}
