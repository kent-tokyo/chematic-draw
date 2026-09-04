# Migration guide for chematic-draw

This guide is for people moving a molecule-editing workflow from ChemDraw,
ChemDoodle, Ketcher, or ChemSketch. It focuses on the file formats and
workflows that chematic-draw can verify today.

## The short version

1. Export the source structure as **SMILES**, **MOL V2000/V3000**, or **SDF**
   when the chemical graph is the important payload.
2. Use **CDXML** only after checking the supported-subset boundary in
   [Format Interoperability](INTEROP.md).
3. Open the file in chematic-draw and review any loss warning before saving or
   exporting it again.
4. Keep the original file when it contains presentation or query semantics
   that the target format cannot preserve.

## Choose an interchange format

| Workflow | Recommended first choice | Why | Boundary |
|---|---|---|---|
| A single molecule or a searchable structure | SMILES | Compact, deterministic, and supported for read/write | 2D/3D coordinates and drawing presentation are not part of SMILES |
| A molecule with coordinates | MOL V3000 or SDF | Preserves the supported molecule graph and coordinates | Review wildcard, isotope, and advanced query loss warnings |
| A ChemDraw-style document | CDXML | Supported multi-page subset can round-trip page and drawing metadata | Advanced presentation attributes are outside the supported subset |
| A reaction scheme with agents or coefficients | Reaction-document JSON v2 | Preserves agents, coefficients, steps, and provenance | RXN V2000 export is intentionally limited to one step |
| A 3D viewer input | XYZ or PDB | Reads coordinates for 3D inspection | Import only; connectivity is not inferred from the format |

## From ChemDraw

For a molecule-only workflow, export MOL V3000 or SDF. For a document with
pages, text, arrows, and supported labels, try CDXML and inspect the loss
warning before saving. Advanced ChemDraw presentation attributes are not
silently recreated.

For reactions, keep the reaction-document JSON v2 file when agents,
stoichiometric coefficients, or multiple authored steps matter. RXN V2000 is
available for the supported one-step boundary only.

## From ChemDoodle or ChemSketch

Use SMILES for a structure-only transfer and MOL V3000/SDF when coordinates or
file metadata matter. If the source application can export CDXML, treat it as
a bounded document transfer rather than a guarantee that every visual style
attribute will survive.

## From Ketcher or another browser editor

Export the structure as SMILES, MOL, or SDF instead of copying a
product-specific editor JSON format. The resulting file can be checked by
chematically-draw's parser and its round-trip tests. Query documents and
SMARTS patterns should be kept separately when they contain Markush, R-group,
polymer, or opaque query semantics.

## What changes in the workflow

chematic-draw is an offline-first desktop editor. The core editing, parsing,
validation, SMARTS matching, layout, and most exports run locally. PubChem
lookup is the explicit network-dependent feature and is based on an
InChIKey, not similarity search.

The editor does not claim to be a drop-in replacement for any named product.
The [Known Limitations](KNOWN_LIMITATIONS.md) and [Release Readiness](RELEASE_READINESS.md)
pages are the authoritative checklist for production use.

## Migration checklist

- [ ] Keep the source file unchanged as an archival copy.
- [ ] Select a target format from the table above.
- [ ] Open the exported file and verify atom count, bond order, charge,
      isotope, stereo hints, and coordinates where applicable.
- [ ] Review and accept or cancel every loss warning.
- [ ] Run a small round-trip sample before converting a larger corpus.
- [ ] Keep reaction-document JSON v2 for multi-step or provenance-sensitive
      reaction work.

See [Quick Start](QUICK_START.md) for installation and
[Format Interoperability](INTEROP.md) for the complete support matrix.
