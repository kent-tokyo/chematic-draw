# API reference

The exact public Rust/WASM surface is [`wasmBridge.ts`](../electron/src/renderer/wasm/wasmBridge.ts)
and `crates/chem-wasm/src/lib.rs`. This page identifies stable document shapes
and groups operations without duplicating every implementation comment.

## Molecule contract

```ts
interface MoleculeDto {
  atoms: Array<{
    id: number; element: string; x: number; y: number; charge: number;
    atom_map: number; isotope?: number; hydrogen_count?: number;
    wildcard?: boolean; display_label?: string | null;
  }>;
  bonds: Array<{ id: number; from: number; to: number; order: 1 | 2 | 3 | 4; stereo: number }>;
}
```

Atom and bond IDs must be unique; bond endpoints must exist. Coordinates are
2D renderer coordinates. Selection flags are UI state, not chemistry input.
Validate untrusted data before using it; the Electron-free shared equivalents
live in [`@chematic/contract`](../packages/chematic-contract/README.md).

## WASM operation groups

| Group | Representative operations | Notes |
|---|---|---|
| parsing/writing | `parseMolecule`, `parseAny`, `toSmiles`, `toMol`, `toSvg` | Format support and loss behavior are in [Interop](INTEROP.md). |
| validation/properties | `validateMolecule`, `getProperties`, extended properties | Results describe the input, not experimental truth. |
| identifiers/search | canonical SMILES, InChI helpers, fingerprint, Tanimoto/Dice, MCS | MCS is bounded; generated InChIKey lookup can differ from a provider's record. |
| stereo | CIP assignment and stereoisomer enumeration | Ambiguous/underspecified data is omitted or bounded, never guessed. |
| reaction | SMIRKS execution, reaction document/RXN adapters | Structural diagnostics do not prove chemistry or predict products. |
| 3D | coordinate generation, minimization, XYZ/PDB parsing | A viewer/export workflow, not a persistent conformer model. |

Errors cross the WASM boundary as ordinary JavaScript errors. Catch them at UI
or host boundaries and preserve the last valid document instead of converting a
failure into an empty result.

## Versioned documents

- **Session bundle v2:** stores one molecule, source metadata, and structure
  provenance. v1 is migrated in memory; unknown future versions are rejected.
- **Reaction document JSON v2:** preserves authored steps, agents,
  coefficients, IDs, maps, conditions, and provenance. Use this rather than
  RXN V2000 for rich schemes.
- **Query and NMR documents:** use the types and validators in
  `packages/chematic-contract/src/index.ts`.

## Host APIs

Desktop-only operations are exposed through the narrow typed
[`electronApi.ts`](../electron/src/renderer/electronApi.ts) contract. Browser
builds must tolerate its absence. The `@chematic/web` viewer/editor/worker
package offers a separate dependency-free embedding surface; it does not parse
chemistry, access files, or perform network requests.

For examples, use focused tests under `electron/src/__tests__/` rather than
copying a stale API table.
