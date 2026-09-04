import { ReactionSchemeContext } from '../store/types';
export type { ReactionDocumentIssue, ReactionDocumentIssueCode } from '../../../../packages/chematic-contract/src/index';
import type { ReactionDocumentIssue } from '../../../../packages/chematic-contract/src/index';

/** Structural gate for authored multi-step documents. It checks identity and
 * provenance facts only; it does not infer chemistry or balance reactions. */
export function validateReactionDocument(scheme: ReactionSchemeContext): ReactionDocumentIssue[] {
  const issues: ReactionDocumentIssue[] = [];
  const stepIds = new Set<string>();
  for (const [index, step] of scheme.steps.entries()) {
    if (stepIds.has(step.id)) issues.push({ code: 'duplicate-step-id', path: `steps.${index}.id`, message: `Step id is duplicated: ${step.id}` });
    stepIds.add(step.id);
    const groups = [
      ['reactants', step.reactants, step.reactantComponentIds],
      ['products', step.products, step.productComponentIds],
      ['agents', step.agents ?? [], step.agentComponentIds],
    ] as const;
    const localIds = new Set<string>();
    for (const [name, molecules, ids] of groups) {
      if (ids !== undefined && ids.length !== molecules.length) issues.push({ code: 'component-id', path: `steps.${index}.${name}ComponentIds`, message: 'Component IDs must align with molecule arrays' });
      for (const id of ids ?? []) {
        if (localIds.has(id)) issues.push({ code: 'component-id', path: `steps.${index}.${name}ComponentIds`, message: `Component id is duplicated within a step: ${id}` });
        localIds.add(id);
      }
    }
    for (const [name, coefficients, expectedLength] of [
      ['reactantCoefficients', step.reactantCoefficients, step.reactants.length],
      ['productCoefficients', step.productCoefficients, step.products.length],
    ] as const) {
      if (coefficients === undefined) continue;
      if (coefficients.length !== expectedLength) {
        issues.push({ code: 'coefficient', path: `steps.${index}.${name}`, message: 'Stoichiometric coefficients must align with molecule arrays' });
        continue;
      }
      if (coefficients.some((coefficient) => !Number.isFinite(coefficient) || coefficient <= 0)) {
        issues.push({ code: 'coefficient', path: `steps.${index}.${name}`, message: 'Stoichiometric coefficients must be finite positive numbers' });
      }
    }
    if (step.authored === false && !step.derivedFrom) issues.push({ code: 'provenance', path: `steps.${index}`, message: 'A derived step must identify its source with derivedFrom' });
    if (step.authored === true && step.derivedFrom) issues.push({ code: 'provenance', path: `steps.${index}`, message: 'An authored step cannot also be marked derived' });
    // The same map is expected once on the reactant side and once on the
    // product side; ambiguity means it appears in two distinct components on
    // the same side.
    const maps = new Map<string, string>();
    for (const [name, molecules] of [['reactants', step.reactants], ['products', step.products], ['agents', step.agents ?? []] ] as const) {
      for (const molecule of molecules) for (const atom of molecule.atoms) if (atom.atom_map > 0) {
        const previous = maps.get(`${name}:${atom.atom_map}`);
        const identity = `${name}:${molecule.atoms.map((candidate) => candidate.id).join(',')}`;
        if (previous && previous !== identity) issues.push({ code: 'map-scope', path: `steps.${index}.${name}`, message: `Atom map ${atom.atom_map} is ambiguous within the step` });
        maps.set(`${name}:${atom.atom_map}`, identity);
      }
    }
    if (index > 0) {
      const previous = scheme.steps[index - 1];
      const previousIds = new Set(previous.productComponentIds ?? []);
      const currentIds = new Set(step.reactantComponentIds ?? []);
      if (previousIds.size > 0 && currentIds.size > 0 && ![...previousIds].some((id) => currentIds.has(id))) issues.push({ code: 'continuity', path: `steps.${index}`, message: 'No product component continues into the next step reactants' });
    }
  }
  return issues;
}

export function assertReactionDocument(scheme: ReactionSchemeContext): void {
  const issues = validateReactionDocument(scheme);
  if (issues.length) throw new Error(`Reaction document integrity failed: ${issues.map((issue) => issue.message).join('; ')}`);
}
