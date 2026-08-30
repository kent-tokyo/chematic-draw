# chematic-draw

An open-source, offline-first chemical structure editor built with Electron, React, and a Rust/WASM chemistry engine.
Experimental — not yet a drop-in replacement for ChemDraw, ChemDoodle, Ketcher, or ChemSketch, but built toward chemical correctness and interoperability first.

> The project previously had a native Rust/egui desktop build (`crates/chem-ui`, `crates/chem-io`). That build has been removed — all active development is the Electron app in [`electron/`](electron/).

---

## Features

- **2D structure editor** — canvas-based drawing, fully keyboard-editable (Tab in, arrow keys move a roving atom focus, Shift+C/N/O/S/P adds a bonded atom, Enter starts a bond)
- **3D molecular viewer** — rotation, zoom, XYZ export
- **Reaction mechanisms** — step-by-step visualization with electron-flow arrows and atom mapping
- **Property prediction** — molecular weight, formula, logP, TPSA, Lipinski's Rule of Five
- **Stereoisomer enumeration** — heuristic candidate generation, not a full CIP implementation
- **SMARTS substructure search**
- **File formats** — MOL V2000, SMILES (canonical + reaction), SDF, CML read/write; CDXML read only. Export to SVG/PNG/PDF; SMILES/MOL clipboard paste (Ctrl+V)
- **IUPAC naming** — offline, local algorithm; PubChem lookup available for name-to-structure import (requires internet, that feature only)
- **Batch processing**, **autosave / crash recovery**, **undo/redo**
- Dark mode, English/Japanese UI

Full details (exact version pins, what's partial vs. complete, known limitations) live in [docs/README.md](docs/README.md) — that file is the maintained source of truth; this one is a quick overview.

---

## Getting started

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

Pre-built installers and download-verification steps: [Quick Start](docs/QUICK_START.md).
Full development setup: [Build Guide](docs/BUILD.md).

---

## Chemistry engine

Chemistry (parsing, 2D layout, properties, fingerprints, reactions, SMARTS) is handled by the [`chematic`](https://crates.io/crates/chematic) crate — a pure-Rust cheminformatics library with no C/C++ FFI in the chemistry layer itself. It's compiled to WASM (`crates/chem-wasm`) and loaded directly by the Electron renderer; the surrounding Electron/Chromium shell has its own, separate native dependencies.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, code style, and PR process.

## Security

See [SECURITY.md](SECURITY.md) for supported versions and how to report a vulnerability.

## License

MIT — see `electron/package.json`.
