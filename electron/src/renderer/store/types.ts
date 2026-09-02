import type { Molecule, Properties } from '../../../../packages/chematic-contract/src/index';

// Chemistry DTOs are owned by the Electron-free contract package. UI-only
// selection remains optional so the renderer can keep its existing state shape.
export type { MoleculeAtom as AtomDto, MoleculeBond as BondDto, Molecule as MoleculeDto } from '../../../../packages/chematic-contract/src/index';
type MoleculeDto = Molecule;

export type { Properties as PropertiesDto } from '../../../../packages/chematic-contract/src/index';
type PropertiesDto = Properties;

// Tool enum
export enum Tool {
  Select = 'select',
  Atom_C = 'atom_c',
  Atom_N = 'atom_n',
  Atom_O = 'atom_o',
  Atom_S = 'atom_s',
  Atom_P = 'atom_p',
  Bond_Single = 'bond_single',
  Bond_Double = 'bond_double',
  Bond_Triple = 'bond_triple',
  Bond_Aromatic = 'bond_aromatic',
  Eraser = 'eraser',
}

// Canvas state
export interface CanvasState {
  offset: { x: number; y: number };
  zoom: number;
  activeTool: Tool;
  hoverAtomId: number | null;
  hoverBondId: number | null;
  selectedAtomIds: Set<number>;
  selectedBondIds: Set<number>;
}

// UI state
export interface UIState {
  theme: 'dark' | 'light';
  language: 'en' | 'ja';
  sidebarOpen: boolean;
  sidebarWidth: number;
  focusMode: boolean;
}

// Mechanism state
export interface MechanismArrow {
  id: string;
  sourceAtomId: number;
  sinkAtomId: number;
  type: 'forward' | 'retro' | 'resonance';
  stepId: string;
  label?: string;
}

export interface MechanismState {
  arrows: MechanismArrow[];
  selectedArrowId: string | null;
  arrowSelectionMode: 'idle' | 'awaitingSink';
  pendingSourceAtomId: number | null;
  pendingSinkAtomId: number | null;
  hoverArrowId: string | null;
}

export interface ReactionCondition {
  temperature?: string; // e.g., "25°C", "RT", "reflux"
  catalyst?: string;
  solvent?: string;
  time?: string; // e.g., "2h", "overnight"
  yield?: number; // 0-100
  notes?: string;
}

export interface MechanismStep {
  id: string;
  reactants: MoleculeDto[];
  products: MoleculeDto[];
  /** Non-participating molecules retained by the versioned reaction document. */
  agents?: MoleculeDto[];
  reactantComponentIds?: string[];
  productComponentIds?: string[];
  agentComponentIds?: string[];
  authored?: boolean;
  derivedFrom?: string;
  /** Positive integer stoichiometric coefficients aligned with molecule arrays. */
  reactantCoefficients?: number[];
  productCoefficients?: number[];
  arrows: MechanismArrow[];
  mechanismType: 'sn2' | 'sn1' | 'e1' | 'e2' | 'electrophilic_addition';
  // Set by the SMIRKS/manual reaction-step flow (ReactionPanel); absent on
  // steps created by the electron-pushing mechanism flow (MechanismPanel).
  conditions?: ReactionCondition;
  arrowType?: 'single' | 'double' | 'equilibrium' | 'retro';
}

// Electron detection types for mechanism arrow suggestions
export interface ElectronCandidate {
  atomId: number;
  element: string;
  type: 'source' | 'sink';
  confidence: number; // 0.0-1.0
  reason: string;     // "O⁻ (formal charge: -1)", "C⁺ (electrophilic)", etc.
}

export interface ArrowSuggestion {
  sourceAtomId: number;
  sinkAtomId: number;
  sourceConfidence: number;
  sinkConfidence: number;
  confidence: number; // product of source and sink confidence
  reason: string;     // "O → C"
}

// Reaction scheme context for managing reaction sequences
export interface ReactionSchemeContext {
  id: string;
  title: string;
  description?: string;
  steps: MechanismStep[];           // Array of reaction steps
  currentStepIndex: number;         // 0-based index of current step
  viewMode: 'step' | 'scheme';      // Single step or full scheme view
}

// Atom mapping for reaction tracking
export interface AtomMapEntry {
  originalId: number;           // ID in first step
  element: string;
  formalCharge: number;
  color: string;                // Assigned color for visualization
  stepMappings: Array<{
    stepIndex: number;
    atomIdInStep: number;
    retained: boolean;
  }>;
}

export interface AtomMapping {
  entries: Map<number, AtomMapEntry>;
  totalMappedAtoms: number;
}

/**
 * Structural facts about a drawn reaction scheme (step count, arrow count) — not
 * a mechanism classification. Distinguishing SN1/SN2/E1/E2/addition requires real
 * analysis (bonds broken/formed, nucleophile/electrophile character, leaving
 * groups); this app has no such analysis, so it doesn't claim one.
 */
export interface ReactionClassification {
  type: 'single_step' | 'multi_step' | 'unknown';
  indicators: string[];
}

export interface GreenChemistryMetrics {
  atomEconomy: number;
  eFactorApprox: number;
  stepWaste: Array<{
    stepIndex: number;
    wasteAtoms: number;
    percentage: number;
  }>;
}
