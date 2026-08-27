# API Reference

Complete reference for chematic-draw WASM bridge functions and TypeScript interfaces.

## Table of Contents

1. [Core Types](#core-types)
2. [Molecule Operations](#molecule-operations)
3. [3D Operations](#3d-operations)
4. [Fingerprint & Similarity](#fingerprint--similarity)
5. [Reaction Operations](#reaction-operations)
6. [Search & Analysis](#search--analysis)
7. [Error Handling](#error-handling)
8. [TypeScript Interfaces](#typescript-interfaces)

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
  element: string;           // "C", "N", "O", "H", etc.
  x: number;                 // 2D X coordinate
  y: number;                 // 2D Y coordinate
  charge: number;            // Formal charge (-2 to +2)
  atom_map?: number;         // For reaction mechanisms
  implicit_h?: number;       // Implicit hydrogen count
}

interface BondDto {
  id: number;
  from: number;              // Atom ID
  to: number;                // Atom ID
  order: number;             // 1=single, 2=double, 3=triple
  stereo?: number;           // 0=none, 1=up, 4=down, 6=either
}
```

**Example:**
```typescript
const benzene: MoleculeDto = {
  atoms: [
    { id: 0, element: "C", x: 0, y: 0, charge: 0 },
    { id: 1, element: "C", x: 1, y: 0, charge: 0 },
    // ... 6 total carbons
  ],
  bonds: [
    { id: 0, from: 0, to: 1, order: 2 },  // aromatic double
    // ... 5 more bonds
  ]
};
```

---

## Molecule Operations

### parseSmilesWasm(smiles: string): MoleculeDto

Parse SMILES string into molecule structure.

```typescript
const aspirin = wasmBridge.parseSmilesWasm("CC(=O)Oc1ccccc1C(=O)O");
console.log(aspirin.atoms.length);  // 13
console.log(aspirin.bonds.length);  // 13
```

**Throws:**
- Invalid SMILES syntax
- Unsupported elements

**Performance:**
- <10ms for typical molecules
- Scales O(n) with atom count

---

### validateMolecule(mol: MoleculeDto): ValidationResult

Check molecule *structural* validity: bonds referencing atom IDs that don't
exist (error), and atoms with no bonds when the molecule has more than one atom
(warning). **Does not check valence** — that's a separate check, only run as
part of `getProperties()`'s `valence_errors` field.

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];        // e.g. "bond references missing atom id"
  warnings: string[];      // e.g. "N disconnected atom(s)"
}

const result = wasmBridge.validateMolecule(mol);
if (!result.valid) {
  console.error(result.errors);
}
```

---

### canonicalizeSmiles(mol: MoleculeDto): string

Convert molecule to canonical SMILES representation.

```typescript
const smiles = wasmBridge.canonicalizeSmiles(mol);
// Returns: "CC(=O)Oc1ccccc1C(=O)O" (always same for same structure)
```

**Use cases:**
- Molecule deduplication
- Consistency checking
- Database lookup

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
- Circular radius = 4
- Hashing-based representation
- Reproducible per structure

**Performance:**
- <100ms for typical molecules
- Independent of fingerprint size

---

### tanimotoSimilarity(fp1: string, fp2: string): number

Calculate Tanimoto similarity between two fingerprints.

```typescript
const molA = wasmBridge.parseSmilesWasm("c1ccccc1");
const molB = wasmBridge.parseSmilesWasm("c1ccccc1C");  // toluene

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

### runReactants(smirks: string, reactants: MoleculeDto[]): MoleculeDto[][]

Execute reaction on substrates (SMIRKS pattern).

```typescript
const reactants = [
  wasmBridge.parseSmilesWasm("CCBr"),      // alkyl bromide
];

const products = wasmBridge.runReactants(
  "[#6:1][Br]>>[#6:1][OH]",               // SN2: Br → OH
  reactants
);

console.log(products);  // [ [ { alcohol } ] ]
```

**SMIRKS Format:**
```
[reactants]>>[products]
[C:1][Br:2]>>[C:1][O:2]  // Atom mapping required
```

**Returns:**
- Array of product sets (one array per input reactant)
- Empty array if no reaction matches

**Throws:**
- Invalid SMIRKS syntax
- Invalid molecule structure

---

### classifyReaction(reactants: MoleculeDto[], products: MoleculeDto[]): ReactionType

Predict reaction mechanism type.

```typescript
interface ReactionType {
  type: "SN1" | "SN2" | "E1" | "E2" | "Addition" | "Other";
  confidence: number;    // 0.0-1.0
  details: string;
}

const classification = wasmBridge.classifyReaction(reactants, products);
console.log(classification);
// { type: "SN2", confidence: 0.92, details: "Backside attack..." }
```

---

## Search & Analysis

### findMcs(molA: MoleculeDto, molB: MoleculeDto): McsResult

Find Maximum Common Substructure.

```typescript
interface McsResult {
  commonAtoms: number[];      // Atom indices in molecule A
  commonBonds: number[];      // Bond indices in molecule A
  similarity: number;         // 0.0-1.0
}

const mcsA = wasmBridge.parseSmilesWasm("c1ccccc1");      // benzene
const mcsB = wasmBridge.parseSmilesWasm("c1ccccc1C");     // toluene

const result = wasmBridge.findMcs(mcsA, mcsB);
console.log(result.commonAtoms);  // [0, 1, 2, 3, 4, 5] (6-atom benzene ring)
console.log(result.similarity);   // 0.857
```

**Performance:**
- 50-200ms for typical molecules
- Exponential for very large molecules (>100 atoms)

---

### calculateMolecularWeight(mol: MoleculeDto): number

Sum of atomic weights.

```typescript
const mw = wasmBridge.calculateMolecularWeight(mol);
console.log(mw);  // 180.157 for aspirin
```

---

### predictProperties(mol: MoleculeDto): PropertyPrediction

Predict molecular properties.

```typescript
interface PropertyPrediction {
  molWeight: number;
  logP: number;              // Lipophilicity
  hbd: number;               // Hydrogen bond donors
  hba: number;               // Hydrogen bond acceptors
  rotBonds: number;          // Rotatable bonds
  saScore: number;           // Synthetic accessibility (0-10)
  esolSolubility: number;    // LogS (ESOL model)
  painViolations: number;    // PAINS alert count
}

const props = wasmBridge.predictProperties(mol);
console.log(props.saScore);  // 3.2 (easy to synthesize)
```

---

## TypeScript Interfaces

### Full Bridge Type Definitions

```typescript
// wasmBridge.ts exports

// Core parsing
export function parseSmilesWasm(smiles: string): MoleculeDto;
export function canonicalizeSmiles(mol: MoleculeDto): string;
export function validateMolecule(mol: MoleculeDto): ValidationResult;

// 3D operations
export async function generate3dCoords(mol: MoleculeDto): Promise<Coords3dDto>;
export async function minimize3d(mol: MoleculeDto, coords: Coords3dDto): Promise<Coords3dDto>;
export async function parseXyz(text: string): Promise<Coords3dDto>;
export async function parsePdb(text: string): Promise<{ mol: MoleculeDto; coords: Coords3dDto }>;

// Fingerprints & similarity
export function getFingerprint(mol: MoleculeDto): string;
export function tanimotoSimilarity(fp1: string, fp2: string): number;
export function diceSimilarity(fp1: string, fp2: string): number;

// Reactions
export function runReactants(smirks: string, reactants: MoleculeDto[]): MoleculeDto[][];
export function classifyReaction(reactants: MoleculeDto[], products: MoleculeDto[]): ReactionType;

// Search & analysis
export function findMcs(molA: MoleculeDto, molB: MoleculeDto): McsResult;
export function calculateMolecularWeight(mol: MoleculeDto): number;
export function predictProperties(mol: MoleculeDto): PropertyPrediction;
```

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
  const mol = wasmBridge.parseSmilesWasm(userInput);
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

- **chematic**: 0.1.40+
- **wasm-bindgen**: Latest
- **Node.js**: 18+
- **Browsers**: Chrome/Edge 90+, Firefox 87+, Safari 14+

---

## See Also

- [Architecture](./ARCHITECTURE.md) — How WASM is integrated
- [Troubleshooting](./TROUBLESHOOTING.md) — Common issues
- [chematic docs](https://github.com/rapodaca/chematic) — Upstream library reference
