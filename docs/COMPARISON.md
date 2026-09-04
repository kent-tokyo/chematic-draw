# Chemical structure editor comparison

This page helps choose a tool by workflow rather than by an unsupported
feature-score claim. chematic-draw is an open-source, offline-first desktop
chemical structure editor for Windows, macOS, and Linux.

## At a glance

| Need | chematic-draw fit | Important qualification |
|---|---|---|
| Offline desktop molecule editing | Strong | Electron is required; chemistry operations run in Rust/WASM |
| SMILES, MOL, SDF, and CML interchange | Supported and locally tested | See the exact round-trip matrix in [INTEROP](INTEROP.md) |
| SMARTS search and query editing | Supported bounded subset | Arbitrary upstream query semantics are rejected rather than guessed |
| 3D inspection | Supported | XYZ/PDB are coordinate imports; 3D generation and XYZ export are available |
| Reaction schemes | Supported bounded workflow | JSON v2 preserves richer reaction documents than RXN V2000 |
| ChemDraw-style document exchange | Supported CDXML subset | Advanced presentation attributes are not losslessly reproduced |
| Browser-native collaborative editing | Not the current product shape | The current application is a local Electron desktop app |
| Signed commercial distribution | Not guaranteed by the repository | Signing depends on release credentials and platform configuration |

## How to evaluate against another editor

Use the same molecule and the same target format for every tool. Compare:

1. atom and bond identity;
2. charge, isotope, hydrogen, and stereochemical annotations;
3. coordinates and page/presentation metadata;
4. reaction agents, coefficients, and step boundaries;
5. behavior when a field cannot be preserved.

chematic-draw's preferred behavior for unsupported chemistry is an explicit
loss warning or rejection. A successful file save is not treated as proof that
all source semantics survived.

## When chematic-draw is a good fit

- You need a local desktop editor with no chemistry service dependency.
- You move structures through SMILES, MOL, SDF, CML, or a supported CDXML
  subset.
- You want visible validation, deterministic layout/export checks, and
  reproducible WASM-backed chemistry operations.
- You need a documented boundary for SMARTS, Markush/R-group, polymer, and
  reaction-document handling.

## When to keep the source application in the loop

Keep the original application as the final authoring or review tool when your
document depends on presentation semantics outside the [CDXML support matrix](INTEROP.md),
or when a publisher requires a format or signing workflow that this project
does not provide.

## Frequently asked questions

### Is chematic-draw a free ChemDraw alternative?

It is an open-source alternative for the bounded workflows documented here,
but it is not a drop-in replacement. Check the interchange matrix before
migrating a production corpus.

### Can I use it as an offline SMILES editor?

Yes. Structure editing, parsing, validation, canonical SMILES, and SMARTS
matching use the local WASM bridge. PubChem lookup is separate and requires
network access.

### Will a CDXML file look exactly the same after round-trip?

Not necessarily. The supported subset preserves documented structure and page
metadata, while advanced presentation attributes remain outside the lossless
boundary.

### What should I use for a multi-step reaction?

Use reaction-document JSON v2. RXN V2000 export is deliberately blocked when it
would hide multi-step boundaries or other unsupported information.

## Related documentation

- [Migration guide](MIGRATION.md)
- [Format Interoperability](INTEROP.md)
- [Known Limitations](KNOWN_LIMITATIONS.md)
- [Release Readiness](RELEASE_READINESS.md)
- [Quick Start](QUICK_START.md)
