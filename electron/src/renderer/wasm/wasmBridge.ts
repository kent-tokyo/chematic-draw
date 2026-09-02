import * as wasmModule from './pkg';
import { MoleculeDto, PropertiesDto } from '../store/types';
import type { ExtendedProperties, Fingerprint } from '../../../../packages/chematic-contract/src/index';
import type { McsResult } from '../../../../packages/chematic-contract/src/index';
export type { ExtendedProperties as ExtendedPropertiesDto, Fingerprint as FingerprintDto, McsResult } from '../../../../packages/chematic-contract/src/index';

/**
 * WASM module lifecycle. Every WASM-calling function in this file assumes
 * `ready` — nothing here checks readiness per call (see the app-level
 * startup boundary in renderer.tsx, which is what actually enforces this:
 * WASM-dependent UI isn't mounted until `getWasmStatus() === 'ready'`).
 * This state machine exists so that boundary — and callers of initWasm()
 * from more than one place — have one real, race-free source of truth
 * instead of the previous single `initialized` boolean, which (a) had no
 * failure state at all (a failed init left `initialized` false forever,
 * indistinguishable from "hasn't started yet"), and (b) had no protection
 * against concurrent callers: two calls to initWasm() before the first one
 * resolved would both see `initialized === false` and both call
 * `wasmModule.default()`.
 */
export type WasmStatus = 'idle' | 'loading' | 'ready' | 'failed';

let status: WasmStatus = 'idle';
let initPromise: Promise<void> | null = null;
let initError: Error | null = null;

export function getWasmStatus(): WasmStatus {
  return status;
}

export function getWasmInitializationError(): Error | null {
  return initError;
}

/**
 * Start WASM initialization if it hasn't started yet, and resolve once it's
 * ready — or reject with the real init error if it failed. Concurrent
 * callers (e.g. two components mounting at once) all share the same
 * in-flight promise rather than each re-triggering `wasmModule.default()`.
 * Calling this again after a failure retries initialization (status only
 * ever reaches 'ready' on genuine success — never silently after a failure).
 */
export function initWasm(): Promise<void> {
  if (status === 'ready') return Promise.resolve();
  if (status === 'loading' && initPromise) return initPromise;

  status = 'loading';
  initError = null;
  initPromise = (async () => {
    try {
      // wasm-pack build outputs an init function; call it if available
      if (wasmModule.default) {
        await wasmModule.default();
      }
      status = 'ready';
    } catch (err) {
      status = 'failed';
      initError = err instanceof Error ? err : new Error(String(err));
      initPromise = null;
      throw initError;
    }
  })();
  return initPromise;
}

/** Alias for initWasm() — same shared-promise behavior, named for call
 * sites that want to express "make sure WASM is usable" rather than "kick
 * off loading". */
