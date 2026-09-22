# chematic-draw

[日本語](README_ja.md) · [简体中文](README_zh.md)

[![CI](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml)
[![Docs](https://img.shields.io/badge/docs-documentation-2563eb)](docs/README.md)

An open-source, offline-first chemical structure editor for Windows, macOS,
and Linux. Draw molecules and reaction schemes with a mouse or keyboard,
check chemical properties locally, and export clean structure diagrams for
reports, teaching materials, and research notes. The desktop application is
built with Electron and React; chemistry operations run in the Rust/WASM bridge
at [`crates/chem-wasm`](crates/chem-wasm).

The project is experimental and is not yet a drop-in replacement for ChemDraw,
ChemDoodle, Ketcher, or ChemSketch.

## Who it is for

chematic-draw is for students, researchers, teachers, and developers who want
a simple chemical structure drawing app without an account or a mandatory
cloud service. It is useful for drawing a molecule for a lab report, preparing
a lecture slide, checking a SMILES string, sketching a reaction mechanism, or
converting a structure between common chemistry file formats.

For a quick browser trial, open the [Chematic Draw Playground](https://kent-tokyo.github.io/chematic-draw/playground/).
For local work, install the desktop app from the [release downloads](https://github.com/kent-tokyo/chematic-draw/releases)
or build it from source below.

## Features

- Canvas-based 2D molecule editor with mouse and keyboard interaction
- Molecule templates, inspector, undo/redo, autosave, and crash recovery
- Properties, Lipinski checks, stereoisomer enumeration, and SMARTS search
- ECFP4 fingerprints with metadata, Tanimoto/Dice similarity, and bounded MCS
- 3D viewer with rotation, zoom, and XYZ export
- Loss-aware NMR spectrum panel for validated experimental peak data
- Authored reaction schemes and mechanism arrows with verification diagnostics
- Multi-reactant SMIRKS execution for two to eight reactants
- Typed query documents for SMARTS constraints, Markush, polymer, and nucleic-acid metadata
- Batch processing with per-item results, filtering, progress, cancellation,
  and failed-item retry
- SMILES, MOL V2000/V3000, SDF, CML, and supported-subset CDXML import/export
- Loss-aware CDXML page/group preservation and rich-source patching when safe
- SVG, PNG, and PDF drawing export
- PubChem lookup by generated InChIKey (network access is required)
- English, Japanese, and Simplified Chinese UI, with dark mode

The main workflow is local-first: molecule editing, parsing, properties,
SMARTS matching, and most exports do not require an internet connection.
PubChem lookup is the exception and requires network access.

The repository also contains a private, Electron-free `@chematic/web` package
for validated read-only molecule embedding, a host-controlled molecule editor,
and a Worker protocol for rendering, serialization, summaries, and bounded
immutable edits.

Try the browser-only [Chematic Draw Playground](https://kent-tokyo.github.io/chematic-draw/playground/) to
edit a molecule, inspect its 2D structure, and export SMILES or SVG without
installing the desktop app.

## Common tasks

- **Draw a chemical structure:** use the canvas, templates, element tools, and
  keyboard shortcuts, then inspect formula, molecular weight, and Lipinski
  properties.
- **Prepare a reaction scheme:** add steps, conditions, stoichiometric
  coefficients, agents, component identities, and mechanism arrows. The app
  reports mapping, balance, and continuity diagnostics from authored data.
- **Export for documents:** use SVG, PNG, or PDF for figures, or SMILES, MOL,
  SDF, CML, and the supported CDXML subset for data exchange.
- **Work offline:** use the desktop editor and local Rust/WASM chemistry
  engine without uploading structures. See the [interoperability matrix](docs/INTEROP.md)
  before moving a production corpus.

Known limitations and the maintained documentation index are in
[`docs/README.md`](docs/README.md). Chemistry format details are in
[`docs/INTEROP.md`](docs/INTEROP.md).

The Electron-free public data contract and local `@chematic/web` embedding
package live in
[`packages/chematic-contract`](packages/chematic-contract/README.md); it is a
contract boundary. The web package is currently private and has not been
published to a registry.

If you are moving from another structure editor, see the
[`migration guide`](docs/MIGRATION.md) and the workflow-based
[`comparison`](docs/COMPARISON.md).

## Screenshot

![chematic-draw application](docs/images/chematic-draw-app.jpeg)

The screenshot shows the canvas, Inspector, validation status, and SMARTS
search in the desktop application.

## Getting started

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

See [`docs/BUILD.md`](docs/BUILD.md) for development and testing commands, or
[`docs/QUICK_START.md`](docs/QUICK_START.md) for installing a release.

## Chemistry engine

The app uses the [`chematic`](https://crates.io/crates/chematic) Rust
cheminformatics library through WebAssembly. The chemistry layer has no
C/C++ FFI; Electron and Chromium remain separate native dependencies.
The current release line is chematic-draw 1.0.11 and pins `chematic` v1.0.19.
The Rust/WASM bridge keeps its public API in `crates/chem-wasm/src/lib.rs` and
places molecule conversion, fingerprinting, and RXN/CDXML adapters in focused
modules. See [`CHANGELOG.md`](CHANGELOG.md) for the current validation results.

## Contributing, security, and license

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).
The project is licensed under MIT; see [`electron/package.json`](electron/package.json).
