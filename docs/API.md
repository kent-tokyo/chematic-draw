# API Reference

Complete reference for chematic-draw WASM bridge functions and TypeScript interfaces.

## Table of Contents

1. [Core Types](#core-types)
2. [Molecule Operations](#molecule-operations)
3. [Physicochemical Properties](#physicochemical-properties)
4. [3D Operations](#3d-operations)
5. [Fingerprint & Similarity](#fingerprint--similarity)
6. [Reaction Operations](#reaction-operations)
7. [Search & Analysis](#search--analysis)
8. [Error Handling](#error-handling)

---

## Core Types

### MoleculeDto

Represents a chemical molecule in JSON format.

```typescript
interface MoleculeDto {
  atoms: AtomDto[];
  bonds: BondDto[];
}

interface AtomDto {
  id: number;
  // Always a real periodic-table symbol ("C", "N", "Cl", ...) — never a
  // depiction label and never an R-group token. See `wildcard` before
  // trusting this for an R-group atom (chematic has no real element for
  // those; this will be a meaningless placeholder).
  element: string;
  x: number;                    // 2D X coordinate (screen space, Y-down)
  y: number;                    // 2D Y coordinate (screen space, Y-down)
  charge: number;                // Formal charge
  atom_map: number;              // Reaction atom mapping; 0 = unmapped
  hydrogen_count?: number;       // Explicit H count; undefined = infer from valence
  wildcard?: boolean;            // R-group/variable-attachment atom
  display_label?: string | null; // Cosmetic 2D label ("CH3", "" to suppress);
                                  // never chemistry input, undefined/null = fall back to `element`
  isotope?: number;              // Mass number (e.g. 13 for 13C); undefined = natural abundance.
                                  // Survives SMILES/CML round-trips; dropped by MOL V2000/SDF
                                  // (chematic-mol's writers, see docs/INTEROP.md).
}

interface BondDto {
  id: number;
  from: number;              // Atom ID
  to: number;                // Atom ID
  order: number;             // 1=single, 2=double, 3=triple, 4=aromatic
  stereo: number;            // 0=none, 1=wedge up, 2=wedge down
}
```

**Example:**
```typescript
const benzene: MoleculeDto = {
  atoms: [
    { id: 0, element: "C", x: 0, y: 0, charge: 0, atom_map: 0 },
    { id: 1, element: "C", x: 1, y: 0, charge: 0, atom_map: 0 },
    // ... 6 total carbons
  ],
  bonds: [
    { id: 0, from: 0, to: 1, order: 4, stereo: 0 },  // aromatic
    // ... 5 more bonds
  ]
};
```

---

## Molecule Operations

### parseMolecule(text: string): MoleculeDto

Parse a molecule from text, auto-detecting the format: CDXML, CML, SDF,
MOL V2000/V3000, or SMILES.

```typescript
const aspirin = wasmBridge.parseMolecule("CC(=O)Oc1ccccc1C(=O)O");
console.log(aspirin.atoms.length);  // 13
console.log(aspirin.bonds.length);  // 13
```

**Throws:**
- Invalid/unrecognized syntax
- Unsupported elements

**Performance:**
- <10ms for typical molecules
- Scales O(n) with atom count

---

### validateMolecule(mol: MoleculeDto): ValidationResult

Structural checks plus real chemistry, via chematic-core/chematic-perception:

- **Errors** (`valid` is `false` if any are present): bonds referencing atom
  IDs that don't exist; an unrecognized element symbol; real valence
  violations (`chematic::core::validate_valence` — e.g. a 5-bonded carbon).
- **Warnings** (don't affect `valid`): a disconnected structure (real
  connected-component count, not just "zero bonds total"); an antiaromatic
  ring (4n π electrons).

Deliberately **not** checked: unspecified-stereocenter detection.
chematic's `num_unspecified_stereocenters` identifies *candidate* positions
(sp3 carbons with 4 total connections) without checking whether those 4
substituents are actually distinct — the real definition of a stereocenter.
Confirmed empirically: ethanol (zero real stereocenters) reports 2. The
false-positive rate is severe enough on ordinary molecules that surfacing
it as a warning here would be noise, not signal.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];        // e.g. "atom 3 has valence 5 (allowed: [4])"
  warnings: string[];      // e.g. "Disconnected structure: 2 separate fragments"
}

const result = wasmBridge.validateMolecule(mol);
if (!result.valid) {
  console.error(result.errors);
}
```

---

### toCanonicalSmiles(mol: MoleculeDto): string

Convert molecule to canonical SMILES representation.

```typescript
const smiles = wasmBridge.toCanonicalSmiles(mol);
// Returns: "CC(=O)Oc1ccccc1C(=O)O" (always same for same structure)
```

**Use cases:**
- Molecule deduplication
- Consistency checking
- Database lookup

---

## Physicochemical Properties

Per ROADMAP v0.2.1's scientific capability audit: every calculated property
below lists the real algorithm and its source, sourced by reading
chematic-chem 0.20.1's own doc comments and implementation, not assumed from
the property name. "Domain" notes when a property is unreliable or undefined
outside typical drug-like organic molecules.

### getProperties(mol: MoleculeDto): PropertiesDto

Core physicochemical descriptors, computed synchronously and deterministically
(same input always produces the same output — no network, no randomness).

```typescript
interface PropertiesDto {
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
```

| Property | Algorithm / source | Unit | Limitations |
|---|---|---|---|
| `molecular_weight` | Sum of average atomic mass per heavy atom + 1.008 Da per implicit H. | Da (g/mol) | Average (not monoisotopic) mass. |
| `logp` | Crippen atom-contribution method (Wildman & Crippen 1999-style per-atom SMARTS-like classification, summed). | unitless (log₁₀ of the octanol/water partition ratio) | Atom-additive methods are known to be less accurate for large, unusual, or highly conjugated structures than they are for typical drug-like molecules. |
| `tpsa` | Topological Polar Surface Area (Ertl, Rohde & Selzer 2000), Ertl per-atom-type contributions for N/O/S/P. | Å² | **Differs from RDKit's default**: S and P contributions are included here (matches RDKit's `includeSandP=True`, not RDKit's own default of `False`) — a like-for-like comparison against external TPSA values needs the same flag. |
| `hba` | Rule-based heavy-atom count of N/O acceptor patterns (not the simpler Lipinski N+O count — see `lipinski_pass` below, which uses its own `hba_count_lipinski`). | count | Rule-based classification, not a physical measurement; edge cases (e.g. amide N, thio-acids) are handled by explicit pattern rules in chematic-chem, not a general electronic-structure calculation. |
| `hbd` | Count of heavy atoms (N or O) with ≥1 attached H. Counted per heavy atom, not per H. | count | — |
| `rotatable_bonds` | Standard rotatable-bond definition: non-ring single bonds between two non-terminal heavy atoms (excludes amide C–N bonds and similar restricted-rotation cases per chematic-chem's classifier). | count | — |
| `lipinski_pass` | Lipinski's Rule of Five: MW ≤ 500 Da AND HBD ≤ 5 AND HBA ≤ 10 (via a separate Lipinski-specific HBA count) AND Crippen LogP ≤ 5.0. | boolean | A screening heuristic from Lipinski et al. 1997, not a solubility/permeability measurement — passing or failing doesn't determine oral bioavailability by itself. |
| `valence_errors` | Structural valence check (`chematic::perception::validate_valence`): flags atoms whose bond count exceeds the allowed valence for their element. | list of strings | Only flags valence exceedance; does not check charge-adjusted valence exceptions beyond what chematic-core models, and is a separate, narrower check than full chemical validity. |

---

### getExtendedProperties(mol: MoleculeDto): ExtendedPropertiesDto

Additional descriptors used by the Property Prediction panel — despite the UI
label, these are deterministic structural/empirical calculations, not
statistical or ML predictions (no confidence interval exists to report).

```typescript
interface ExtendedPropertiesDto {
  sa_score: number;
  esol_solubility: number;
  fsp3: number;
  pains_violations: boolean;
  num_stereocenters: number;
  num_unspecified_stereocenters: number;
}
```

| Property | Algorithm / source | Unit | Limitations |
|---|---|---|---|
| `sa_score` | Synthetic Accessibility Score (Ertl & Schuffenhauer 2009-style fragment-contribution method). Fragment environments are hashed with the same FNV-1a scheme as ECFP fingerprints, so the fragment table is directly ECFP4-compatible. | 1 (trivially easy) – 10 (very hard) | A fragment-frequency heuristic estimating *how routine the fragments look*, not a real retrosynthetic feasibility analysis — see the project's Explicitly Deferred list re: not implementing a second synthesizability scorer. |
| `esol_solubility` | ESOL model (Delaney 2004): `logS = 0.16 − 0.63·cLogP − 0.0062·MW + 0.066·RotB − 0.74·AP`, where AP = aromatic proportion. | log(S), log mol/L | Linear regression fit to a specific training set of drug-like molecules (Delaney 2004); returns `0.0` for molecules with no heavy atoms rather than a real solubility value. |
| `fsp3` | Fraction sp3 carbons: non-aromatic carbons with no double/triple bond, divided by total carbon count. | unitless ratio, 0.0–1.0 | Returns `0.0` for molecules with no carbon atoms (not undefined/NaN). |
| `pains_violations` | PAINS (Pan-Assay Interference Compounds) substructure alert matching (Baell & Holloway 2010 pattern set), matched via VF2 subgraph isomorphism against explicit-hydrogen structures. | boolean (`true` = at least one alert fired) | **Conservative on ambiguity**: if a pattern match can't be conclusively resolved within the matcher's search budget, it's folded in as if matched — so this can report a false violation, but should not under-report a real one. |
| `num_stereocenters` | Count of atoms with 4 substituents whose CIP priorities are all distinct (specified + unspecified), matching RDKit's `CalcNumAtomStereoCenters` semantics. | count | Tetrahedral stereocenters only — doesn't count other stereogenic elements (axial chirality, etc.). |
| `num_unspecified_stereocenters` | Subset of the above: sp3 carbons with 4 substituents where no `@`/`@@` was specified in the input. | count | Same tetrahedral-only scope as `num_stereocenters`. |

---

## 3D Operations

### generate3dCoords(mol: MoleculeDto): Coords3dDto

Generate 3D coordinates from 2D structure using distance geometry.

```typescript
interface Atom3dDto {
  id: number;
  element: string;
  x: number;              // Angstroms
  y: number;
  z: number;
}

interface Coords3dDto {
  atoms: Atom3dDto[];
}

const mol3d = await wasmBridge.generate3dCoords(mol);
console.log(mol3d.atoms[0]);  // { id: 0, element: "C", x: 0.5, y: 1.2, z: -0.3 }
```

**Performance:**
- Small (<50 atoms): <500ms
- Medium (100-500 atoms): <2 seconds
- Large (>500 atoms): <5 seconds

**Returns:**
- Raw 3D coordinates (no optimization yet)

**Throws:**
- Invalid molecule structure
- Impossible geometry

---

### minimize3d(mol: MoleculeDto, coords: Coords3dDto): Coords3dDto

Optimize 3D coordinates via gradient descent on a UFF-derived energy function.

```typescript
const initialCoords = await wasmBridge.generate3dCoords(mol);
const optimized = await wasmBridge.minimize3d(mol, initialCoords);
// Returns: Lower-energy 3D structure
```

**Algorithm:**
- Van der Waals forces
- Bond stretch penalties
- Angle bend penalties

No dihedral torsion term is included in this code path (chematic-3d has a
separate MMFF94 implementation that does include torsion, not what's wired up
here).

**Performance:**
- 100-200 iterations
- ~2-5x time of generate3dCoords()

---

### parseXyz(text: string): Coords3dDto

Parse XYZ coordinate format.

```
6
Benzene
C  0.0000  1.4000  0.0000
C  1.2124  0.7000  0.0000
C  1.2124 -0.7000  0.0000
C  0.0000 -1.4000  0.0000
C -1.2124 -0.7000  0.0000
C -1.2124  0.7000  0.0000
```

```typescript
const coords = wasmBridge.parseXyz(xyzText);
console.log(coords.atoms.length);  // 6
```

**Format:**
- Line 1: Atom count
- Line 2: Comment
- Line 3+: Element X Y Z (space-separated)

---

### parsePdb(text: string): Coords3dDto

Parse a PDB file's ATOM/HETATM records into raw 3D coordinates.

```typescript
const coords = wasmBridge.parsePdb(pdbText);
// coords.atoms: { id, element, x, y, z }[]
```

**Supported:**
- ATOM/HETATM records
- Element detection from atomic symbols

**Not supported:** bond inference. This returns coordinates only — no
`MoleculeDto`, no connectivity. Building a bonded molecule from a PDB structure
would require inferring bonds from interatomic distances, which isn't
implemented; the raw atoms/coordinates are what's actually available today.

---

## Fingerprint & Similarity

### getFingerprint(mol: MoleculeDto): string

Generate ECFP4 extended connectivity fingerprint.

```typescript
const fp = wasmBridge.getFingerprint(mol);
// Returns hex string: "a1f3c2e5f7..." (2048-bit, 512 hex chars)
```

**Properties:**
- 2048-bit fingerprint
- Circular **radius = 2** (the "4" in "ECFP4" is the *diameter*, 2× radius —
  matching RDKit's ECFP4 naming convention; it is not the radius itself)
- Bit vector (presence/absence per position), not an occurrence count
- Hashing-based representation
- Reproducible per structure

**Performance:**
- <100ms for typical molecules
- Independent of fingerprint size

---

### getFingerprintWithMetadata(mol: MoleculeDto): FingerprintDto

Same fingerprint as `getFingerprint`, plus the real parameters that produced
it — for callers that need to know/display what was actually computed rather
than treat the hex string as opaque.

```typescript
interface FingerprintDto {
  hex: string;
  kind: string;        // "ECFP4"
  radius: number;       // 2
  bit_length: number;   // 2048
  mode: string;          // "bit" (not "count")
}

const result = wasmBridge.getFingerprintWithMetadata(mol);
console.log(result.radius, result.bit_length, result.mode); // 2 2048 "bit"
```

`radius`/`bit_length`/`mode` are read from chematic-fp's own `EcfpConfig`
default at call time, not hardcoded — if a future version of the app switches
to a different fingerprint config, this stays accurate automatically.

---

### tanimotoSimilarity(fp1: string, fp2: string): number

Calculate Tanimoto similarity between two fingerprints.

```typescript
const molA = wasmBridge.parseMolecule("c1ccccc1");
const molB = wasmBridge.parseMolecule("c1ccccc1C");  // toluene

const fpA = wasmBridge.getFingerprint(molA);
const fpB = wasmBridge.getFingerprint(molB);

const similarity = wasmBridge.tanimotoSimilarity(fpA, fpB);
console.log(similarity);  // 0.85 (0.0 to 1.0)
```

**Interpretation:**
- 1.0 = Identical fingerprints
- 0.8+ = Highly similar
- 0.5-0.8 = Moderately similar
- <0.5 = Dissimilar

---

### diceSimilarity(fp1: string, fp2: string): number

Calculate Dice coefficient similarity.

```typescript
const dice = wasmBridge.diceSimilarity(fpA, fpB);
// Typically 0.05-0.1 higher than Tanimoto
```

**Formula:**
```
Dice = 2 * |A ∩ B| / (|A| + |B|)
```

---

## Reaction Operations

### runReactants(mol: MoleculeDto, smirks: string): ReactionRunResult

Execute a SMIRKS-based reaction template against one reactant molecule.

```typescript
type ReactionRunResult =
  | { status: 'applied'; products: MoleculeDto[] }
  | { status: 'no_match' }
  | { status: 'invalid_reaction'; message: string }
  | { status: 'unsupported_chemistry'; message: string }
  | { status: 'error'; message: string };

const bromide = wasmBridge.parseMolecule("CCBr");
const result = wasmBridge.runReactants(bromide, "[#6:1][Br]>>[#6:1][OH]");
if (result.status === 'applied') {
  console.log(result.products);
}
```

`no_match`, `invalid_reaction` (the SMIRKS string doesn't parse), and
`unsupported_chemistry` (syntactically valid SMIRKS written for a different
number of reactants than the one this call always supplies) are real,
distinguishable outcomes sourced from chematic-rxn's own `TransformError`
enum — not fabricated categories. Only FFI-level failures (malformed input)
throw; every reaction-domain outcome above is a normal return value.

**SMIRKS Format:**
```
[reactants]>>[products]
[C:1][Br:2]>>[C:1][O:2]  // Atom mapping required
```

---

## Search & Analysis

### findMcs(molA: MoleculeDto, molB: MoleculeDto): McsResultDto

Find the Maximum Common Substructure between two molecules using
chematic-smarts's real branch-and-bound MCS algorithm (not an atom-count
proxy), bounded by a fixed search-time budget.

```typescript
interface McsResultDto {
  common_atoms: number[];
  common_bonds: number[];
  similarity: number;
  search_budget_ms: number;  // time budget applied; a hit budget means a
                              // possibly-partial (not necessarily maximum) result
}

const benzene = wasmBridge.parseMolecule("c1ccccc1");
const toluene = wasmBridge.parseMolecule("c1ccccc1C");
const result = wasmBridge.findMcs(benzene, toluene);
console.log(result.common_atoms, result.similarity);
```

**Performance:**
- Bounded by `search_budget_ms` (currently a fixed constant on the Rust side);
  large/highly symmetric molecule pairs may hit the budget and return a
  best-effort partial match rather than the true maximum.

---

Molecular weight, LogP, TPSA, and the other extended descriptors
(`sa_score`, `esol_solubility`, `fsp3`, `pains_violations`, stereocenter
counts) are documented in [Physicochemical Properties](#physicochemical-properties)
above — there is no separate `calculateMolecularWeight` or `predictProperties`
function on the WASM bridge itself. The Property Prediction UI panel is a thin
presentational wrapper around `getExtendedProperties` (see
`electron/src/renderer/lib/advancedFeatures.ts`), not a separate calculation.

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid SMILES` | Syntax error in SMILES | Validate SMILES before parsing |
| `Unsupported element` | Element not in ECFP dictionary | Use only C, N, O, S, P, etc. |
| `Invalid valence` | Atom has too many bonds | Check bond counts (C=4, N=3, O=2) |
| `Disconnected graph` | Molecules has separate components | Merge components or validate input |
| `No reaction matches` | SMIRKS doesn't match reactants | Verify SMIRKS pattern and molecule |

### Error Handling Pattern

```typescript
try {
  const mol = wasmBridge.parseMolecule(userInput);
  const coords = await wasmBridge.generate3dCoords(mol);
  // ... use coords
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Invalid molecule:", error.message);
  } else if (error instanceof PerformanceError) {
    console.warn("Slow operation:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

---

## Performance Targets

| Operation | Target | Typical |
|-----------|--------|---------|
| SMILES parsing | <10ms | 2-5ms |
| Fingerprint generation | <100ms | 10-50ms |
| Similarity calculation | <10ms | 1-5ms |
| 3D coordinate generation | <2s | 500ms-2s |
| 3D minimization | <5s | 2-4s |
| MCS search | <200ms | 50-150ms |
| Property prediction | <50ms | 10-30ms |

---

## Version Support

- **chematic**: 0.20.1 (`crates/chem-wasm/Cargo.toml` pins the exact version workspace-wide)
- **wasm-bindgen**: 0.2.x
- **Node.js**: 24+ (`electron/package.json`'s `engines.node`; matches CI)
- **Browsers**: whatever Chromium ships in the pinned Electron version (see `electron/package.json`'s `electron` devDependency) — this app runs inside Electron, not an arbitrary browser

---

## See Also

- [Architecture](./ARCHITECTURE.md) — How WASM is integrated
- [Troubleshooting](./TROUBLESHOOTING.md) — Common issues
- [chematic docs](https://github.com/rapodaca/chematic) — Upstream library reference
