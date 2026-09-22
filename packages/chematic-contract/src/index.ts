/** Electron-free public data contract. Keep this file dependency-free. */
export interface MoleculeAtom { id: number; element: string; x: number; y: number; charge: number; atom_map: number; isotope?: number; hydrogen_count?: number; wildcard?: boolean; display_label?: string | null; selected?: boolean; }
export const BOND_STEREO = { None: 0, WedgeUp: 1, WedgeDown: 2 } as const;
export interface MoleculeBond { id: number; from: number; to: number; order: number; stereo: number; selected?: boolean; }
export interface DrawingText { id: string; x: number; y: number; text: string; }
export interface DrawingArrow { id: string; x1: number; y1: number; x2: number; y2: number; kind: 'forward' | 'equilibrium' | 'retro'; }
export interface DrawingBracket { id: string; x1: number; y1: number; x2: number; y2: number; }
export interface MoleculeDrawing { texts: DrawingText[]; arrows: DrawingArrow[]; brackets: DrawingBracket[]; }
export interface Molecule { atoms: MoleculeAtom[]; bonds: MoleculeBond[]; drawing?: MoleculeDrawing; }
export type ToolName = 'select' | 'atom_c' | 'atom_n' | 'atom_o' | 'atom_s' | 'atom_p' | 'atom_label' | 'bond_single' | 'bond_double' | 'bond_triple' | 'bond_aromatic' | 'bond_wedge' | 'bond_dash' | 'ring_5' | 'ring_6' | 'ring_aromatic' | 'reaction_arrow' | 'text' | 'bracket' | 'eraser';
export interface CanvasState { offset: { x: number; y: number }; zoom: number; activeTool: ToolName; hoverAtomId: number | null; hoverBondId: number | null; selectedAtomIds: Set<number>; selectedBondIds: Set<number>; }
export type AppLanguage = 'en' | 'ja' | 'zh';
export type WorkspaceProfile = 'chemdraw' | 'compact';
export interface UIState { theme: 'dark' | 'light'; language: AppLanguage; sidebarOpen: boolean; sidebarWidth: number; mainToolsOpen: boolean; generalToolbarOpen: boolean; statusBarOpen: boolean; templatePanelOpen: boolean; templatePanelWidth: number; workspaceProfile: WorkspaceProfile; focusMode: boolean; }
export type UIAction = 'copy' | 'cut' | 'paste' | 'duplicate' | 'cleanLayout' | 'export' | 'undo' | 'redo' | 'zoomIn' | 'zoomOut' | 'zoomReset' | 'focusMode' | 'showShortcuts' | 'selectAll' | 'delete';
export type SidebarPanel = 'inspector' | 'query' | 'stereo' | 'chat' | 'research' | 'reactions' | 'batch-results' | 'stereoisomers' | 'lipinski' | 'properties' | 'mechanism' | 'database' | '3d' | 'nmr';
export interface ContextMenuState { visible: boolean; x: number; y: number; atomId?: number; bondId?: number; }
export type ModalType = 'shortcuts' | 'export' | 'undo' | 'batch' | 'settings' | 'migration';
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
  id: 'markush' | 'polymer' | 'nucleic-acid' | 'rich-rxn' | 'cdxml-presentation' | 'publication-layout' | 'embedding' | 'chemspider' | 'nmr' | '3d';
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
  { id: 'cdxml-presentation', support: 'partial', summary: 'Supported multi-page subset with validated basic graphic children and explicit loss boundary', dependency: 'chematic' },
  { id: 'publication-layout', support: 'partial', summary: 'Deterministic metrics and export gates; human visual gate remains', dependency: 'local' },
  { id: 'embedding', support: 'partial', summary: 'Electron-free contract package, read-only viewer, opt-in validated editor, and atomic single/batch Worker edit surface', dependency: 'local' },
  { id: 'chemspider', support: 'external', summary: 'Electron-only opt-in name lookup; credentials, attribution, network, and rate limits remain host-managed', dependency: 'chemspider-api' },
  { id: 'nmr', support: 'partial', summary: 'Loss-aware experimental 1D spectrum contract with manual annotations; automatic assignment and prediction remain external', dependency: 'local' },
  { id: '3d', support: 'partial', summary: 'Deterministic coordinate generation and XYZ export snapshot boundary', dependency: 'local' },
] as const;
export interface CapabilityFixtureDescriptor { capability: CapabilityDescriptor['id']; fixture: string; gate: 'preserve' | 'warn' | 'reject'; }
/** Executable fixture names shared by local conformance and release review. */
export const CAPABILITY_FIXTURE_MANIFEST: readonly CapabilityFixtureDescriptor[] = [
  { capability: 'markush', fixture: 'query-nested-attachments', gate: 'preserve' },
  { capability: 'polymer', fixture: 'polymer-two-attachment-expansion', gate: 'preserve' },
  { capability: 'nucleic-acid', fixture: 'nucleic-acid-typed-boundary', gate: 'warn' },
  { capability: 'rich-rxn', fixture: 'rxn-multi-step-agents-coefficients', gate: 'preserve' },
  { capability: 'cdxml-presentation', fixture: 'cdxml-multi-page-loss-matrix', gate: 'warn' },
  { capability: 'publication-layout', fixture: 'svg-pdf-layout-metrics', gate: 'preserve' },
  { capability: 'embedding', fixture: 'html-react-worker-contract', gate: 'preserve' },
  { capability: 'chemspider', fixture: 'chemspider-opt-in-provider', gate: 'warn' },
  { capability: 'nmr', fixture: 'nmr-1h-spectrum-panel', gate: 'preserve' },
  { capability: '3d', fixture: '3d-export-snapshot', gate: 'preserve' },
] as const;
export type ConformanceFixtureGate = 'preserve' | 'warn' | 'reject';
export interface ConformanceFixtureDescriptor {
  id: string;
  capability: CapabilityDescriptor['id'];
  gate: ConformanceFixtureGate;
  testPath: string;
  network: 'none' | 'external';
}
export type InteropDirection = 'import' | 'export' | 'embed' | 'lookup';
export type InteropBehavior = 'preserve' | 'warn' | 'reject' | 'read-only' | 'unavailable' | 'opt-in';
export interface InteropBoundaryDescriptor {
  id: string;
  capability: CapabilityDescriptor['id'];
  direction: InteropDirection;
  format: string;
  behavior: InteropBehavior;
  lossCodes: readonly string[];
  alternative?: string;
}
/** Machine-readable details for boundaries easily mistaken for full compatibility. */
export const INTEROP_BOUNDARY_MANIFEST: readonly InteropBoundaryDescriptor[] = [
  { id: 'cdxml-import-supported-subset', capability: 'cdxml-presentation', direction: 'import', format: 'CDXML', behavior: 'warn', lossCodes: ['unsupported-page-object', 'unsupported-presentation-attribute'], alternative: 'preserve source CDXML and inspect the loss report' },
  { id: 'cdxml-export-supported-subset', capability: 'cdxml-presentation', direction: 'export', format: 'CDXML', behavior: 'warn', lossCodes: ['wildcard-atom', 'unsupported-element', 'unsupported-bond', 'unsupported-page-object'], alternative: 'export reaction/document JSON when presentation fidelity is not required' },
  { id: 'rxn-v2000-export-loss-aware', capability: 'rich-rxn', direction: 'export', format: 'RXN V2000', behavior: 'warn', lossCodes: ['agents', 'coefficients', 'multi-step'], alternative: 'reaction-document JSON v2' },
  { id: 'nmr-generic-json', capability: 'nmr', direction: 'import', format: 'Generic NMR JSON', behavior: 'preserve', lossCodes: ['vendor-format', 'automatic-assignment', 'prediction'], alternative: 'retain raw vendor data under explicit provenance until an adapter exists' },
  { id: 'web-component-viewer', capability: 'embedding', direction: 'embed', format: 'HTML Web Component', behavior: 'read-only', lossCodes: ['editing', 'analysis', 'network-lookup'], alternative: 'host-controlled editor integration' },
  { id: 'chemspider-provider', capability: 'chemspider', direction: 'lookup', format: 'ChemSpider API', behavior: 'opt-in', lossCodes: ['credentials', 'network', 'terms', 'rate-limit'], alternative: 'PubChem lookup or offline molecule operations' },
] as const;
/** Test-backed boundary inventory. Paths are repository-relative and kept
 * dependency-free so release tooling can verify the contract without loading
 * Electron or the chemistry engine. */
