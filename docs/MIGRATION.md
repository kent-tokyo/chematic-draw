# Migration guide for chematic-draw

This guide is for moving molecule-editing work from ChemDraw, ChemDoodle,
Ketcher, or ChemSketch. Start with an interchange format, not a one-click
conversion of an entire document corpus.

## The short version

1. Choose **SMILES**, **MOL V2000/V3000**, or **SDF** when the chemical graph
   is the important payload.
2. Use **CDXML** only after checking its supported subset in
   [Format Interoperability](INTEROP.md).
3. Review a small round trip and every loss warning before a bulk migration.
4. Keep the source file when presentation or query semantics matter.

## Choose an interchange format

| Workflow | Recommended first choice | Boundary |
|---|---|---|
| A single molecule or searchable structure | SMILES | Coordinates and drawing presentation are not part of SMILES. |
| A molecule with coordinates | MOL V3000 or SDF | Review wildcard, isotope, and advanced-query loss warnings. |
| A ChemDraw-style document | CDXML | Advanced presentation attributes are outside the supported subset. |
| A reaction scheme with agents or coefficients | Reaction-document JSON v2 | RXN V2000 export is limited to one step. |
| A 3D viewer input | XYZ or PDB | Import only; connectivity is not inferred. |

## From ChemDraw

For molecules, export MOL V3000 or SDF. For documents with pages, text, arrows,
or labels, try CDXML and inspect its warning before saving. Keep reaction JSON
v2 when agents, coefficients, or multiple authored steps matter; RXN V2000 is
only for the supported one-step boundary.

Choose **Settings → Workspace → ChemDraw familiar** for the migration layout.
**Reset Workspace** restores it, including the tool palette, optional Templates
drawer, Properties panel, and default widths. Compact keeps the same command
ownership with smaller controls.

| Familiar location | chematic-draw location | Available behavior |
|---|---|---|
| Main Tools palette | Left vertical palette | Select; bond/ring tools; templates; atoms; arrow, text, bracket, and eraser |
| General toolbar | Top toolbar | New/Open/Save, history, Clean Up, transforms, zoom, theme, workspace, and shortcuts |
| Templates | Left drawer | Click inserts at view center; drag inserts at the drop point; both are undoable |
| Object / Structure / Search / Window menus | Native desktop menu | Selection transforms; structure, search, and panel commands |
| Properties and context tools | Right-side panels | Select or right-click an atom/bond to reopen Properties; Query and Stereo use separate tabs |

| Key | Action |
|---|---|
| `Esc` | Select tool |
| `1`, `2`, `3`, `4` | Single, double, triple, or aromatic bond tool |
| `6` | Insert a six-membered carbon ring |
| `C`, `N`, `O`, `S`, `P` | Element tool |
| `Delete` / `Backspace` | Delete the selection |
| `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z` | Undo and redo |
| `Cmd/Ctrl+K` | Find a panel or feature |

Inactive Curves, Colors, Group, and Add-ins lookalikes are not displayed.
Text, brackets, reaction arrows, and presentation remain bounded by the
document contracts in [Format Interoperability](INTEROP.md).

## From another editor

Use SMILES for structure-only transfer and MOL V3000/SDF when coordinates or
file metadata matter. Treat CDXML as a bounded document transfer, not a
guarantee that every visual style survives. From browser editors, export a
standard interchange format rather than product-specific editor JSON. Keep
query documents and SMARTS separately when they contain Markush, R-group,
polymer, or opaque semantics.

## What changes in the workflow

Core editing, parsing, validation, SMARTS matching, layout, and most exports
run locally. PubChem exact lookup and the optional Electron-host ChemSpider
name lookup are network-dependent. Plan format-first where source-specific
semantics matter; use [Known Limitations](KNOWN_LIMITATIONS.md) as the
acceptance checklist.

## Migration checklist

- [ ] Keep the source file unchanged as an archival copy.
- [ ] Select a target format from the table above.
- [ ] Verify atom count, bond order, charge, isotope, stereo hints, and
      coordinates where applicable.
- [ ] Review every loss warning.
- [ ] Run a small round-trip sample before converting a larger corpus.
- [ ] Keep reaction-document JSON v2 for multi-step or provenance-sensitive
      reaction work.

See [Quick Start](QUICK_START.md) for installation and
[Format Interoperability](INTEROP.md) for the complete support matrix.
