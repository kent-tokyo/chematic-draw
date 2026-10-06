# Search and discoverability plan

The README, desktop entry HTML, and browser Playground are the public entry
points. Keep them useful to people evaluating or migrating a structure editor;
this is a maintainer reference, not public product copy.

## Canonical positioning

- **Product name:** chematic-draw
- **One-line description:** Open-source, offline-first chemical structure
  editor for Windows, macOS, and Linux.
- **Primary intent:** chemical structure editor, offline molecule editor,
  SMILES editor, SMARTS search, reaction scheme editor.
- **Secondary intent:** ChemDraw alternative, ChemDoodle alternative, Ketcher
  migration, ChemSketch migration, CDXML/MOL/SDF interoperability.
- **Truth boundary:** The product is production-oriented for its documented
  workflows; migration claims must keep format and presentation limits clear.

## Recommended page map

| Search intent | Canonical page | Required answer |
|---|---|---|
| Find an open-source chemical structure editor | `README.md` | What it is, platforms, screenshot, install path |
| Try editing a molecule in the browser | [Chematic Draw Playground](https://kent-tokyo.github.io/chematic-draw/playground/) | Interactive SMILES editor, 2D preview, and SVG/SMILES export |
| Install or try the desktop editor | `docs/QUICK_START.md` | Release artifacts, checksums, unsigned-build warning |
| Move from another editor | `docs/MIGRATION.md` | Format-first migration steps and loss boundaries |
| Compare chemical structure editors | `docs/COMPARISON.md` | Workflow comparison without unsupported score claims |
| Check file compatibility | `docs/INTEROP.md` | Read/write/round-trip matrix and known loss |
| Use SMARTS/query features | `docs/API.md` and `docs/INTEROP.md` | Supported query contract and rejection behavior |
| Assess release safety | `docs/RELEASE_READINESS.md` and `SECURITY.md` | Evidence, signing, and external dependencies |

## Entry-point metadata

```text
Title: chematic-draw — Open-source chemical structure editor
Description: Open-source offline-first chemical structure editor for Windows, macOS, and Linux. Draw molecules and reaction schemes, inspect properties, and export SVG, PNG, PDF, SMILES, MOL, and SDF.
```

For the browser Playground, use
`https://kent-tokyo.github.io/chematic-draw/playground/` as the canonical URL
and focus the metadata on browser-based molecule editing:

```text
Title: Chematic Draw Playground — Edit chemical structures in your browser
Description: Try an open-source chemical structure editor online. Edit SMILES, preview molecules, and export SVG without uploading data.
```

## Content quality rules

- Lead with the user's task and the supported format, not a competitor's name.
- Use competitor names only in factual migration/comparison context.
- Link capability claims to a guide, matrix, test, or limitation.
- Keep version and release dates synchronized with the manifests and CHANGELOG.
- State network, signing, platform, and format limitations near the relevant
  promise.
- Use one useful page per intent instead of keyword-heavy duplicates.

If a public website is added, give each page a unique title and description,
then add canonical URLs, Open Graph previews, descriptive alt text,
`SoftwareApplication` structured data, and a sitemap. Structured data must
describe the actual release and must not invent ratings, capabilities, or
reviews.
