# Quick Start Guide

Get chematic-draw up and running in 5 minutes.

## Installation

### Option 1: Download a pre-release build

Packaged installers (`.deb`/`.rpm` for Linux, `.zip` for macOS, a Squirrel
`.exe` installer for Windows) are published on the
[GitHub Releases page](https://github.com/kent-tokyo/chematic-draw/releases)
for tagged versions. There's no stable release yet — only release
candidates (e.g. `v0.2.2-rc.1`) — and builds are unsigned (no code
signing/notarization is configured), so macOS/Windows will show an
unidentified-developer warning on first launch.

**Verify your download** against the `SHA256SUMS-<OS>.txt` file published
alongside the binaries in the same release:

```bash
# Linux
sha256sum -c SHA256SUMS-Linux.txt

# macOS
shasum -a 256 -c SHA256SUMS-macOS.txt

# Windows (PowerShell)
Get-FileHash <downloaded-file> -Algorithm SHA256
# compare the output against the matching line in SHA256SUMS-Windows.txt
```

This confirms the file wasn't corrupted or altered in transit — it does not
substitute for code signing, since the checksums themselves are published
unsigned in the same release.

### Option 2: Build from source

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
npm run build:wasm
npm start
```

Requires Node.js 24+ and a Rust toolchain with `wasm-pack` — see
[Build Guide](./BUILD.md) for details.

## First Launch

1. **App window opens** — you'll see:
   - Canvas area (left) for drawing molecules, with an atom/bond toolbar above it
   - Sidebar (right) with tabs: Inspector, Templates, Reactions, Batch, Stereo, Lipinski, Props, Mech, 3D, DB, Research, Chat
   - Menu bar (top) with File, Edit, View, Tools, Help
2. A sample molecule (benzene) loads automatically on startup.
3. **Canvas Ready** — you can now start drawing

## Draw Your First Molecule

### Method 1: Click-to-Build
1. **Pick an element** — click a toolbar button: `C`, `N`, `O`, `S`, or `P`
   (or press the matching key)
2. **Click Canvas** — each click places an atom of that element; click near
   an existing atom to bond a new one to it
3. **Pick a bond type** — click the bond toolbar buttons (single/double/
   triple/aromatic, or press `1`/`2`/`3`/`4`) before clicking to place a bond
   between two existing atoms
4. **Select tool** (`Esc`) — switch back to selecting/moving atoms and bonds

### Method 2: Load from a file
There's no "paste a SMILES string" dialog — instead, use **File → Open...**
and pick a file (`.smi`, `.mol`, `.sdf`, `.cml`, `.cdxml`) containing it; the
parser auto-detects the format. Example SMILES to try in a `.smi` file:
   - Benzene: `c1ccccc1`
   - Aspirin: `CC(=O)Oc1ccccc1C(=O)O`
   - Naphthalene: `c1ccc2ccccc2c1`

### Method 3: Templates
1. **Click Templates Tab** (right sidebar)
2. **Browse molecule library**
3. **Click molecule** to load it

## Explore Features

### 3D Viewer
1. **Click "3D" Tab** in sidebar
2. **Click "3D 生成"** button
3. Wait for generation (~1 second for small molecules)
4. **Rotate**: Click and drag
5. **Zoom**: Scroll wheel
6. **Export**: Click "XYZ エクスポート" for XYZ file

### Molecule Properties
1. **Click "Props" Tab** in sidebar
2. **Molecular Weight** — Calculated automatically
3. **Solubility (ESOL)** — Predicted LogS value
4. **Drug-Likeness** — Lipinski's rule violations
5. **Synthetic Accessibility** — SA score (0-10, lower = easier)

### Reactions & Mechanisms
Two separate tabs cover this, not one:
1. **"Reactions" tab** — add steps manually, or run a built-in SMIRKS
   template (carboxylic acid → amide, ester → acid, etc.) against the
   loaded molecule to generate a step automatically. Multi-step schemes
   show live atom-mapping, a step/single-step classification, and green
   chemistry metrics (atom economy, E-factor) once a step exists.
2. **"Mech" tab** — draw electron-pushing arrows: click "+ Add Arrow", then
   click a source atom and a sink atom on the canvas, and pick the arrow
   type (forward/retro/resonance).

### Stereochemistry
1. **Click "Stereo" Tab** in sidebar
2. **Mark Chiral Centers** — Select atoms
3. **Enumerate Isomers** — Generate all stereoisomers
4. **View Variations** — See all 2^n combinations

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` / `Cmd+N` | New molecule |
| `Ctrl+O` / `Cmd+O` | Open molecule |
| `Ctrl+S` / `Cmd+S` | Save molecule |
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected atom/bond |
| `Esc` | Select tool |
| `C` / `N` / `O` / `S` / `P` | Place that element (no modifier key) |
| `1` / `2` / `3` / `4` | Single / double / triple / aromatic bond tool |
| `Ctrl+L` / `Cmd+L` | Clean layout (auto re-arrange) |
| `Ctrl+A` / `Cmd+A` | Select all |
| `+` / `-` / `0` | Zoom in / out / reset |
| `F1` or `Ctrl+?` | Show keyboard shortcuts |

## Export Your Work

### Formats
Available from **File → Export**: **SVG** (vector, publications), **PNG**
(raster), **MOL V2000**, **SMILES**. There's no CSV/JSON molecule export or
File-menu XYZ export — those exist elsewhere:
- **XYZ** — 3D Viewer tab ("3D" in sidebar) → generate 3D coordinates →
  "XYZ エクスポート" button
- **CSV / JSON** — Reactions tab's own "Export Scheme" panel exports a
  *reaction scheme* (steps, atom mappings, green-chemistry metrics) this
  way — not a single molecule

### How to Export a Molecule
1. **File → Export**
2. **Choose format** (SVG / PNG / MOL V2000 / SMILES)
3. **Choose save location** in the dialog
4. **Done!**

## Common Workflows

### Analyze Drug Molecule
```
1. Load molecule (SMILES or draw)
2. Click "Props" tab → Review Lipinski violations
3. Click "3D" tab → Generate 3D structure
4. Optionally: Rotate and export for modelling software
```

### Compare Similar Molecules
```
1. Load first molecule
2. Click "DB" tab → Search similar compounds
3. Results show similarity scores
4. Click result → Highlight MCS (common substructure)
```

### Design Reaction Route
```
1. Load starting material
2. Click "Reactions" tab → run a SMIRKS template or add a manual step
3. Click "Mech" tab → draw electron-pushing arrows for the mechanism
4. Step through the scheme's steps to review the route
```

## Tips & Tricks

✨ **Pro Tips:**
- **Shift/Ctrl-click** an atom or bond to add it to the current selection
- Select an atom and use the **Inspector** tab to edit charge, isotope
  (mass number), or element
- Use **Templates** for common scaffolds (save time!)
- Export to **SVG** for publication-quality figures

⚡ **Performance:**
- 3D generation faster for molecules <500 atoms
- Bulk operations use WebWorker (non-blocking UI)
- Large molecules may take 2-5 seconds to render

## Need Help?

- 📖 **Full Documentation** → See `docs/` folder
- 🐛 **Report Issues** → GitHub Issues
- 💡 **Feature Requests** → GitHub Discussions
- ❓ **FAQ** → See docs/TROUBLESHOOTING.md

## Next Steps

1. ✅ Successfully launched chematic-draw
2. 📖 Explore the [User Tutorial](./TUTORIAL.md) for deeper features
3. 🏗️ Check [Architecture](./ARCHITECTURE.md) if you're a developer
4. 🔧 See [Build Guide](./BUILD.md) to compile from source

Happy chemistry! 🧪
