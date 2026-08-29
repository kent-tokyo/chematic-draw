# chematic-draw Documentation

Complete documentation for the chematic-draw Electron application with integrated chemistry tools.

## Table of Contents

1. **[Quick Start](./QUICK_START.md)** — Get up and running in 5 minutes
2. **[Build Guide](./BUILD.md)** — Development setup and build instructions
3. **[API Reference](./API.md)** — WASM bridge functions and TypeScript interfaces
4. **[User Tutorial](./TUTORIAL.md)** — Feature walkthroughs and workflows
5. **[Architecture](./ARCHITECTURE.md)** — System design and component structure
6. **[Troubleshooting](./TROUBLESHOOTING.md)** — Common issues and solutions

## Quick Links

- **Molecule Drawing** → [Basics](./TUTORIAL.md#drawing-molecules)
- **3D Viewer** → [3D Visualization](./TUTORIAL.md#3d-molecular-viewer)
- **Reactions** → [Reaction Mechanism](./TUTORIAL.md#reaction-mechanisms)
- **Properties** → [Property Prediction](./TUTORIAL.md#property-prediction)
- **Stereo** → [Stereochemistry](./TUTORIAL.md#stereochemistry)
- **Search** → [Database & MCS Search](./TUTORIAL.md#search-functionality)

## Features Overview

### Core Functionality
- **Molecule Drawing**: Canvas-based 2D structure editor with keyboard shortcuts.
  The canvas is fully keyboard-editable too — Tab into it, arrow keys move a
  roving atom focus, Shift+C/N/O/S/P adds a bonded atom, Enter starts a
  bond-creation flow — and exposes a generated text description for screen
  readers (full mouse-parity editing beyond this is still future work)
- **3D Visualization**: WebGL-free 3D molecular viewer with rotation, zoom, export
- **Reaction Mechanisms**: Step-by-step visualization with atom mapping and electron flow
- **Property Prediction**: Molecular descriptors, solubility, drug-likeness scores

### Advanced Features
- **Stereochemistry**: Enumeration of candidate stereoisomers (heuristic
  detection, not a full CIP check — see [Tutorial](./TUTORIAL.md#stereochemistry))
- **Database Search**: Exact-match lookup against PubChem by InChIKey (not
  similarity search). ChemSpider is selectable in the UI but unimplemented —
  `searchDatabase(mol, 'chemspider')` always throws `'ChemSpider search not
  yet implemented'`. MCS (maximum common substructure) exists in the WASM
  layer but has no UI yet.
- **Batch Operations**: Process multiple molecules with configurable parameters
- **File Export**: SVG/PNG/PDF/MOL V2000/SMILES (File → Export); XYZ
  separately from the 3D Viewer tab; CSV/JSON only for reaction schemes
  (Reactions tab). PDF renders the same clean SVG output PNG uses, on a
  page sized to the drawing rather than a fixed Letter/A4 page.
- **Autosave / Crash Recovery**: the current molecule is snapshotted to a
  local file periodically; if the app didn't exit cleanly last time, the
  next launch asks (via a confirm dialog) whether to restore it. This is
  not the same as unsaved-changes tracking — there is none — so treat it
  as "restore what was open last time," not "recover my unsaved edits."

### Performance
- Lazy-loaded panels for responsive UI
- WASM-backed chemistry operations, with a real benchmark suite
  (`npm run test:perf`) against a fixed molecule corpus

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Desktop** | Electron | 44.x |
| **UI Framework** | React | 19.x |
| **State Management** | Zustand | 5.x |
| **Chemistry Engine** | chematic | 0.20.1 |
| **Canvas** | Canvas 2D API | Native |
| **WASM** | wasm-bindgen (via wasm-pack) | — |
| **Build** | Vite + Electron Forge | — |
| **Testing** | Jest + Playwright | — |

(Check `electron/package.json` / `Cargo.toml` for exact current versions —
this table reflects a point in time.)

## Getting Started

### For Users
Pre-release installers (`.deb`/`.rpm` for Linux, `.zip` for macOS, a
Squirrel installer for Windows — see `electron/forge.config.js`) are
published on the [Releases page](https://github.com/kent-tokyo/chematic-draw/releases)
for tagged versions; there's no stable release yet, and builds are
unsigned. See [Quick Start](./QUICK_START.md#installation) for download +
checksum-verification steps, or build from source below.

### For Developers
```bash
git clone https://github.com/kent-tokyo/chematic-draw
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

See [Quick Start](./QUICK_START.md) or [Build Guide](./BUILD.md) for
detailed instructions.

## Version Info

- **chematic**: 0.20.1
- **chematic-draw**: 0.2.2-rc.1
- **Node.js**: 24+
- **Rust**: 1.70+ (for building WASM)

(These drift over time — `electron/package.json`/`Cargo.toml` are the
source of truth, not this file.)

## Support

- 📖 **Documentation**: See this directory
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: support@example.com

## License

MIT License - See LICENSE file in root directory