export const CONFORMANCE_FIXTURE_MANIFEST: readonly ConformanceFixtureDescriptor[] = [
  { id: 'query-nested-attachments', capability: 'markush', gate: 'preserve', testPath: 'electron/src/__tests__/queryDocument.test.ts', network: 'none' },
  { id: 'rxn-multi-step-agents-coefficients', capability: 'rich-rxn', gate: 'preserve', testPath: 'electron/src/__tests__/reactionDocumentGate.test.ts', network: 'none' },
  { id: 'cdxml-multi-page-loss-matrix', capability: 'cdxml-presentation', gate: 'warn', testPath: 'electron/src/__tests__/cdxmlExport.test.ts', network: 'none' },
  { id: 'svg-pdf-layout-metrics', capability: 'publication-layout', gate: 'preserve', testPath: 'electron/src/__tests__/layoutMetrics.test.ts', network: 'none' },
  { id: 'html-react-worker-contract', capability: 'embedding', gate: 'preserve', testPath: 'electron/src/__tests__/contractConformance.test.ts', network: 'none' },
  { id: 'chemspider-opt-in-provider', capability: 'chemspider', gate: 'warn', testPath: 'electron/src/__tests__/chemspiderProvider.test.ts', network: 'external' },
  { id: 'polymer-two-attachment-expansion', capability: 'polymer', gate: 'preserve', testPath: 'electron/src/__tests__/specialChemistry.test.ts', network: 'none' },
  { id: 'nucleic-acid-typed-boundary', capability: 'nucleic-acid', gate: 'warn', testPath: 'electron/src/__tests__/queryDocument.test.ts', network: 'none' },
  { id: 'nmr-1h-spectrum-panel', capability: 'nmr', gate: 'preserve', testPath: 'electron/src/__tests__/nmrContract.test.ts', network: 'none' },
  { id: '3d-export-snapshot', capability: '3d', gate: 'preserve', testPath: 'electron/src/__tests__/layoutDeterminism.test.ts', network: 'none' },
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
export interface BatchProvenance { engine: 'chematic 1.0.19'; inputFormat?: string; outputFormat?: string; filterOptions?: BatchTask['filterOptions']; smartsPattern?: string; }
export interface BatchResultSummary { operation: string; processed: number; failed: number; skipped: number; resultHash: string; errors: string[]; timestamp: number; provenance: BatchProvenance; cancelled?: boolean; items: BatchItemSummary[]; retry?: { task: BatchTask; molecules: Molecule[] }; }
export interface StereoisomerResult { stereoisomers: Molecule[]; count: number; description: string; }
export interface LipinskiViolation { rule: string; value: number; limit: number; violated: boolean; }
export interface PropertyPrediction { property: string; predictedValue: number | string; source: string; }
export interface DatabaseResult { molId: string; name: string; source: 'pubchem' | 'chemspider' | 'zinc'; similarity: number; smiles?: string; properties: Record<string, string | number>; }
export interface SessionBundle { schema: 'chematic-draw/session-bundle'; schema_version: 2; app: { name: 'chematic-draw'; engine: 'chematic 1.0.19' }; source: { file_path: string | null }; document: { schema_version: 1; molecule: Molecule }; provenance: { operation: 'export-session-bundle'; structure_hash: string }; }
export type ReactionDocumentIssueCode = 'duplicate-step-id' | 'component-id' | 'coefficient' | 'continuity' | 'map-scope' | 'provenance';
export interface ReactionDocumentIssue { code: ReactionDocumentIssueCode; path: string; message: string; }
export interface RxnDocument { reactants: Molecule[]; products: Molecule[]; agents?: Molecule[]; reactantCoefficients?: number[]; productCoefficients?: number[]; }
export type RxnV2000LossCode = 'agents' | 'coefficients' | 'multi-step';
export interface RxnV2000Loss { code: RxnV2000LossCode; message: string; }
export interface CdxmlTextRun { value: string; attributes?: Record<string, string>; }
export interface CdxmlText { id: string; x: number; y: number; value: string; runs?: CdxmlTextRun[]; attributes?: Record<string, string>; }
export interface CdxmlTitle { value: string; runs?: CdxmlTextRun[]; attributes?: Record<string, string>; }
/** A simple self-closing CDXML graphic whose raw attributes can be retained. */
export interface CdxmlTransform { a: number; b: number; c: number; d: number; tx: number; ty: number; }
/** A validated direct child of a CDXML graphic (for example a line or ellipse). */
export interface CdxmlGraphicChild { name: string; attributes?: Record<string, string>; content?: string; }
export interface CdxmlGraphic { id: string; transform?: CdxmlTransform; attributes?: Record<string, string>; children?: CdxmlGraphicChild[]; }
/** An opaque page-level object (currently used for lossless CDXML groups). */
export interface CdxmlRawObject { id: string; tag: string; rawXml: string; }
export type CdxmlContentOrderKind = 'title' | 'text' | 'graphic' | 'arrow' | 'fragment' | 'object';
export interface CdxmlContentOrderEntry { kind: CdxmlContentOrderKind; id: string; }
export interface CdxmlArrow { id: string; x1: number; y1: number; x2: number; y2: number; label?: string; }
export interface CdxmlPage { id: string; molecule: Molecule; title?: string; titleRuns?: CdxmlTextRun[]; width?: number; height?: number; transform?: CdxmlTransform; text?: CdxmlText[]; graphics?: CdxmlGraphic[]; arrows?: CdxmlArrow[]; objects?: CdxmlRawObject[]; contentOrder?: CdxmlContentOrderEntry[]; attributes?: Record<string, string>; }
export interface CdxmlDocument { pages: CdxmlPage[]; }
export type CdxmlLossCode = 'invalid-page' | 'wildcard-atom' | 'unsupported-element' | 'unsupported-bond';
export interface CdxmlLoss { code: CdxmlLossCode; path: string; message: string; }
export interface StepBox { stepIndex: number; x: number; y: number; width: number; height: number; selected: boolean; hovered: boolean; }
export interface StepArrow { fromIndex: number; toIndex: number; x1: number; y1: number; x2: number; y2: number; }
export interface LayoutTextBox { id: string; x: number; y: number; width: number; height: number; text: string; }
export interface SchemeLayout { stepBoxes: StepBox[]; stepArrows: StepArrow[]; textBoxes?: LayoutTextBox[]; canvasWidth: number; canvasHeight: number; padding: number; }
export interface LayoutMetrics { boxOverlaps: number; arrowCrossings: number; clippedBoxes: number; arrowOverflow: number; textOverlaps: number; textOverflow: number; invalidGeometry: number; deterministicKey: string; }
export type MoleculeExportFormat = 'smiles' | 'mol-v2000' | 'rxn-v2000' | 'sdf' | 'cml' | 'cdxml';
export interface ExportLoss { code: 'wildcard' | 'isotope' | 'drawing' | 'unsupported-format'; message: string; }
export interface QueryAtomConstraint { elements?: string[]; wildcard?: boolean; charge?: number; isotope?: number; aromatic?: boolean; valence?: number; hydrogens?: number; ring?: boolean; }
export interface QueryAtom { id: number; x: number; y: number; constraint: QueryAtomConstraint; }
export type QueryBondOrder = 'single' | 'double' | 'triple' | 'aromatic' | 'any' | 'single-or-aromatic' | 'single-or-double';
export interface QueryBond { id: number; from: number; to: number; constraint: { order: QueryBondOrder }; }
export interface MarkushDefinition { id: string; label: string; attachmentAtomIds: number[]; allowedSubstituentSmarts: string[]; }
export interface PolymerDefinition { id: string; repeatUnitAtomIds: number[]; linkageBondIds: number[]; attachmentAtomIds: number[]; endGroups?: { left?: string; right?: string }; }
export type NucleicAcidBase = 'A' | 'C' | 'G' | 'T' | 'U' | 'other';
export type NucleicAcidSugar = 'ribose' | 'deoxyribose' | 'unknown';
export interface NucleicAcidResidue { id: string; base: NucleicAcidBase; sugar: NucleicAcidSugar; atomIds: number[]; phosphateAttached?: boolean; label?: string; }
export interface NucleicAcidDefinition { id: string; residueIds: string[]; backboneBondIds: number[]; residues: NucleicAcidResidue[]; annotations?: Record<string, string>; }
export interface QueryDocument { schema: 'chematic-draw/query-document'; schema_version: 1; atoms: QueryAtom[]; bonds: QueryBond[]; opaque?: Array<{ kind: 'markush' | 'polymer' | 'nucleic-acid' | 'smarts-token'; raw: string }>; markush?: MarkushDefinition[]; polymers?: PolymerDefinition[]; nucleicAcids?: NucleicAcidDefinition[]; }
export interface QueryWorkerResult { pattern: string; matches: number[]; }
export interface QueryValidationError { code: 'invalid' | 'unsupported'; path: string; message: string; }
export interface HitResult { type: 'atom' | 'bond' | 'empty'; id?: number; }
export interface GeometryCanvasState { offset: { x: number; y: number }; zoom: number; }
export interface ArrowPath { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number; endAngle: number; }

/** Experimental NMR data stays separate from molecule identity and prediction APIs. */
export type NmrNucleus = '1H' | '13C' | '19F' | '31P' | '15N' | '29Si' | 'other';
export interface NmrPeak { id: string; shiftPpm: number; intensity?: number; widthPpm?: number; multiplicity?: string; assignment?: string; note?: string; }
export interface NmrSpectrum {
  schema: 'chematic-draw/nmr-spectrum';
  schema_version: 1;
  nucleus: NmrNucleus;
  frequencyMHz?: number;
  solvent?: string;
  reference?: string;
  temperatureC?: number;
  peaks: NmrPeak[];
  rawVendorMetadata?: Record<string, string | number | boolean>;
  provenance: { kind: 'experimental-import' | 'manual-entry'; source?: string; importedAt?: string };
}
export interface NmrValidationError { code: 'invalid' | 'unsupported'; path: string; message: string; }

// NMR is a user-imported document boundary. Keep generous limits here so a
// malformed JSON file cannot turn rendering or serialization into an
// unbounded operation.
export const MAX_NMR_PEAKS = 100_000;
export const MAX_NMR_METADATA_ENTRIES = 256;
export const MAX_NMR_STRING_LENGTH = 2_048;
export const MAX_NMR_JSON_LENGTH = 10_000_000;

export function validateNmrSpectrum(spectrum: NmrSpectrum): NmrValidationError[] {
  const errors: NmrValidationError[] = [];
  if (!spectrum || spectrum.schema !== 'chematic-draw/nmr-spectrum' || spectrum.schema_version !== 1) {
    return [{ code: 'invalid', path: '$', message: 'Unsupported NMR spectrum schema' }];
  }
  const nuclei: NmrNucleus[] = ['1H', '13C', '19F', '31P', '15N', '29Si', 'other'];
  if (!nuclei.includes(spectrum.nucleus)) errors.push({ code: 'invalid', path: 'nucleus', message: 'Unsupported NMR nucleus' });
  if (!spectrum.provenance || !['experimental-import', 'manual-entry'].includes(spectrum.provenance.kind)) {
    errors.push({ code: 'invalid', path: 'provenance.kind', message: 'Unsupported provenance kind' });
  }
  for (const field of ['solvent', 'reference'] as const) {
    if (spectrum[field] !== undefined && (typeof spectrum[field] !== 'string' || spectrum[field].length > MAX_NMR_STRING_LENGTH)) {
      errors.push({ code: 'invalid', path: field, message: `${field} must be a string of at most ${MAX_NMR_STRING_LENGTH} characters` });
    }
  }
  for (const field of ['source', 'importedAt'] as const) {
    const value = spectrum.provenance?.[field];
    if (value !== undefined && (typeof value !== 'string' || value.length > MAX_NMR_STRING_LENGTH)) {
      errors.push({ code: 'invalid', path: `provenance.${field}`, message: `${field} must be a string of at most ${MAX_NMR_STRING_LENGTH} characters` });
    }
  }
  if (spectrum.temperatureC !== undefined && !Number.isFinite(spectrum.temperatureC)) errors.push({ code: 'invalid', path: 'temperatureC', message: 'Temperature must be finite' });
  if (spectrum.rawVendorMetadata !== undefined) {
    const metadata = spectrum.rawVendorMetadata;
    const entries = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? Object.entries(metadata) : null;
    if (!entries || entries.length > MAX_NMR_METADATA_ENTRIES || entries.some(([key, value]) => key.length > MAX_NMR_STRING_LENGTH || !['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value)) || (typeof value === 'string' && value.length > MAX_NMR_STRING_LENGTH))) {
      errors.push({ code: 'invalid', path: 'rawVendorMetadata', message: `Vendor metadata must be a plain object with at most ${MAX_NMR_METADATA_ENTRIES} finite primitive entries` });
    }
  }
  if (!Array.isArray(spectrum.peaks)) errors.push({ code: 'invalid', path: 'peaks', message: 'Peaks must be an array' });
  else if (spectrum.peaks.length > MAX_NMR_PEAKS) errors.push({ code: 'invalid', path: 'peaks', message: `Peaks must contain at most ${MAX_NMR_PEAKS} entries` });
  if (spectrum.frequencyMHz !== undefined && (!Number.isFinite(spectrum.frequencyMHz) || spectrum.frequencyMHz <= 0)) {
    errors.push({ code: 'invalid', path: 'frequencyMHz', message: 'Frequency must be a positive finite number' });
  }
  const ids = new Set<string>();
  for (const [index, peak] of (spectrum.peaks ?? []).entries()) {
    const path = `peaks[${index}]`;
    if (!peak || typeof peak.id !== 'string' || peak.id.length === 0 || ids.has(peak.id)) errors.push({ code: 'invalid', path: `${path}.id`, message: 'Peak IDs must be non-empty and unique' });
    if (typeof peak?.id === 'string') {
      if (peak.id.length > MAX_NMR_STRING_LENGTH) errors.push({ code: 'invalid', path: `${path}.id`, message: `Peak IDs must be at most ${MAX_NMR_STRING_LENGTH} characters` });
      ids.add(peak.id);
    }
    if (!Number.isFinite(peak?.shiftPpm)) errors.push({ code: 'invalid', path: `${path}.shiftPpm`, message: 'Chemical shift must be finite' });
    for (const field of ['intensity', 'widthPpm'] as const) if (peak?.[field] !== undefined && (!Number.isFinite(peak[field]) || peak[field] < 0)) errors.push({ code: 'invalid', path: `${path}.${field}`, message: `${field} must be a non-negative finite number` });
    for (const field of ['multiplicity', 'assignment', 'note'] as const) if (peak?.[field] !== undefined && (typeof peak[field] !== 'string' || peak[field].length > MAX_NMR_STRING_LENGTH)) errors.push({ code: 'invalid', path: `${path}.${field}`, message: `${field} must be a string of at most ${MAX_NMR_STRING_LENGTH} characters` });
  }
  return errors;
}

/** Return a detached, deterministically ordered NMR document for persistence. */
export function normalizeNmrSpectrum(spectrum: NmrSpectrum): NmrSpectrum {
  const errors = validateNmrSpectrum(spectrum);
  if (errors.length > 0) throw new TypeError(`Invalid NMR spectrum: ${errors.map((error) => `${error.path}: ${error.message}`).join('; ')}`);
  const rawVendorMetadata = spectrum.rawVendorMetadata === undefined
    ? undefined
    : Object.fromEntries(Object.entries(spectrum.rawVendorMetadata).sort(([left], [right]) => left.localeCompare(right)));
  return {
    schema: spectrum.schema,
    schema_version: spectrum.schema_version,
    nucleus: spectrum.nucleus,
    ...(spectrum.frequencyMHz === undefined ? {} : { frequencyMHz: spectrum.frequencyMHz }),
    ...(spectrum.solvent === undefined ? {} : { solvent: spectrum.solvent }),
    ...(spectrum.reference === undefined ? {} : { reference: spectrum.reference }),
    ...(spectrum.temperatureC === undefined ? {} : { temperatureC: spectrum.temperatureC }),
    peaks: spectrum.peaks
      .map((peak) => ({ ...peak }))
      .sort((left, right) => left.shiftPpm - right.shiftPpm || left.id.localeCompare(right.id)),
    ...(rawVendorMetadata === undefined ? {} : { rawVendorMetadata }),
    provenance: {
      kind: spectrum.provenance.kind,
      ...(spectrum.provenance.source === undefined ? {} : { source: spectrum.provenance.source }),
      ...(spectrum.provenance.importedAt === undefined ? {} : { importedAt: spectrum.provenance.importedAt }),
    },
  };
}

/** Serialize a validated NMR document without input-order drift. */
export function serializeNmrSpectrum(spectrum: NmrSpectrum): string {
  return JSON.stringify(normalizeNmrSpectrum(spectrum), null, 2);
}

export function validateMolecule(molecule: Molecule): string[] {
  if (!molecule || !Array.isArray(molecule.atoms) || !Array.isArray(molecule.bonds)) return ['Molecule must contain atoms and bonds arrays'];
  if (molecule.atoms.length > MAX_MOLECULE_ATOMS) return [`Molecule exceeds the ${MAX_MOLECULE_ATOMS.toLocaleString()} atom limit`];
  if (molecule.bonds.length > MAX_MOLECULE_BONDS) return [`Molecule exceeds the ${MAX_MOLECULE_BONDS.toLocaleString()} bond limit`];
  const ids = new Set<number>();
  for (const atom of molecule.atoms) {
    if (!atom || typeof atom !== 'object' || !Number.isInteger(atom.id) || ids.has(atom.id) || typeof atom.element !== 'string' || atom.element.length === 0 || atom.element.length > MAX_ELEMENT_TEXT_LENGTH || !Number.isFinite(atom.x) || !Number.isFinite(atom.y)) return [`Invalid atom: ${atom?.id ?? 'unknown'}`];
    ids.add(atom.id);
  }
  const bondIds = new Set<number>();
  for (const bond of molecule.bonds) if (!bond || typeof bond !== 'object' || !Number.isInteger(bond.id) || bondIds.has(bond.id) || !ids.has(bond.from) || !ids.has(bond.to) || bond.from === bond.to || ![1, 2, 3, 4].includes(bond.order) || ![0, 1, 2].includes(bond.stereo)) return [`Invalid bond: ${bond?.id ?? 'unknown'}`]; else bondIds.add(bond.id);
  if (molecule.drawing !== undefined) {
    const drawing = molecule.drawing;
    if (!drawing || !Array.isArray(drawing.texts) || !Array.isArray(drawing.arrows) || !Array.isArray(drawing.brackets)) return ['Invalid drawing layer'];
    const finite = (...values: number[]) => values.every(Number.isFinite);
    if (drawing.texts.length + drawing.arrows.length + drawing.brackets.length > 10_000) return ['Drawing layer exceeds the 10,000 item limit'];
    if (drawing.texts.some((item) => !item || typeof item.id !== 'string' || typeof item.text !== 'string' || item.text.length > 2_048 || !finite(item.x, item.y))) return ['Invalid drawing text'];
    if (drawing.arrows.some((item) => !item || typeof item.id !== 'string' || !['forward', 'equilibrium', 'retro'].includes(item.kind) || !finite(item.x1, item.y1, item.x2, item.y2))) return ['Invalid drawing arrow'];
    if (drawing.brackets.some((item) => !item || typeof item.id !== 'string' || !finite(item.x1, item.y1, item.x2, item.y2))) return ['Invalid drawing bracket'];
  }
  return [];
}
