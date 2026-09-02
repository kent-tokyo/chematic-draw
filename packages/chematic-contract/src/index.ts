/** Electron-free public data contract. Keep this file dependency-free. */
export interface MoleculeAtom { id: number; element: string; x: number; y: number; charge: number; atom_map: number; isotope?: number; hydrogen_count?: number; wildcard?: boolean; display_label?: string | null; selected?: boolean; }
export interface MoleculeBond { id: number; from: number; to: number; order: number; stereo: number; selected?: boolean; }
export interface Molecule { atoms: MoleculeAtom[]; bonds: MoleculeBond[]; }
export interface Properties { formula: string; atom_count: number; bond_count: number; molecular_weight: number; logp: number; tpsa: number; hba: number; hbd: number; rotatable_bonds: number; lipinski_pass: boolean; valence_errors: string[]; ring_count: number; }
export interface ExtendedProperties { sa_score: number; esol_solubility: number; fsp3: number; pains_violations: boolean; num_stereocenters: number; num_unspecified_stereocenters: number; }
export interface Fingerprint { hex: string; kind: string; radius: number; bit_length: number; mode: string; }
export interface McsResult { common_atoms: number[]; common_bonds: number[]; similarity: number; search_budget_ms: number; }
export interface StereoAssignment { atom_id: number; code: 'R' | 'S' | 'E' | 'Z' | 'LowerR' | 'LowerS'; }
export interface Atom3d { id: number; element: string; x: number; y: number; z: number; }
export interface Coords3d { atoms: Atom3d[]; }
export type ReactionRunResult =
  | { status: 'applied'; products: Molecule[] }
  | { status: 'no_match' }
  | { status: 'invalid_reaction'; message: string }
  | { status: 'unsupported_chemistry'; message: string }
  | { status: 'error'; message: string };
