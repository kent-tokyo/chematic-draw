# chematic-draw

An open-source chemical structure editor written in **Pure Rust**.  
An experimental, offline-first chemical drawing environment — not yet a drop-in replacement for ChemDraw, ChemDoodle, Ketcher, or ChemSketch, but built toward chemical correctness and interoperability first.

> **Note:** this document describes the native Rust/egui desktop app (`crates/chem-ui`, `crates/chem-io`), which is now frozen. Active development has moved to the Electron + React + WASM app in [`electron/`](electron/) — see [`docs/README.md`](docs/README.md) for its current, verified feature set and build instructions.

---

## Feature comparison

Legend: `Yes` = Full support · `Partial` = Limited / partial · `No` = Not supported · `(online)` = Requires internet · `(commercial)` = Paid

### Licensing and platform

| | chematic-draw | ChemDraw | ChemDoodle | Ketcher | FreeChemDraw | ChemSketch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **License** | MIT / Apache 2.0 | Commercial | Free + paid desktop | Apache 2.0 | Proprietary free | Discontinued (Jan 2026) |
| **Open source** | Yes | No | No | Yes | No | No |
| **Cost** | Free | Subscription only | $29/mo · $199/yr · $999 one-time | Free | Free | N/A (new users) |
| **Windows** | Yes | Yes | Yes | Web only | Web only | Yes |
| **macOS** | Yes | Yes | Yes | Web only | Web only | No |
| **Linux** | Yes | No | Web only | Web only | Web only | No |
| **Native desktop app** | Yes | Yes | Yes | No | No | Yes |
| **No C/C++ dependencies** | Yes | No | No | No | No | No |
| **Embeddable in web apps** | No | No | Yes | Yes | No | No |
| **Programmable API** | Partial | Yes | Yes | Yes | No | No |
| **WASM / browser build** | No | No | Yes | Yes | No | No |
| **Command-line / batch** | No | Partial | No | Partial | No | No |

> ChemDraw discontinued perpetual licenses in January 2025 and is now subscription-only. ACD/Labs (maker of ChemSketch) was acquired by Revvity — ChemDraw's parent company — in January 2026; ChemSketch is no longer offered to new users, though existing installations continue under prior license terms. FreeChemDraw is a browser-only web app unaffiliated with PerkinElmer/Revvity's ChemDraw.

### File format support

| | chematic-draw | ChemDraw | ChemDoodle | Ketcher | FreeChemDraw | ChemSketch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **MOL V2000** | Yes | Yes | Yes | Yes | Yes | Yes |
| **SDF (multi-molecule, with coords)** | Yes | Yes | Yes | Yes | Yes | Yes |
| **MOL V3000** | Yes | Yes | Yes | Yes | No | No |
| **SMILES** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Canonical SMILES** | Yes | Yes | Yes | Yes | Partial | No |
| **Reaction SMILES** | Yes | Yes | Yes | Yes | No | No |
| **CDXML (ChemDraw XML)** | Partial (read only) | Yes (native) | Partial (import) | Yes | Partial | No |
| **CML** | Yes | Partial | Yes | Yes | No | No |
| **RXN (MDL reaction)** | No | Yes | Partial | Yes | No | No |
| **XYZ (3D coordinates)** | Yes | Partial | No | No | No | No |
| **PDB** | Partial | Yes | Partial | No | No | No |
| **InChI / InChIKey** | No | Yes | Yes | Yes | No | No |
| **SVG export** | Yes | Yes | Yes | Yes | No | No |
| **PNG export** | Yes | Yes | Yes | Yes | Yes | Yes |
| **PDF export** | No | Yes | Yes | No | No | Yes |
| **Clipboard paste (SMILES/MOL)** | Yes (Ctrl+V) | Yes | Yes | Yes | Partial | Partial |
| **Copy as image** | No | Yes | Yes | Yes | No | Yes |

### Chemistry features

