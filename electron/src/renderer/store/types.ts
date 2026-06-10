// DTO types matching chem-wasm output
export interface AtomDto {
  id: number;
  element: string;
  x: number;
  y: number;
  charge: number;
  atom_map: number;
}

export interface BondDto {
  id: number;
  from: number;
  to: number;
  order: number; // 1=Single, 2=Double, 3=Triple, 4=Aromatic
  stereo: number; // 0=None, 1=WedgeUp, 2=WedgeDown
}

export interface MoleculeDto {
  atoms: AtomDto[];
  bonds: BondDto[];
}

export interface PropertiesDto {
  formula: string;
  atom_count: number;
  bond_count: number;
  molecular_weight: number;
  logp: number;
  tpsa: number;
  hba: number;
  hbd: number;
  rotatable_bonds: number;
  lipinski_pass: boolean;
  valence_errors: string[];
}

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
