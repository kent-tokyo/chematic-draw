# User tutorial

This is the shortest path through the supported desktop workflow. The app is
experimental; review [Known Limitations](KNOWN_LIMITATIONS.md) before using an
output as publication or interchange evidence.

## Draw or import

1. Choose an atom, bond, ring, annotation, or selection tool in Main Tools.
2. Click or drag on the canvas. `Esc` returns to selection; `Ctrl/Cmd+Z`
   undoes the previous document action.
3. Open Templates to insert one of 55 categorized structures, by click at the
   viewport center or drag at a chosen position.
4. Use **File → Open** for SMILES, MOL, SDF, CML, or the supported CDXML
   subset. Keep the original CDXML when presentation fidelity matters.

The right sidebar provides editable selection properties, query constraints,
stereo tools, reactions, analysis panels, 3D, NMR, and database tools.

## Save and export

Use **File → Save/Save As** for a document, and **File → Export** for SVG,
PNG, PDF, MOL, SMILES, or session JSON. Loss warnings are intentional: accept
them only when the projection is suitable for your workflow. Export reaction
schemes as JSON to preserve steps, agents, coefficients, and provenance; RXN
V2000 is only a one-step, loss-aware interchange.

## Reactions

In **Reactions**, author steps, participants, coefficients, conditions, and
arrows, then save JSON to retain the full supported document. The displayed
diagnostic is structural consistency: it checks authored element/isotope and
charge facts, maps, and continuity. It does not prove a mechanism, complete
stoichiometry, or product prediction.

## Analysis and spectra

- **Props / Lipinski / Stereo / MCS:** local, bounded calculations.
- **3D:** generate a conformer, inspect it, then export XYZ. It is not a
  force-field validation or a persistent 3D interchange model.
- **NMR:** load generic JSON or a Bruker 1D peak list, validate it, then add
  manual assignments and notes. Prediction, automatic assignment, raw FID,
  processed spectra, and other vendor formats are outside scope.
- **Database:** PubChem performs an explicit exact lookup. ChemSpider is an
  Electron-only, opt-in name lookup, enabled only by a host configuration;
  browser builds leave it disabled.

## Keyboard essentials

| Key | Action |
|---|---|
| `Ctrl/Cmd+N`, `O`, `S` | New, open, save |
| `Ctrl/Cmd+Z`, `Shift+Z` | Undo, redo |
| `C`, `N`, `O`, `S`, `P` | Atom tools |
| `1`, `2`, `3`, `4` | Single, double, triple, aromatic bond |
| `Delete` / `Backspace` | Delete selection |
| `Ctrl/Cmd+A` | Select all |
| `+`, `-`, `0` | Zoom in, out, reset |

See [Migration](MIGRATION.md) for an editor-to-editor task map and
[Interop](INTEROP.md) for format-specific behavior.