| | chematic-draw | ChemDraw | ChemDoodle | Ketcher | FreeChemDraw | ChemSketch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **2D structure editor** | Yes | Yes | Yes | Yes | Yes | Yes |
| **Reaction mechanism arrows** | Yes | Yes | Yes | Yes | Partial | Partial |
| **Electron curly arrows** | Yes | Yes | Yes | No | No | No |
| **3D viewer** | Yes | Yes (Chem3D) | Yes (WebGL) | Partial (view only) | No | Partial |
| **3D coordinate generation** | Yes | Yes | Yes | No | No | No |
| **Molecular weight / formula** | Yes | Yes | Yes | Yes | Partial | Yes |
| **logP (Crippen)** | Yes | Yes | Yes | No | No | No |
| **TPSA** | Yes | Yes | Yes | No | No | No |
| **Lipinski / drug-likeness** | Yes | Yes | Partial | No | No | No |
| **QED score** | No | Partial | No | No | No | No |
| **IUPAC name (offline)** | Yes | Yes | Partial | No | No | No |
| **IUPAC name (online)** | No | Yes | Yes | Partial | No | No |
| **Name-to-structure** | Yes (online, PubChem) | Yes | Yes | No | No | Partial |
| **SMARTS substructure search** | Yes | Yes | Yes | Yes | No | No |
| **Fingerprints (Morgan, ECFP)** | Partial (WASM/Electron build only) | Yes | Yes | Partial | No | No |
| **Tautomer enumeration** | No | Yes | Partial | No | No | No |
| **Stereochemistry (R/S, E/Z)** | Partial | Yes | Yes | Yes | Partial | Partial |
| **Isotope labeling** | No | Yes | Yes | Yes | No | Partial |
| **Formal charge** | Yes | Yes | Yes | Yes | Partial | Yes |
| **Radicals** | No | Yes | Yes | Yes | No | No |
| **Atom mapping (reactions)** | Partial (manual) | Yes | Yes | Yes | No | No |
| **Abbreviated groups (Ph, Ac...)** | No | Yes | Yes | Yes | No | Partial |
| **Built-in template library** | Yes | Yes | Yes | Yes | Partial | Partial |
| **Polymer / S-group notation** | No | Yes | Partial | Partial | No | No |
| **Markush structures** | No | Yes | No | Partial | No | No |
| **NMR / spectra prediction** | No | Yes (add-on) | No | No | No | Partial |
| **Undo / Redo** | Yes | Yes | Yes | Yes | Partial | Yes |
| **Structure validation** | Partial (valence only) | Yes | Yes | Yes | No | No |
| **Fully offline** | Yes (note 1) | Yes | Partial (note 2) | Partial (note 2) | Yes | Yes |

> Note 1: Everything is offline except "Import by Name" (name-to-structure lookup
> against PubChem). QED, tautomer enumeration, and isotope labeling are unused/
> unimplemented in the UI regardless of network access — see the notes above.  
> Note 2: Web-based tools require a browser; some features require a server connection.

### UI and UX

| | chematic-draw | ChemDraw | ChemDoodle | Ketcher | FreeChemDraw | ChemSketch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dark mode** | Yes | No | No | No | No | No |
| **Japanese UI** | Yes | Yes | No | No | No | No |
| **Multi-language support** | Yes (EN/JA) | Yes | No | Partial | No | No |
| **Platform CJK font (Hiragino)** | Yes | Yes | No | No | No | No |
| **Zoom / pan canvas** | Yes | Yes | Yes | Yes | Partial | Yes |
| **ChemDraw-compatible shortcuts** | Yes | Yes (native) | Partial | No | Partial | No |
| **Startup time** | Fast | Slow | Slow | Fast (web) | Very slow | Slow |
| **Memory footprint** | Low | High | Medium | Low | Medium | Medium |
| **Installer size** | Small | Large | Medium | None (web) | Large | Medium |

---

## Features

