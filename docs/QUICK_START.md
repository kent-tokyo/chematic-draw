# Quick start

Use the desktop app for the full offline editor, or try the
[browser Playground](https://kent-tokyo.github.io/chematic-draw/playground/)
for a small 2D editing and SVG/SMILES-export workflow.

## Install a release

Download the matching installer from [GitHub Releases](https://github.com/kent-tokyo/chematic-draw/releases).
The current stable release is `v1.0.14`. Release binaries may be unsigned, so
macOS and Windows can show an unidentified-developer warning on first launch.

Each release includes `SHA256SUMS-<OS>.txt`. Verify a downloaded file before
opening it:

```bash
# Linux
sha256sum -c SHA256SUMS-Linux.txt

# macOS
shasum -a 256 -c SHA256SUMS-macOS.txt

# Windows PowerShell
Get-FileHash <downloaded-file> -Algorithm SHA256
```

Checksums confirm that a file matches the published artifact; they do not
replace code signing. See [Security](../SECURITY.md) for the trust boundary.

## Build from source

Install Node.js 24+, a current Rust toolchain, the `wasm32-unknown-unknown`
target, and `wasm-pack`. Then run:

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack # once
npm run build:wasm
npm start
```

For testing, packaging, or platform prerequisites, see [Build](BUILD.md).

## First five minutes

1. Start with the sample molecule, or choose **File → Open** to import SMILES,
   MOL, SDF, CML, or supported-subset CDXML.
2. Use **Main Tools** to select, draw atoms and bonds, insert a ring, or open
   Templates. `Esc` returns to selection; `C`, `N`, `O`, `S`, and `P` select
   atom tools; `1` through `4` select bond tools.
3. Open the right sidebar for properties, query/stereo tools, reactions,
   analysis, 3D, NMR, and database functions.
4. Save the editable document, then use **File → Export** for SVG, PNG, PDF,
   MOL, SMILES, or a session bundle. Use the Reactions panel for reaction JSON
   or RXN, and the 3D panel for XYZ.

## Common tasks

| Goal | Start here | Important boundary |
|---|---|---|
| Draw a molecule | Main Tools and Templates | Use the Inspector to adjust atom or bond details. |
| Check a structure | Props, Lipinski, Stereo, or MCS | Results are local calculations, not experimental evidence. |
| Prepare a reaction | Reactions and Mech | Diagnostics check authored structure facts, not a mechanism or product prediction. |
| Move a file from another editor | File → Open | Prefer SMILES, MOL, SDF, or CML for ordinary structures; review CDXML/RXN loss warnings. |
| Look up a compound | Database | PubChem needs network access. ChemSpider is optional and desktop-only. |

## Essential shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+N`, `Ctrl/Cmd+O`, `Ctrl/Cmd+S` | New, open, save |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` | Undo, redo |
| `C`, `N`, `O`, `S`, `P` | Atom tools |
| `1`, `2`, `3`, `4` | Single, double, triple, aromatic bond |
| `Delete` / `Backspace` | Delete selection |
| `Ctrl/Cmd+A` | Select all |
| `+`, `-`, `0` | Zoom in, out, reset |

Continue with the [User Tutorial](TUTORIAL.md) for the supported workflow,
[Migration](MIGRATION.md) for moving from another editor, and
[Interop](INTEROP.md) before round-tripping production documents.
