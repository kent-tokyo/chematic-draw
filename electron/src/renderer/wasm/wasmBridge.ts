import * as wasmModule from './pkg';
import { MoleculeDto } from '../store/types';

let initialized = false;

export async function initWasm(): Promise<void> {
  if (initialized) return;
  // wasm-pack build outputs an init function; call it if available
  if (wasmModule.default) {
    await wasmModule.default();
  }
  initialized = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing and Format Conversion
// ─────────────────────────────────────────────────────────────────────────────

export function parseMolecule(text: string): MoleculeDto {
  const result = wasmModule.parse_any(text);
  if (!result) throw new Error('Failed to parse molecule');
  return result as MoleculeDto;
}

export function toSmiles(mol: MoleculeDto): string {
  return wasmModule.to_smiles(mol);
}

export function toCanonicalSmiles(mol: MoleculeDto): string {
  return wasmModule.to_canonical_smiles(mol);
}

export function toMolV2000(mol: MoleculeDto): string {
  return wasmModule.to_mol_v2000(mol);
}

export function toMolV3000(mol: MoleculeDto): string {
  return wasmModule.to_mol_v3000(mol);
}

export function toSdf(mol: MoleculeDto): string {
  return wasmModule.to_sdf(mol);
}

export function toCml(mol: MoleculeDto): string {
  return wasmModule.to_cml(mol);
}

export function toSvg(mol: MoleculeDto): string {
  return wasmModule.to_svg(mol);
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout and Structure Analysis
// ─────────────────────────────────────────────────────────────────────────────

export function cleanLayout(mol: MoleculeDto): MoleculeDto {
  return wasmModule.clean_layout(mol) as MoleculeDto;
}

export function getProperties(mol: MoleculeDto): Record<string, any> {
  return wasmModule.get_properties(mol);
}

export function getIupacName(mol: MoleculeDto): string {
  return wasmModule.iupac_name(mol);
}

export function smarts(mol: MoleculeDto, pattern: string): number[] {
  const uint32arr = wasmModule.smarts_search(mol, pattern);
  return Array.from(uint32arr);
}

// ─────────────────────────────────────────────────────────────────────────────
// New APIs (chematic 0.1.32+)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standardize molecule: neutralize charges, remove explicit H, apply canonical tautomer.
 */
export function standardizeMolecule(mol: MoleculeDto): MoleculeDto {
  return wasmModule.standardize_molecule(mol) as MoleculeDto;
}

/**
 * Generate SVG with SMILES metadata embedded (allows reverse-lookup of SMILES from SVG).
 */
export function toSvgWithMetadata(mol: MoleculeDto): string {
  return wasmModule.to_svg_with_metadata(mol);
}

/**
 * Detect bond crossings in 2D layout.
 * Returns count of crossing bonds. Lower is better for layout quality.
 */
export function detectLayoutCrossings(mol: MoleculeDto): number {
  return wasmModule.detect_layout_crossings(mol);
}

/**
 * Invert stereocenter (R ↔ S) at the specified atom.
 * @param mol molecule DTO
 * @param atomId the atom.id of the stereocenter to invert
 */
export function invertStereocenter(mol: MoleculeDto, atomId: number): MoleculeDto {
  return wasmModule.invert_stereocenter(mol, atomId) as MoleculeDto;
}

/**
 * Validate molecule for errors and warnings.
 */
export function validateMolecule(mol: MoleculeDto): { valid: boolean; errors: string[]; warnings: string[] } {
  return wasmModule.validate_molecule(mol);
}

// ─────────────────────────────────────────────────────────────────────────────
// New APIs (chematic 0.1.36+)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enumerate all stereoisomers of a molecule.
 */
export function enumerateStereoisomers(mol: MoleculeDto): MoleculeDto[] {
  const result = wasmModule.enumerate_stereoisomers(mol);
  return result as MoleculeDto[];
}

/**
 * Convert molecule to InChI string.
 * Uses chematic-inchi to generate standard IUPAC InChI format.
 */
export function molToInchi(mol: MoleculeDto): string {
  return wasmModule.mol_to_inchi(mol);
}

/**
 * Convert InChI string to InChIKey.
 * Uses chematic-inchi to generate standard IUPAC InChIKey format.
 */
export function inchiToInchikey(inchi: string): string {
  return wasmModule.inchi_to_inchikey(inchi);
}

/**
 * Get extended properties: sa_score, esol, fsp3, pains, stereocenters.
 */
export interface ExtendedPropertiesDto {
  sa_score: number;
  esol_solubility: number;
  fsp3: number;
  pains_violations: boolean;
  num_stereocenters: number;
  num_unspecified_stereocenters: number;
}

export function getExtendedProperties(mol: MoleculeDto): ExtendedPropertiesDto {
  return wasmModule.get_extended_properties(mol) as ExtendedPropertiesDto;
}

/**
 * Get ECFP4 fingerprint.
 */
export function getFingerprint(mol: MoleculeDto): string {
  return wasmModule.get_fingerprint(mol);
}

/**
 * Calculate Tanimoto similarity between two fingerprints.
 */
export function tanimotoSimilarity(fpA: string, fpB: string): number {
  return wasmModule.tanimoto_similarity(fpA, fpB);
}

/**
 * Identify functional groups in a molecule.
 */
export function identifyFunctionalGroups(mol: MoleculeDto): string[] {
  const result = wasmModule.identify_functional_groups_wasm(mol);
  return result as string[];
}
