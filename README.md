# chematic-draw

[日本語](README_ja.md) · [简体中文](README_zh.md)

An open-source, offline-first chemical structure editor for Windows, macOS,
and Linux. The desktop application is built with Electron and React; chemistry
operations run in the Rust/WASM bridge at [`crates/chem-wasm`](crates/chem-wasm).

The project is experimental and is not yet a drop-in replacement for ChemDraw,
ChemDoodle, Ketcher, or ChemSketch.

## Features

- Canvas-based 2D molecule editor with mouse and keyboard interaction
- Molecule templates, inspector, undo/redo, autosave, and crash recovery
- Properties, Lipinski checks, stereoisomer enumeration, and SMARTS search
- 3D viewer with rotation, zoom, and XYZ export
- Authored reaction schemes and mechanism arrows with verification diagnostics
- Batch processing with per-item results, filtering, progress, cancellation,
  and failed-item retry
- SMILES, MOL V2000/V3000, SDF, and CML import/export; CDXML import only
- SVG, PNG, and PDF drawing export
- PubChem lookup by generated InChIKey (network access is required)
- English, Japanese, and Simplified Chinese UI, with dark mode

Try the browser-only [Chematic Draw Playground](electron/playground.html) to
edit a molecule, inspect its 2D structure, and export SMILES or SVG without
installing the desktop app.

Known limitations and the maintained documentation index are in
[`docs/README.md`](docs/README.md). Chemistry format details are in
[`docs/INTEROP.md`](docs/INTEROP.md).

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

## Contributing, security, and license

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).
The project is licensed under MIT; see [`electron/package.json`](electron/package.json).