export function ensureWasmReady(): Promise<void> {
  return initWasm();
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

export function getProperties(mol: MoleculeDto): PropertiesDto {
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

/** Assign verified CIP R/S/E/Z descriptors; ambiguous assignments are omitted. */
export interface StereoAssignmentDto {
  atom_id: number;
  code: 'R' | 'S' | 'E' | 'Z' | 'LowerR' | 'LowerS';
}

export function assignCip(mol: MoleculeDto): StereoAssignmentDto[] {
  return wasmModule.assign_cip(mol) as StereoAssignmentDto[];
}

/**
 * Convert molecule to an InChI-like string via chematic-inchi — a pure-Rust
 * approximation, not bit-exact with the real IUPAC reference implementation
 * (that needs a native feature unavailable in WASM). Don't expect this to match
 * InChIKeys from PubChem/RDKit/ChemSpider for the same molecule.
 */
export function molToInchi(mol: MoleculeDto): string {
  return wasmModule.mol_to_inchi(mol);
}

/**
 * Convert an InChI string to its InChIKey (real hashing, but inherits the
 * approximate InChI above — see molToInchi).
 */
export function inchiToInchikey(inchi: string): string {
  return wasmModule.inchi_to_inchikey(inchi);
}

/**
 * Get extended properties: sa_score, esol, fsp3, pains, stereocenters.
 */
export function getExtendedProperties(mol: MoleculeDto): ExtendedProperties {
  return wasmModule.get_extended_properties(mol) as ExtendedProperties;
}

/**
 * Get ECFP4 fingerprint as a 512-character hex string (the real 2048-bit vector).
 */
export function getFingerprint(mol: MoleculeDto): string {
  return wasmModule.get_fingerprint(mol);
}

/**
 * Fingerprint plus the real algorithm parameters that produced it, sourced from
 * chematic's own `EcfpConfig` (see chem-wasm's `FingerprintDto`) rather than
 * assumed from the "ECFP4" name.
 */
/**
 * Get the ECFP4 fingerprint together with its real algorithm parameters. Use this
 * over `getFingerprint` when the caller needs to know/display what was actually
 * computed (radius, bit length, bit-vs-count mode) rather than just a hex blob.
 */
export function getFingerprintWithMetadata(mol: MoleculeDto): Fingerprint {
  return wasmModule.get_fingerprint_with_metadata(mol) as Fingerprint;
}

/**
 * Calculate Tanimoto similarity between two ECFP4 fingerprints (hex strings from
 * `getFingerprint`). Throws if either string isn't a valid 512-char fingerprint hex.
 */
export function tanimotoSimilarity(fpA: string, fpB: string): number {
  return wasmModule.tanimoto_similarity(fpA, fpB);
}

/**
 * Calculate Dice similarity between two ECFP4 fingerprints (hex strings from
 * `getFingerprint`). Throws if either string isn't a valid 512-char fingerprint hex.
 */
export function diceSimilarity(fpA: string, fpB: string): number {
  return wasmModule.dice_similarity(fpA, fpB);
}

/**
 * Identify functional groups in a molecule.
 */
export function identifyFunctionalGroups(mol: MoleculeDto): string[] {
  const result = wasmModule.identify_functional_groups_wasm(mol);
  return result as string[];
}

/**
 * Result of executing a SMIRKS-based reaction. `no_match`, `invalid_reaction`,
 * and `unsupported_chemistry` are real, honestly-distinguished states from the
 * Rust side's `ReactionOutcome`/`TransformError` (see chem-wasm/src/lib.rs) —
 * not fabricated categories:
 * - `no_match`: the SMIRKS parsed fine but doesn't match this molecule.
 * - `invalid_reaction`: the SMIRKS string itself doesn't parse.
 * - `unsupported_chemistry`: the SMIRKS is valid but needs a different number
 *   of reactant molecules than chematic-draw supplies (it always passes one).
 * - `error`: an FFI-level failure before any chemistry was attempted (e.g.
 *   malformed input), not a chemistry-domain outcome.
 * Collapsing any of these into the same `[]` or into each other is exactly the
 * bug this type exists to prevent.
 */
export type ReactionRunResult =
  | { status: 'applied'; products: MoleculeDto[] }
  | { status: 'no_match' }
  | { status: 'invalid_reaction'; message: string }
  | { status: 'unsupported_chemistry'; message: string }
  | { status: 'error'; message: string };

/**
 * Execute SMIRKS-based reaction on a molecule.
 * @param mol reactant molecule
 * @param smirks SMIRKS pattern (e.g., "[C:1](=[O])[OH]>>[C:1](=[O])[NH2]")
 */
export function runReactants(mol: MoleculeDto, smirks: string): ReactionRunResult {
  try {
    return wasmModule.run_reactants(mol, smirks) as ReactionRunResult;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Reaction execution failed:', err);
    return { status: 'error', message };
  }
}

/**
 * Maximum Common Substructure (MCS)
 */

export type McsResultDto = McsResult;

export function findMcs(molA: MoleculeDto, molB: MoleculeDto): McsResultDto {
  return wasmModule.find_mcs(molA, molB) as McsResultDto;
}

/**
 * 3D Molecular Geometry (chematic 0.1.40+)
 */

export interface Atom3dDto {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Coords3dDto {
  atoms: Atom3dDto[];
}

/**
 * Generate initial 3D coordinates using distance geometry.
 */
export function generate3dCoords(mol: MoleculeDto): Coords3dDto {
  return wasmModule.generate_3d_coords(mol) as Coords3dDto;
}

/**
 * Optimize 3D coordinates using UFF force field.
 */
export function minimize3d(mol: MoleculeDto, coords: Coords3dDto): Coords3dDto {
  return wasmModule.minimize_3d_uff(mol, coords) as Coords3dDto;
}

/**
 * Parse XYZ format coordinates.
 */
export function parseXyz(text: string): Coords3dDto {
  return wasmModule.parse_xyz_format(text) as Coords3dDto;
}

/**
 * Parse PDB format file.
 */
export function parsePdb(text: string): Coords3dDto {
  return wasmModule.parse_pdb_text(text) as Coords3dDto;
}
