import { MoleculeDto, AtomDto } from '../store/types';

/**
 * Properties of an atom relevant to electron flow detection
 */
interface AtomProperties {
  bondCount: number;
  maxValence: number;
  estimatedLonePairs: number;
  hybridization: 'sp' | 'sp²' | 'sp³';
}

/**
 * Analyze atom properties for electron flow detection
 */
function getAtomProperties(atom: AtomDto, molecule: MoleculeDto): AtomProperties {
  // Count bonds connected to this atom
  const bondCount = molecule.bonds.filter(
    (b) => b.source_id === atom.id || b.target_id === atom.id
  ).length;

  // Get max valence for element
  const valenceMap: Record<string, number> = {
    H: 1, C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1,
    P: 3, B: 3, Si: 4, Se: 2,
  };
  const maxValence = valenceMap[atom.element] || 4;

  // Estimate lone pairs: (maxValence - bondCount) / 2
  // This is simplified; real calculation depends on formal charge
  let estimatedLonePairs = (maxValence - bondCount) / 2;
  if (atom.formal_charge) {
    estimatedLonePairs += atom.formal_charge;
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
function scoreAsSource(atom: AtomDto, molecule: MoleculeDto): number {
  let score = 0;

  // Negative formal charge is strong source indicator
  if (atom.formal_charge && atom.formal_charge < 0) {
    score += 0.8 + Math.abs(atom.formal_charge) * 0.05;
  }

  // Heteroatoms with lone pairs
  const heteroLonePairBonus: Record<string, number> = {
    O: 0.4, N: 0.4, S: 0.3, P: 0.2,
  };
  const bonus = heteroLonePairBonus[atom.element] || 0;
  if (bonus > 0) {
    const props = getAtomProperties(atom, molecule);
    if (props.estimatedLonePairs > 0) {
      score += bonus;
    }
  }

  // Aromatic/π-rich atoms (simplified: bonded to C=C or C≡C)
  const hasDoubleBond = molecule.bonds.some(
    (b) => (b.source_id === atom.id || b.target_id === atom.id) && b.bond_type === 'Double'
  );
  if (hasDoubleBond) {
    score += 0.2;
  }

  return Math.min(1.0, score);
}

/**
 * Score atom as electron sink (0.0-1.0)
 * Sinks: electrophiles, cations, electron-withdrawing atoms
 */
function scoreAsSink(atom: AtomDto, molecule: MoleculeDto): number {
  let score = 0;

  // Positive formal charge is strong sink indicator
  if (atom.formal_charge && atom.formal_charge > 0) {
    score += 0.8 + atom.formal_charge * 0.05;
  }

  // Electrophilic carbon (esp. with leaving group)
  if (atom.element === 'C') {
    const props = getAtomProperties(atom, molecule);

    // sp² carbon (trigonal, electrophilic)
    if (props.hybridization === 'sp²') {
      score += 0.3;
    }

    // Carbon bonded to halogen (good leaving group)
    const hasHalogenNeighbor = molecule.bonds.some((b) => {
      const otherId = b.source_id === atom.id ? b.target_id : b.source_id;
      const otherAtom = molecule.atoms.find((a) => a.id === otherId);
      return otherAtom && ['F', 'Cl', 'Br', 'I'].includes(otherAtom.element);
    });
    if (hasHalogenNeighbor) {
      score += 0.5;
    }

    // Carbon in carbonyl (C=O is electrophilic)
    const hasOxygenDouble = molecule.bonds.some((b) => {
      if (b.bond_type !== 'Double') return false;
      const otherId = b.source_id === atom.id ? b.target_id : b.source_id;
      const otherAtom = molecule.atoms.find((a) => a.id === otherId);
      return otherAtom && otherAtom.element === 'O';
    });
    if (hasOxygenDouble) {
      score += 0.3;
    }
  }

  return Math.min(1.0, score);
}

/**
 * Detect electron source candidates
 */
export function detectElectronSources(molecule: MoleculeDto) {
  return molecule.atoms
    .map((atom) => ({
      atomId: atom.id,
      element: atom.element,
      type: 'source' as const,
      confidence: scoreAsSource(atom, molecule),
      reason: atom.formal_charge && atom.formal_charge < 0
        ? `${atom.element}⁻ (formal charge: ${atom.formal_charge})`
        : `${atom.element} (lone pair potential)`,
    }))
    .filter((c) => c.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect electron sink candidates
 */
export function detectElectronSinks(molecule: MoleculeDto) {
  return molecule.atoms
    .map((atom) => ({
      atomId: atom.id,
      element: atom.element,
      type: 'sink' as const,
      confidence: scoreAsSink(atom, molecule),
      reason: atom.formal_charge && atom.formal_charge > 0
        ? `${atom.element}⁺ (formal charge: +${atom.formal_charge})`
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