| Feature | Status |
|---------|--------|
| 2D molecular structure drawing (atoms, bonds, rings) | Yes |
| CPK element colours (C/N/O/S/P/halogens) | Yes |
| Bond types: single, double, triple, aromatic, wedge, dash | Yes |
| Dark mode / Light mode (runtime switch) | Yes |
| Multi-language UI (English / Japanese) | Yes |
| Clipboard paste — SMILES & MOL V2000 (Ctrl+V) | Yes |
| Export as SMILES, MOL, SVG, PNG | Yes |
| IUPAC name generation (offline, local algorithm) | Yes |
| Import by Name — name-to-structure (PubChem API, requires internet) | Yes |
| Molecular weight, logP, TPSA calculation | Yes |
| Reaction mechanism canvas (arrows, curly arrows) | Yes |
| 3D molecular viewer (ball-and-stick, orthographic) | Yes |
| ChemDraw XML (CDXML) import (read only) | Partial |
| Chemical Markup Language (CML) read/write | Yes |

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Select tool |
| `C / N / O / S` | Switch to atom tool |
| `Ctrl+V` | Paste SMILES or MOL from clipboard |
| `Del` | Delete selected atom |
| `Ctrl+A` | Select all |
| `Ctrl+Z` | Undo |
| Scroll | Zoom in/out |
| Middle-drag | Pan canvas |

---

## Building

```sh
# Prerequisites: Rust stable toolchain
cargo build --release
cargo run
```

No C/C++ dependencies. Compiles on Windows, macOS, and Linux.

---

## Architecture

```
chematic-draw/         — binary entry point (eframe)
crates/
  chem-ui/             — egui UI components
    app.rs             — ChemDrawApp (eframe::App)
    canvas.rs          — 2D molecular canvas
    bridge.rs          — CanvasMolecule <-> chematic::Molecule
    fonts.rs           — platform CJK font loading (Hiragino / Noto / YuGothic)
    toolbar.rs         — tool palette
    inspector.rs       — property panel (MW, SMILES, IUPAC)
    iupac.rs           — offline IUPAC name generation (local algorithm)
    paste.rs           — clipboard SMILES/MOL paste
    export.rs          — SVG/SMILES/MOL export
    reaction.rs        — reaction mechanism canvas
    viewer3d.rs        — 3D ball-and-stick viewer
    theme.rs           — Dark/Light design tokens + CPK colours
    i18n.rs            — EN/JA localisation
  chem-io/             — file format I/O
    cdxml.rs           — ChemDraw XML
    cml.rs             — Chemical Markup Language
    export_png.rs      — SVG -> PNG (resvg)
i18n/
  en.toml              — English strings
  ja.toml              — Japanese strings
```

---

## Chemistry engine

All chemistry is handled by the [`chematic`](https://crates.io/crates/chematic) crate — a pure-Rust RDKit alternative with zero C/C++ FFI. This table lists what each sub-crate can do; not every capability is wired into the UI yet (QED and tautomer enumeration, for example, are available in `chematic-chem` but not currently exposed anywhere in chematic-draw — see the feature comparison table above).

| Sub-crate | Used for |
|-----------|---------|
| `chematic-smiles` | SMILES parse / write / canonical |
| `chematic-mol` | MOL V2000 / SDF read / write |
| `chematic-depict` | 2D coordinate generation |
| `chematic-chem` | MW, logP, TPSA, QED, Lipinski, tautomers |
| `chematic-3d` | 3D coordinate generation |
| `chematic-rxn` | Reaction SMILES |
| `chematic-fp` | Fingerprints (Morgan, ECFP) |
| `chematic-smarts` | SMARTS pattern matching |

---

## Network dependency: Import by Name

IUPAC name **generation** (Inspector panel) is a local, offline algorithm — no
network access, no PubChem involved. The only feature that needs the network is
**Import by Name** (File menu), which looks up a compound name against the
[PubChem REST API](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) to fetch its
structure:

```
GET https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{name}/property/IsomericSMILES/JSON
```

- **Internet access is required** for this feature only.
- Runs on a background thread; the UI stays responsive while it's in flight.
- When offline or the name isn't found, the Inspector shows an error instead of
  blocking the UI.
- No API key is required. PubChem is a free public service provided by the NCBI / NIH.
- Data returned from PubChem is subject to its [terms of use](https://www.ncbi.nlm.nih.gov/home/about/policies/).

Every other feature (drawing, export, 3D, SMILES/MOL paste, IUPAC name generation)
works fully **offline**.

---

## License

Licensed under either of:

- Apache License, Version 2.0
- MIT License

at your option.
