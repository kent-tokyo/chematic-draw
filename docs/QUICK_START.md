# Quick Start Guide

Get chematic-draw up and running in 5 minutes.

## Installation

### macOS
```bash
brew install chematic-draw
chematic-draw
```

### Windows
Download `chematic-draw-setup.exe` from [Releases](https://github.com/yourusername/chematic-draw/releases)

### Linux
```bash
sudo snap install chematic-draw
chematic-draw
```

## First Launch

1. **Start Application** — Click the application icon
2. **Main Window Opens** — You'll see:
   - Large canvas area (center) for drawing molecules
   - Sidebar (right) with tools and properties
   - Menu bar (top) with File, Edit, View options
3. **Canvas Ready** — You can now start drawing

## Draw Your First Molecule

### Method 1: Click-to-Build
1. **Click Draw Mode** — Ensure pencil/draw icon is selected
2. **Click Canvas** — Place atoms:
   - Single click = Carbon (C)
   - Double-click = Nitrogen (N)
   - Right-click menu = Other elements
3. **Drag Between Atoms** — Create bonds
4. **Adjust Bonds** — Click bond to toggle single/double/triple

### Method 2: SMILES Input
1. **File → New from SMILES**
2. **Paste SMILES string**:
   - Benzene: `c1ccccc1`
   - Aspirin: `CC(=O)Oc1ccccc1C(=O)O`
   - Naphthalene: `c1ccc2ccccc2c1`
3. **Click Load**

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

### Reaction Mechanisms
1. **Click "Reactions" Tab** in sidebar
2. **Select Reaction Type** — Choose from SN1, SN2, E1, E2, Addition
3. **Draw Reagent** — Add nucleophile/electrophile
4. **Generate Mechanism** — Visualize electron flow
5. **Step Through** — Navigate reaction steps

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
| `Delete` / `Backspace` | Delete selected atom |
| `D` | Toggle draw mode |
| `S` | Toggle select mode |
| `B` | Bond tool |
| `E` | Erase tool |
| `?` | Show help |

## Export Your Work

### Formats
- **SVG** — Vector graphics (for publications)
- **PNG** — Raster image (for presentations)
- **XYZ** — 3D coordinates (for Gaussian, ORCA, etc.)
- **CSV** — Atom/bond table (for data analysis)
- **JSON** — Native format (for chematic-draw projects)

### How to Export
1. **File → Export As**
2. **Choose format**
3. **Select location**
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
2. Click "Reactions" tab
3. Select reaction type (SN2, Addition, etc.)
4. Draw electrophile/nucleophile
5. Generate mechanism
6. Step through to see electron flow
```

## Tips & Tricks

✨ **Pro Tips:**
- Use **Tab** to cycle through drawing modes
- **Right-click** on atom for element menu
- Hold **Shift** while dragging to adjust bond angle
- **Double-click** atom to edit properties (charge, mass number)
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
