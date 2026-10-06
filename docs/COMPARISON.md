# Chemical structure editor comparison

Compare workflows, not feature scores. Competitor capabilities and licensing
change independently, so consult their current documentation before making a
procurement decision. chematic-draw is an open-source, offline-first desktop
editor for Windows, macOS, and Linux.

## At a glance

| Need | chematic-draw | Important qualification |
|---|---|---|
| Local 2D drawing and reaction schemes | Supported | Electron desktop application; chemistry runs in Rust/WASM. |
| SMILES, MOL, SDF, and CML exchange | Supported | Check the [round-trip matrix](INTEROP.md) for format-specific loss. |
| SMARTS and query editing | Supported subset | Unsupported query semantics are rejected rather than guessed. |
| 3D inspection | Supported | XYZ/PDB are coordinate imports; this is not a conformer database. |
| Rich reaction schemes | Supported in JSON v2 | RXN V2000 is intentionally one-step and loss-aware. |
| ChemDraw document exchange | Supported CDXML subset | Advanced presentation semantics are not reproduced losslessly. |
| Browser collaboration or signed distribution | Not a product guarantee | The product is local-first; signing depends on release credentials. |

## Evaluate a real workflow

Use representative source files and the same target format for every tool.
Compare the graph, charge/isotope/stereo data, coordinates and presentation
where relevant, reaction boundaries, and what happens to unsupported fields.
chematic-draw warns or rejects known losses; a successful save does not prove
that every source semantic survived.

## Choose chematic-draw when

- You need a local desktop editor without a chemistry service dependency.
- You exchange structures through SMILES, MOL, SDF, CML, or a supported CDXML
  subset.
- You value explicit validation, deterministic exports, and documented query
  and reaction boundaries.

Keep the source application in the final review loop when a document depends
on CDXML presentation semantics outside the [support matrix](INTEROP.md), or
when a publisher requires an unavailable format or signing workflow.

## Common questions

### Is chematic-draw a free ChemDraw alternative?

It is an open-source option for the supported workflows. It is not a drop-in
replacement for every ChemDraw workflow; test the target interchange format
before migrating a production corpus.

### Can I use it as an offline SMILES editor?

Yes. Editing, parsing, validation, canonical SMILES, and SMARTS matching use
the local WASM bridge. PubChem exact lookup and optional ChemSpider name lookup
are separate network features.

### Will CDXML look exactly the same after a round trip?

Not necessarily. The supported subset preserves documented structure and page
data; advanced presentation attributes remain outside the lossless boundary.

### What should I use for a multi-step reaction?

Use reaction-document JSON v2. RXN V2000 export is blocked when it would hide
multi-step boundaries or other unsupported information.

## Related documentation

- [Migration guide](MIGRATION.md)
- [Format Interoperability](INTEROP.md)
- [Known Limitations](KNOWN_LIMITATIONS.md)
- [Release Readiness](RELEASE_READINESS.md)
- [Quick Start](QUICK_START.md)
