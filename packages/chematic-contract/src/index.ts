/** Electron-free public data contract. Keep this file dependency-free. */
export interface MoleculeAtom { id: number; element: string; x: number; y: number; charge: number; atom_map: number; isotope?: number; hydrogen_count?: number; wildcard?: boolean; display_label?: string | null; selected?: boolean; }
export interface MoleculeBond { id: number; from: number; to: number; order: number; stereo: number; selected?: boolean; }
export interface Molecule { atoms: MoleculeAtom[]; bonds: MoleculeBond[]; }
export interface Properties { formula: string; atom_count: number; bond_count: number; molecular_weight: number; logp: number; tpsa: number; hba: number; hbd: number; rotatable_bonds: number; lipinski_pass: boolean; valence_errors: string[]; ring_count: number; }
export interface ExtendedProperties { sa_score: number; esol_solubility: number; fsp3: number; pains_violations: boolean; num_stereocenters: number; num_unspecified_stereocenters: number; }
export interface Fingerprint { hex: string; kind: string; radius: number; bit_length: number; mode: string; }
export interface ReactionCondition { temperature?: string; catalyst?: string; solvent?: string; time?: string; yield?: number; notes?: string; }
export interface MechanismArrow { id: string; sourceAtomId: number; sinkAtomId: number; type: 'forward' | 'retro' | 'resonance'; stepId: string; label?: string; }
export interface MechanismStep { id: string; reactants: Molecule[]; products: Molecule[]; agents?: Molecule[]; reactantComponentIds?: string[]; productComponentIds?: string[]; agentComponentIds?: string[]; authored?: boolean; derivedFrom?: string; reactantCoefficients?: number[]; productCoefficients?: number[]; arrows: MechanismArrow[]; mechanismType: 'sn2' | 'sn1' | 'e1' | 'e2' | 'electrophilic_addition'; conditions?: ReactionCondition; arrowType?: 'single' | 'double' | 'equilibrium' | 'retro'; }
export interface ReactionScheme { id: string; title: string; description?: string; steps: MechanismStep[]; currentStepIndex: number; viewMode: 'step' | 'scheme'; }
export interface QueryAtomConstraint { elements?: string[]; wildcard?: boolean; charge?: number; isotope?: number; aromatic?: boolean; valence?: number; hydrogens?: number; ring?: boolean; }
export interface QueryAtom { id: number; x: number; y: number; constraint: QueryAtomConstraint; }
export interface QueryBond { id: number; from: number; to: number; constraint: { order: string }; }
export interface MarkushDefinition { id: string; label: string; attachmentAtomIds: number[]; allowedSubstituentSmarts: string[]; }
export interface PolymerDefinition { id: string; repeatUnitAtomIds: number[]; linkageBondIds: number[]; attachmentAtomIds: number[]; endGroups?: { left?: string; right?: string }; }
export interface QueryDocument { schema: 'chematic-draw/query-document'; schema_version: 1; atoms: QueryAtom[]; bonds: QueryBond[]; opaque?: Array<{ kind: 'markush' | 'polymer' | 'smarts-token'; raw: string }>; markush?: MarkushDefinition[]; polymers?: PolymerDefinition[]; }

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
