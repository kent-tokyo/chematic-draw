# chematic-draw

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
- English and Japanese UI, with dark mode

Known limitations and the maintained documentation index are in
[`docs/README.md`](docs/README.md). Chemistry format details are in
[`docs/INTEROP.md`](docs/INTEROP.md).

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
