export type { CanvasState, MechanismState, UIState } from '../../../../packages/chematic-contract/src/index';

// Chemistry DTOs are owned by the Electron-free contract package. UI-only
// selection remains optional so the renderer can keep its existing state shape.
export type { MoleculeAtom as AtomDto, MoleculeBond as BondDto, Molecule as MoleculeDto } from '../../../../packages/chematic-contract/src/index';
export type { Properties as PropertiesDto } from '../../../../packages/chematic-contract/src/index';
export type { MechanismArrow, ReactionCondition, MechanismStep, ReactionScheme as ReactionSchemeContext } from '../../../../packages/chematic-contract/src/index';
export type { AtomMapEntry, AtomMapping, ReactionClassification, GreenChemistryMetrics } from '../../../../packages/chematic-contract/src/index';
export type { ElectronCandidate, ArrowSuggestion } from '../../../../packages/chematic-contract/src/index';

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
