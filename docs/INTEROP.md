# Format Interoperability

What chematic-draw can actually read and write today, verified against the
real WASM bridge (`crates/chem-wasm/src/lib.rs`) rather than assumed from
format names. "Round-trip" below means: parse format X, then write format X
again, and get back an equivalent molecule — not necessarily byte-identical
text (coordinates, atom ordering, and formatting are not guaranteed to
survive unchanged; the *chemical structure* is).

| Format | Read | Write | Round-trip verified | Notes |
|---|---|---|---|---|
| SMILES | ✅ | ✅ (`toSmiles`, `toCanonicalSmiles`) | ✅ | Canonical form is stable and deterministic. |
| MOL V2000 | ✅ | ✅ | ✅ | |
| MOL V3000 | ✅ | ✅ | ✅ | Needed for >999 atoms/bonds (V2000's fixed-width count fields overflow). |
| SDF | ✅ | ✅ | ✅ | Multi-record files: only the first record is read by `parseMolecule`/`parseAny`. |
| CML | ✅ | ✅ | ✅ | |
| CDXML | ✅ (read only) | ❌ | N/A | `chematic-mol` has no CDXML writer at all — this is a real gap, not an oversight in the WASM bridge. A ChemDraw-format round-trip (open a `.cdxml`, edit, save back to `.cdxml`) is not possible; editing a CDXML file forces a save to a different format. |
| RXN (reaction file) | ❌ | ❌ | N/A | **Not exposed via WASM, but the underlying support exists**: `chematic_mol::rxn::{parse_rxn_file, write_rxn_file}` are real, implemented functions in the `chematic-mol` crate this project already depends on — chem-wasm simply never calls them. Wiring these up is new WASM-API + DTO + UI surface (a `ReactionDocumentDto` distinct from `MoleculeDto`, since a reaction has reactants/products/agents), not a one-line fix. Tracked as a concrete, scoped future item. |
| InChI | ❌ | ✅ (`molToInchi`, one-way) | N/A | InChI is intentionally one-directional here: `molToInchi` produces an InChI string from a molecule, and `inchiToInchiKey` hashes an InChI string to its InChIKey — there is no `inchiToMol`. This matches upstream chemistry-informatics convention (InChI is an identifier/hash format, not meant to be a lossless structure-interchange format), so this is not treated as a gap to close, just a direction that doesn't exist. |
| XYZ | ✅ (`parseXyz`, coordinates only) | ❌ | N/A | Import only, for 3D viewer input. No bond/connectivity information in the format itself. |
| PDB | ✅ (`parsePdb`, coordinates only) | ❌ | N/A | Same as XYZ — coordinate import only. |
| JSON session bundle | ✅ (chematic bundle) | ✅ | ✅ | Local review bundle containing the molecule, source path, engine metadata, and deterministic structure fingerprint. It is not a general-purpose chemical interchange format. |
| JSON reaction document | ✅ (version 1) | ✅ (version 1) | ✅ | Versioned reaction-scheme envelope with safe migration from the legacy unversioned export. Unknown future schemas are rejected. |
| SVG | ❌ | ✅ (`to_svg`) | N/A | Export-only, as expected — SVG is a rendering target, not a chemical interchange format. |

The local next-version implementation now supports RXN V2000 import/export for
one-step authored reactant/product schemes through the existing MOL conversion
boundary. The older RXN row above describes the released 0.9.0 baseline; agents,
stoichiometric coefficients, multi-step schemes, and unsupported extensions are
not represented and are not guessed. Wildcard and isotope loss is checked before
RXN export and requires explicit confirmation.

## Known lossy conversions (automatically confirmed before save/export)

The renderer checks the target format before molecule saves and explicit MOL /
SMILES exports. If a known loss is detected, it explains the affected fields
and asks the user to continue. Known cases where a round-trip through this
app's own supported formats is *not* lossless are:

- **CDXML → (any writable format) → re-save as CDXML**: impossible outright
  (no CDXML writer), so this isn't silent data loss so much as a forced
  format change — worth surfacing in the UI when a `.cdxml` file is open,
  so a "Save" that can't write back to the original format isn't a surprise.
- **3D coordinates through a 2D-only format** (MOL V2000/V3000, SDF, and CML
  all *can* carry a Z coordinate; SMILES and CDXML cannot): converting a
  molecule with `generate3dCoords` output to SMILES, then back, drops the
  3D conformer entirely — only 2D layout coordinates are ever written to
  SMILES (SMILES has no coordinate concept at all).
- **R-group/wildcard atoms** (`wildcard: true` in `AtomDto`): a `[*]`
  wildcard round-trips correctly through SMILES (verified in
  `parseAnyContract.test.ts`), but **silently degrades to a plain carbon
  atom** when written to and re-parsed from MOL V2000, MOL V3000, SDF, or
  CML — confirmed empirically (`parse_any('[*]CC')` → write → re-parse:
  `wildcard` is `false` and `element` is `"C"` on all four, with no error
  or warning). CDXML wildcard round-tripping is untested (no writer exists
  to test the full cycle either way).
- **Depiction labels** (`display_label` in `AtomDto`, e.g. condensed "CH3"
  notation) are cosmetic and derived fresh on every `chem_to_dto` call —
  they are never written to or read from any file format, so there is
  nothing to lose here by definition, but a user might reasonably (and
  incorrectly) expect a saved file to "remember" how a structure was
  condensed for display.
- **Isotope labels** (`isotope: number` in `AtomDto`, e.g. `13` for ¹³C): a
  `[13CH4]`-style isotope round-trips correctly through canonical SMILES and
  CML (verified in `parseAnyContract.test.ts`), but **silently drops to
  natural abundance** (`isotope` comes back `undefined`) when written to and
  re-parsed from MOL V2000 or SDF — confirmed empirically. This is
  chematic-mol's own V2000/SDF writer not encoding the mass-difference
  field, not something this bridge's `chem_to_dto`/`dto_to_chem` can fix.
  Pinned as skipped regression tests in `wasmContract.test.ts`.

CDXML remains a hard stop rather than a confirmation: the format is read-only
and the user must choose another extension. 3D-coordinate loss is not inferred
from `MoleculeDto`, because the current document model does not retain a 3D
conformer after the viewer operation; this remains an explicit future model
item rather than an invented warning.

## See Also

- [API Reference](./API.md) — full WASM function signatures
- `electron/src/__tests__/parseAnyContract.test.ts` — round-trip regression
  tests backing the "Round-trip verified" column above
