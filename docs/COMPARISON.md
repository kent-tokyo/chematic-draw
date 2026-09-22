# Chemical structure editor comparison

This page helps choose a tool by workflow rather than by an unsupported
feature-score claim. chematic-draw is an open-source, offline-first desktop
chemical structure editor for Windows, macOS, and Linux.

## Baseline scorecard (2026-09-12)

The scores below make the competitive target measurable. `chematic-draw` is
scored from the current implementation and automated gates. Competitor scores
are conservative workflow-fit estimates from publicly documented capabilities,
not laboratory usability measurements; ChemDraw's current product family and
feature tiers are documented by [Revvity Signals](https://revvitysignals.com/products/research/chemdraw).
The target is to move every chematic-draw score above the corresponding
competitor score, but this baseline does not claim that target is already met.

| Axis (100 points) | chematic-draw | ChemDraw | Ketcher | ChemDoodle | Evidence / next gap |
|---|---:|---:|---:|---:|---|
| UI workflow and interaction | 95 | 94 | 86 | 88 | Grouped panel search, Cmd/Ctrl+K keyboard discovery, visible disabled-aware Undo/Redo and selection arrangement controls, guided reaction stages, cursor-anchored zoom, Fit view, Shift-marquee multi-selection, group movement, duplication, alignment, rotation, keyboard nudge, imported atom-ID-0 bond creation, step-box structure previews, and 100 renderer E2E scenarios pass; richer transforms and measured usability review remain open |
| Chemistry functionality | 93 | 98 | 86 | 91 | Rust/WASM properties, verified R/S and E/Z stereochemistry with executable inversion paths, single- and bounded multi-reactant SMIRKS execution, editable atom-map numbers, actionable SMARTS matches, structured query atom/bond constraints including aromaticity, valence, ring membership, query undo/redo, and query JSON file round-trip, NMR, 3D, bounded polymer expansion, validated single- and multi-attachment Markush selection plus semantic WASM expansion with source mapping and undoable concrete-molecule application, nucleic-acid metadata editing, and rational bounded stoichiometric coefficient suggestions up to 16 authored components are real; full biomolecule semantics and prediction remain partial |
| Interoperability | 90 | 96 | 91 | 88 | CDXML entity, numeric, complete atomic-number mapping, page, multi-fragment, connected fragment-aware insertion/removal, styled text with font/layout attributes, path-like graphic child content, basic graphic children, child order, transform matrices, reaction atom-map numbers, atomic multi-step reaction-document import, and explicit rejection of unknown elements are regression-tested; full presentation parity remains open |
| Publication output | 90 | 96 | 78 | 94 | Reaction SVG and PDF include deterministic connectivity, escaped labels, stereobonds, isotopes, charges, coefficients, conditions, explicit Auto/A4/Letter page sizing with centered scaling, authored single/double/equilibrium/retro step-arrow rendering, deterministic compact/standard/large typography, and a publication preflight that rejects clipped/overlapping geometry; font embedding/DPI review remains open |
| Accessibility and clarity | 89 | 88 | 82 | 80 | Keyboard/accessibility E2E, localized drawing-tool and stereochemistry-panel names/tooltips, explicit failure messages, and an accessible step-by-step description for the full reaction canvas pass; human screen-reader review remains open |
| Offline privacy and reproducibility | 96 | 68 | 64 | 72 | Local WASM, provenance and deterministic exports are verified; clean-machine release evidence remains open |
| Embedding and automation | 87 | 86 | 94 | 76 | HTML/React/Worker contracts plus opt-in editable component, validated single and atomic bounded batch Worker and Web Component edits, one-event/one-history host transactions, dependency-free molecule summaries, validation/export methods, bounded history, lifecycle tests, and bubbling/composed events; richer chemistry APIs remain open |

These scores are a prioritization instrument, not a claim of universal
superiority. A score may be raised only when the corresponding behavior,
fixture, and user-facing explanation are all verified.

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
