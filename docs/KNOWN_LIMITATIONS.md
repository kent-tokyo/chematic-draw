# Known Limitations — v0.9.3

This matrix records the boundaries users should consider before relying on a
release. A limitation is explicit here rather than silently approximated by
the editor.

| Area | v0.9.3 behavior | Risk / workaround |
|---|---|---|
| CDXML | Document parser/writer round-trips the supported multi-page subset: page IDs/dimensions, titles, text, arrows, fragment IDs, labels, charge/isotope, coordinates, and stereo hints | Advanced upstream presentation attributes remain outside the lossless subset |
| Query / SMARTS | Versioned query model, immutable Markush/polymer editing, allowed-substituent selection, deterministic two-attachment polymer expansion, linear SMARTS writer, and WASM worker matching | Arbitrary upstream QueryMolecule semantics remain outside the contract |
| R-groups / wildcard atoms | Preserved only where the selected format supports them | Review the [interop matrix](INTEROP.md) before round-tripping |
| Stereochemistry | Verified WASM CIP assigns unambiguous R/S/E/Z descriptors; ambiguous centers are omitted | Treat omitted assignments as unresolved; inspect wedge/dash input and review before publication |
| Reaction integrity | Element/isotope inventory, explicitly authored hydrogen count, formal-charge balance, atom-map consistency, and authored intermediate continuity are checked with atom/bond structure facts; unannotated steps remain not verified | This is not stoichiometric balancing, reaction-mechanism validation, or product prediction; omitted implicit chemistry and unmapped atoms still require independent review |
| RXN exchange | V0.9 supports V2000 import/export for one-step authored reactants/products and warns before wildcard/isotope loss | Agents, stoichiometric coefficients, multi-step schemes, and unsupported RXN extensions require the versioned JSON format |
| Session bundles | v1 is migrated to v2; unknown future versions are rejected | Keep the original file and upgrade through a release that supports its version |
| Local extensions | In-process registration only; third-party bundle loading is not enabled | Register trusted code in the host application; file/network adapter permissions are reserved |
| Release authenticity | SHA256 checksums are published; binaries remain unsigned | Verify the checksum and obtain releases from the official repository |
| External lookup | PubChem requires network access; ChemSpider is not implemented | Core editing remains offline-first |

## Compatibility policy

The v0.9 command and extension API is versioned as API major `1`. Additive fields and
new optional providers may be introduced within that API version. Existing
command semantics, permission names, and document validation rules are
compatible requirements. A breaking change increments the API major version
and must ship with a migration note and tests.

Session bundle schema `v2` is the current format. The application accepts
schema `v1` and migrates it in memory to the v2 document envelope. It does not
rewrite the source file automatically. Future schema versions are rejected
with an actionable error rather than guessed.
