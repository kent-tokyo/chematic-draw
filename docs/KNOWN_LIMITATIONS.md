# Known Limitations — v0.7.0

This matrix records the boundaries users should consider before relying on a
release. A limitation is explicit here rather than silently approximated by
the editor.

| Area | v0.7.0 behavior | Risk / workaround |
|---|---|---|
| CDXML | Import only; CDXML is not written | Save as MOL, SDF, CML, or SMILES after checking the export-loss message |
| R-groups / wildcard atoms | Preserved only where the selected format supports them | Review the [interop matrix](INTEROP.md) before round-tripping |
| Stereochemistry | Wedge/dash data is preserved; complete CIP/R/S assignment is not claimed | Treat stereoisomer output as a review aid, not authoritative CIP data |
| Session bundles | v1 is migrated to v2; unknown future versions are rejected | Keep the original file and upgrade through a release that supports its version |
| Local extensions | In-process registration only; third-party bundle loading is not enabled | Register trusted code in the host application; file/network adapter permissions are reserved |
| Release authenticity | SHA256 checksums are published; binaries remain unsigned | Verify the checksum and obtain releases from the official repository |
| External lookup | PubChem requires network access; ChemSpider is not implemented | Core editing remains offline-first |

## Compatibility policy

The v0.7 command and extension API is versioned as API major `1`. Additive fields and
new optional providers may be introduced within that API version. Existing
command semantics, permission names, and document validation rules are
compatible requirements. A breaking change increments the API major version
and must ship with a migration note and tests.

Session bundle schema `v2` is the current format. The application accepts
schema `v1` and migrates it in memory to the v2 document envelope. It does not
rewrite the source file automatically. Future schema versions are rejected
with an actionable error rather than guessed.
