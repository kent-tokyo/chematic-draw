import { MoleculeDto, AtomDto } from '../store/types';

const MAX_VALENCE: Record<string, number> = {
  H: 1, C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1,
  P: 3, B: 3, Si: 4, Se: 2,
};
const HETERO_LONE_PAIR_BONUS: Record<string, number> = { O: 0.4, N: 0.4, S: 0.3, P: 0.2 };
const HALOGENS = new Set(['F', 'Cl', 'Br', 'I']);

/**
 * Properties of an atom relevant to electron flow detection
 */
interface AtomProperties {
  bondCount: number;
  maxValence: number;
  estimatedLonePairs: number;
  hybridization: 'sp' | 'sp²' | 'sp³';
}

interface DetectionContext {
  bondCounts: Map<number, number>;
  hasDoubleBond: Set<number>;
  hasHalogenNeighbor: Set<number>;
  hasOxygenDoubleBond: Set<number>;
}

function buildDetectionContext(molecule: MoleculeDto): DetectionContext {
  const atomById = new Map(molecule.atoms.map((atom) => [atom.id, atom]));
  const bondCounts = new Map<number, number>();
  const hasDoubleBond = new Set<number>();
  const hasHalogenNeighbor = new Set<number>();
  const hasOxygenDoubleBond = new Set<number>();

  for (const bond of molecule.bonds) {
    bondCounts.set(bond.from, (bondCounts.get(bond.from) ?? 0) + 1);
    bondCounts.set(bond.to, (bondCounts.get(bond.to) ?? 0) + 1);
    const from = atomById.get(bond.from);
    const to = atomById.get(bond.to);
    if (from && to) {
      if (bond.order === 2) {
        hasDoubleBond.add(from.id);
        hasDoubleBond.add(to.id);
        if (to.element === 'O') hasOxygenDoubleBond.add(from.id);
        if (from.element === 'O') hasOxygenDoubleBond.add(to.id);
      }
      if (HALOGENS.has(from.element)) hasHalogenNeighbor.add(to.id);
      if (HALOGENS.has(to.element)) hasHalogenNeighbor.add(from.id);
    }
  }

  return { bondCounts, hasDoubleBond, hasHalogenNeighbor, hasOxygenDoubleBond };
}

/**
 * Analyze atom properties for electron flow detection
 */
function getAtomProperties(atom: AtomDto, context: DetectionContext): AtomProperties {
  const bondCount = context.bondCounts.get(atom.id) ?? 0;

  // Get max valence for element
  const maxValence = MAX_VALENCE[atom.element] || 4;

  // Estimate lone pairs: (maxValence - bondCount) / 2
  // This is simplified; real calculation depends on formal charge
  let estimatedLonePairs = (maxValence - bondCount) / 2;
  if (atom.charge) {
    estimatedLonePairs += atom.charge;
  }
  estimatedLonePairs = Math.max(0, Math.round(estimatedLonePairs));

  // Determine hybridization from bond count
  let hybridization: 'sp' | 'sp²' | 'sp³' = 'sp³';
  if (bondCount <= 1) hybridization = 'sp';
  else if (bondCount === 2) hybridization = 'sp²';
  else hybridization = 'sp³';

  return { bondCount, maxValence, estimatedLonePairs, hybridization };
}

/**
 * Score atom as electron source (0.0-1.0)
 * Sources: nucleophiles, anions, atoms with lone pairs
 */
function scoreAsSource(atom: AtomDto, context: DetectionContext): number {
  let score = 0;

  // Negative formal charge is strong source indicator
  if (atom.charge && atom.charge < 0) {
    score += 0.8 + Math.abs(atom.charge) * 0.05;
  }

  // Heteroatoms with lone pairs
  const bonus = HETERO_LONE_PAIR_BONUS[atom.element] || 0;
  if (bonus > 0) {
    const props = getAtomProperties(atom, context);
    if (props.estimatedLonePairs > 0) {
      score += bonus;
    }
  }

  // Aromatic/π-rich atoms (simplified: bonded to C=C or C≡C)
  if (context.hasDoubleBond.has(atom.id)) {
    score += 0.2;
  }

  return Math.min(1.0, score);
}

/**
 * Score atom as electron sink (0.0-1.0)
 * Sinks: electrophiles, cations, electron-withdrawing atoms
 */
function scoreAsSink(atom: AtomDto, context: DetectionContext): number {
  let score = 0;

  // Positive formal charge is strong sink indicator
  if (atom.charge && atom.charge > 0) {
    score += 0.8 + atom.charge * 0.05;
  }

  // Electrophilic carbon (esp. with leaving group)
  if (atom.element === 'C') {
    const props = getAtomProperties(atom, context);

    // sp² carbon (trigonal, electrophilic)
    if (props.hybridization === 'sp²') {
      score += 0.3;
    }

    // Carbon bonded to halogen (good leaving group)
    if (context.hasHalogenNeighbor.has(atom.id)) {
      score += 0.5;
    }

    // Carbon in carbonyl (C=O is electrophilic)
    if (context.hasOxygenDoubleBond.has(atom.id)) {
      score += 0.3;
    }
  }

  return Math.min(1.0, score);
}

/**
 * Detect electron source candidates
 */
export function detectElectronSources(molecule: MoleculeDto) {
  const context = buildDetectionContext(molecule);
  return molecule.atoms
    .map((atom) => ({
      atomId: atom.id,
      element: atom.element,
      type: 'source' as const,
      confidence: scoreAsSource(atom, context),
      reason: atom.charge && atom.charge < 0
        ? `${atom.element}⁻ (formal charge: ${atom.charge})`
        : `${atom.element} (lone pair potential)`,
    }))
    .filter((c) => c.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect electron sink candidates
 */
export function detectElectronSinks(molecule: MoleculeDto) {
  const context = buildDetectionContext(molecule);
  return molecule.atoms
    .map((atom) => ({
      atomId: atom.id,
      element: atom.element,
      type: 'sink' as const,
      confidence: scoreAsSink(atom, context),
      reason: atom.charge && atom.charge > 0
        ? `${atom.element}⁺ (formal charge: +${atom.charge})`
        : `${atom.element} (electrophilic)`,
    }))
    .filter((c) => c.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Suggest electron flow arrow pairs
 */
export function suggestArrowPairs(
  molecule: MoleculeDto,
  maxSuggestions: number = 5
) {
  const sources = detectElectronSources(molecule);
  const sinks = detectElectronSinks(molecule);

  // Generate all possible pairs, score them, and rank
  const suggestions = sources
    .flatMap((source) =>
      sinks.map((sink) => ({
        sourceAtomId: source.atomId,
        sinkAtomId: sink.atomId,
        sourceConfidence: source.confidence,
        sinkConfidence: sink.confidence,
        confidence: source.confidence * sink.confidence,
        reason: `${source.element} → ${sink.element}`,
      }))
    )
    .filter((s) => s.confidence > 0.1) // Only keep reasonably confident suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);

  return suggestions;
}
