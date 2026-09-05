/** Electron-free public data contract. Keep this file dependency-free. */
export interface MoleculeAtom { id: number; element: string; x: number; y: number; charge: number; atom_map: number; isotope?: number; hydrogen_count?: number; wildcard?: boolean; display_label?: string | null; selected?: boolean; }
export const BOND_STEREO = { None: 0, WedgeUp: 1, WedgeDown: 2 } as const;
export interface MoleculeBond { id: number; from: number; to: number; order: number; stereo: number; selected?: boolean; }
export interface Molecule { atoms: MoleculeAtom[]; bonds: MoleculeBond[]; }
export type ToolName = 'select' | 'atom_c' | 'atom_n' | 'atom_o' | 'atom_s' | 'atom_p' | 'bond_single' | 'bond_double' | 'bond_triple' | 'bond_aromatic' | 'eraser';
export interface CanvasState { offset: { x: number; y: number }; zoom: number; activeTool: ToolName; hoverAtomId: number | null; hoverBondId: number | null; selectedAtomIds: Set<number>; selectedBondIds: Set<number>; }
export type AppLanguage = 'en' | 'ja' | 'zh';
export interface UIState { theme: 'dark' | 'light'; language: AppLanguage; sidebarOpen: boolean; sidebarWidth: number; focusMode: boolean; }
export type UIAction = 'copy' | 'paste' | 'cleanLayout' | 'export' | 'undo' | 'redo' | 'zoomIn' | 'zoomOut' | 'zoomReset' | 'focusMode' | 'showShortcuts' | 'selectAll' | 'delete';
export type SidebarPanel = 'inspector' | 'templates' | 'chat' | 'research' | 'reactions' | 'batch-results' | 'stereoisomers' | 'lipinski' | 'properties' | 'mechanism' | 'database' | '3d';
export interface ContextMenuState { visible: boolean; x: number; y: number; atomId?: number; bondId?: number; }
export type ModalType = 'shortcuts' | 'export' | 'undo' | 'batch' | 'settings';
export interface MechanismState { arrows: MechanismArrow[]; selectedArrowId: string | null; arrowSelectionMode: 'idle' | 'awaitingSink'; pendingSourceAtomId: number | null; pendingSinkAtomId: number | null; hoverArrowId: string | null; }
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
export interface ValidationResult { valid: boolean; issues: string[]; }
export type ExtensionPermission = 'document:write' | 'analysis:read' | 'import:read' | 'export:write';
export const EXTENSION_API_VERSION = 1;
export const MAX_MOLECULE_ATOMS = 100_000;
export const MAX_MOLECULE_BONDS = 200_000;
export const MAX_ELEMENT_TEXT_LENGTH = 16;
export const MAX_DISPLAY_LABEL_LENGTH = 256;
export type CapabilitySupport = 'supported' | 'partial' | 'unsupported' | 'external';
export interface CapabilityDescriptor {
  id: 'markush' | 'polymer' | 'nucleic-acid' | 'rich-rxn' | 'cdxml-presentation' | 'publication-layout' | 'embedding' | 'chemspider';
  support: CapabilitySupport;
  summary: string;
  dependency: 'local' | 'chematic' | 'chemspider-api';
}
/** Machine-readable parity boundary shared by UI, fixtures, and embedders. */
export const CAPABILITY_MANIFEST: readonly CapabilityDescriptor[] = [
  { id: 'markush', support: 'partial', summary: 'Typed bounded query data and deterministic expansion', dependency: 'local' },
  { id: 'polymer', support: 'partial', summary: 'Typed repeat-unit data and bounded expansion', dependency: 'local' },
  { id: 'nucleic-acid', support: 'partial', summary: 'Basic structure editing without full biomolecule semantics', dependency: 'local' },
  { id: 'rich-rxn', support: 'partial', summary: 'JSON v2 preserves rich schemes; RXN V2000 is loss-aware', dependency: 'local' },
  { id: 'cdxml-presentation', support: 'partial', summary: 'Supported multi-page subset with explicit loss boundary', dependency: 'chematic' },
  { id: 'publication-layout', support: 'partial', summary: 'Deterministic metrics and export gates; human visual gate remains', dependency: 'local' },
  { id: 'embedding', support: 'partial', summary: 'Electron-free contract package, consumer fixtures, and read-only Web Component surface', dependency: 'local' },
  { id: 'chemspider', support: 'external', summary: 'Provider boundary reserved; authenticated API integration unavailable', dependency: 'chemspider-api' },
] as const;
export interface ExtensionManifest { id: string; version: string; api_version?: number; permissions: ExtensionPermission[]; }
export interface DocumentCommandContext { molecule: Molecule; payload?: unknown; }
export interface DocumentCommand { id: string; description: string; requiredPermission: 'document:write'; execute: (context: DocumentCommandContext) => Molecule; }
export interface AnalysisProvider { id: string; description: string; analyze: (molecule: Molecule) => unknown; }
export interface ExtensionHost {
  register(manifest: ExtensionManifest, commands?: DocumentCommand[], providers?: AnalysisProvider[]): void;
  execute(extensionId: string, commandId: string, molecule: Molecule, payload?: unknown): Molecule;
  analyze(extensionId: string, providerId: string, molecule: Molecule): unknown;
}
export type BatchOperation = 'convert' | 'standardize' | 'filter' | 'properties';
export interface BatchTask {
  operation: BatchOperation;
  inputFormat?: string;
  outputFormat?: string;
  filterOptions?: { minMW?: number; maxMW?: number; minLogP?: number; maxLogP?: number };
  smartsPattern?: string;
}
export type BatchItemStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'cancelled';
export interface BatchItemResult { index: number; status: BatchItemStatus; input: Molecule; output?: Molecule & Partial<{ properties: Properties }>; warnings: string[]; error?: string; }
export interface BatchProgress { completed: number; total: number; item: BatchItemResult; }
export interface BatchProcessResult {
  processed: number; failed: number; skipped: number; resultHash: string;
  molecules: (Molecule & Partial<{ properties: Properties }>)[];
  errors: string[]; items: BatchItemResult[]; cancelled: boolean;
}
export interface BatchItemSummary { index: number; status: Exclude<BatchItemStatus, 'pending' | 'running'>; warnings: string[]; error?: string; inputAtomCount?: number; inputBondCount?: number; outputAtomCount?: number; outputBondCount?: number; properties?: Pick<Properties, 'formula' | 'molecular_weight' | 'logp' | 'tpsa'>; }
export interface BatchProvenance { engine: 'chematic 1.0.6'; inputFormat?: string; outputFormat?: string; filterOptions?: BatchTask['filterOptions']; smartsPattern?: string; }
export interface BatchResultSummary { operation: string; processed: number; failed: number; skipped: number; resultHash: string; errors: string[]; timestamp: number; provenance: BatchProvenance; cancelled?: boolean; items: BatchItemSummary[]; retry?: { task: BatchTask; molecules: Molecule[] }; }
export interface StereoisomerResult { stereoisomers: Molecule[]; count: number; description: string; }
export interface LipinskiViolation { rule: string; value: number; limit: number; violated: boolean; }
export interface PropertyPrediction { property: string; predictedValue: number | string; source: string; }
export interface DatabaseResult { molId: string; name: string; source: 'pubchem' | 'chemspider' | 'zinc'; similarity: number; properties: Record<string, string | number>; }
export interface SessionBundle { schema: 'chematic-draw/session-bundle'; schema_version: 2; app: { name: 'chematic-draw'; engine: 'chematic 1.0.6' }; source: { file_path: string | null }; document: { schema_version: 1; molecule: Molecule }; provenance: { operation: 'export-session-bundle'; structure_hash: string }; }
export type ReactionDocumentIssueCode = 'duplicate-step-id' | 'component-id' | 'coefficient' | 'continuity' | 'map-scope' | 'provenance';
export interface ReactionDocumentIssue { code: ReactionDocumentIssueCode; path: string; message: string; }
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
export type QueryBondOrder = 'single' | 'double' | 'triple' | 'aromatic' | 'any' | 'single-or-aromatic' | 'single-or-double';
export interface QueryBond { id: number; from: number; to: number; constraint: { order: QueryBondOrder }; }
export interface MarkushDefinition { id: string; label: string; attachmentAtomIds: number[]; allowedSubstituentSmarts: string[]; }
export interface PolymerDefinition { id: string; repeatUnitAtomIds: number[]; linkageBondIds: number[]; attachmentAtomIds: number[]; endGroups?: { left?: string; right?: string }; }
export interface QueryDocument { schema: 'chematic-draw/query-document'; schema_version: 1; atoms: QueryAtom[]; bonds: QueryBond[]; opaque?: Array<{ kind: 'markush' | 'polymer' | 'smarts-token'; raw: string }>; markush?: MarkushDefinition[]; polymers?: PolymerDefinition[]; }
export interface QueryWorkerResult { pattern: string; matches: number[]; }
export interface QueryValidationError { code: 'invalid' | 'unsupported'; path: string; message: string; }
export interface HitResult { type: 'atom' | 'bond' | 'empty'; id?: number; }
export interface GeometryCanvasState { offset: { x: number; y: number }; zoom: number; }
export interface ArrowPath { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number; endAngle: number; }

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