export interface ReactionCondition { temperature?: string; catalyst?: string; solvent?: string; time?: string; yield?: number; notes?: string; }
export interface MechanismArrow { id: string; sourceAtomId: number; sinkAtomId: number; type: 'forward' | 'retro' | 'resonance'; stepId: string; label?: string; }
export interface MechanismStep { id: string; reactants: Molecule[]; products: Molecule[]; agents?: Molecule[]; reactantComponentIds?: string[]; productComponentIds?: string[]; agentComponentIds?: string[]; authored?: boolean; derivedFrom?: string; reactantCoefficients?: number[]; productCoefficients?: number[]; arrows: MechanismArrow[]; mechanismType: 'sn2' | 'sn1' | 'e1' | 'e2' | 'electrophilic_addition'; conditions?: ReactionCondition; arrowType?: 'single' | 'double' | 'equilibrium' | 'retro'; }
export interface ReactionScheme { id: string; title: string; description?: string; steps: MechanismStep[]; currentStepIndex: number; viewMode: 'step' | 'scheme'; }
export interface AtomMapEntry { originalId: number; element: string; formalCharge: number; color: string; stepMappings: Array<{ stepIndex: number; atomIdInStep: number; retained: boolean }>; }
export interface AtomMapping { entries: Map<number, AtomMapEntry>; totalMappedAtoms: number; }
export interface ReactionClassification { type: 'single_step' | 'multi_step' | 'unknown'; indicators: string[]; }
export interface GreenChemistryMetrics { atomEconomy: number; eFactorApprox: number; stepWaste: Array<{ stepIndex: number; wasteAtoms: number; percentage: number }>; }
export interface ElectronCandidate { atomId: number; element: string; type: 'source' | 'sink'; confidence: number; reason: string; }
export interface ArrowSuggestion { sourceAtomId: number; sinkAtomId: number; sourceConfidence: number; sinkConfidence: number; confidence: number; reason: string; }
export interface ReactionDiagnostics {
  status: 'verified' | 'not_verified';
  issues: string[];
  stepResults: Array<{ stepIndex: number; status: 'verified' | 'not_verified'; atomCount: { reactants: number; products: number }; atomBalance: { balanced: boolean; differences: string[] }; chargeBalance: { balanced: boolean; difference: number }; mapping: ReactionDiagnostics['mapping'] & { mappedAtomCount: number } }>;
  atomBalance: { balanced: boolean; differences: string[] };
  chargeBalance: { balanced: boolean; difference: number };
  continuity: { valid: boolean; issues: string[]; boundaries: Array<{ fromStep: number; toStep: number; matchedMoleculeCount: number }> };
  mapping: { complete: boolean; duplicateMapNumbers: number[]; unmatchedMapNumbers: number[] };
}
export interface RxnDocument { reactants: Molecule[]; products: Molecule[]; agents?: Molecule[]; reactantCoefficients?: number[]; productCoefficients?: number[]; }
export type RxnV2000LossCode = 'agents' | 'coefficients' | 'multi-step';
export interface RxnV2000Loss { code: RxnV2000LossCode; message: string; }
export interface CdxmlText { id: string; x: number; y: number; value: string; }
export interface CdxmlArrow { id: string; x1: number; y1: number; x2: number; y2: number; label?: string; }
export interface CdxmlPage { id: string; molecule: Molecule; title?: string; width?: number; height?: number; text?: CdxmlText[]; arrows?: CdxmlArrow[]; attributes?: Record<string, string>; }
export interface CdxmlDocument { pages: CdxmlPage[]; }
export interface StepBox { stepIndex: number; x: number; y: number; width: number; height: number; selected: boolean; hovered: boolean; }
export interface StepArrow { fromIndex: number; toIndex: number; x1: number; y1: number; x2: number; y2: number; }
export interface SchemeLayout { stepBoxes: StepBox[]; stepArrows: StepArrow[]; canvasWidth: number; canvasHeight: number; padding: number; }
export interface LayoutMetrics { boxOverlaps: number; arrowCrossings: number; clippedBoxes: number; arrowOverflow: number; deterministicKey: string; }
export type MoleculeExportFormat = 'smiles' | 'mol-v2000' | 'rxn-v2000' | 'sdf' | 'cml' | 'cdxml';
export interface ExportLoss { code: 'wildcard' | 'isotope' | 'unsupported-format'; message: string; }
export interface QueryAtomConstraint { elements?: string[]; wildcard?: boolean; charge?: number; isotope?: number; aromatic?: boolean; valence?: number; hydrogens?: number; ring?: boolean; }
export interface QueryAtom { id: number; x: number; y: number; constraint: QueryAtomConstraint; }
export interface QueryBond { id: number; from: number; to: number; constraint: { order: string }; }
export interface MarkushDefinition { id: string; label: string; attachmentAtomIds: number[]; allowedSubstituentSmarts: string[]; }
export interface PolymerDefinition { id: string; repeatUnitAtomIds: number[]; linkageBondIds: number[]; attachmentAtomIds: number[]; endGroups?: { left?: string; right?: string }; }
export interface QueryDocument { schema: 'chematic-draw/query-document'; schema_version: 1; atoms: QueryAtom[]; bonds: QueryBond[]; opaque?: Array<{ kind: 'markush' | 'polymer' | 'smarts-token'; raw: string }>; markush?: MarkushDefinition[]; polymers?: PolymerDefinition[]; }
export interface QueryWorkerResult { pattern: string; matches: number[]; }

export function validateMolecule(molecule: Molecule): string[] {
  if (!molecule || !Array.isArray(molecule.atoms) || !Array.isArray(molecule.bonds)) return ['Molecule must contain atoms and bonds arrays'];
  const ids = new Set<number>();
  for (const atom of molecule.atoms) {
    if (!Number.isInteger(atom.id) || ids.has(atom.id) || typeof atom.element !== 'string' || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)) return [`Invalid atom: ${atom?.id ?? 'unknown'}`];
    ids.add(atom.id);
  }
  for (const bond of molecule.bonds) if (!ids.has(bond.from) || !ids.has(bond.to) || bond.from === bond.to) return [`Invalid bond: ${bond?.id ?? 'unknown'}`];
  return [];
}
