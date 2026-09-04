# Search and discoverability plan

This project does not currently ship a public marketing website. The README
and documentation therefore act as the canonical, crawlable product entry
points. This plan keeps search content useful for people who are evaluating or
migrating a chemical structure editor.

## Canonical positioning

- **Product name:** chematic-draw
- **One-line description:** Open-source, offline-first chemical structure
  editor for Windows, macOS, and Linux.
- **Primary intent:** chemical structure editor, offline molecule editor,
  SMILES editor, SMARTS search, reaction scheme editor.
- **Secondary intent:** ChemDraw alternative, ChemDoodle alternative, Ketcher
  migration, ChemSketch migration, CDXML/MOL/SDF interoperability.
- **Truth boundary:** The product is experimental and is not a drop-in
  replacement for commercial or browser editors.

## Recommended page map

| Search intent | Canonical page | Required answer |
|---|---|---|
| Find an open-source chemical structure editor | `README.md` | What it is, platforms, screenshot, install path |
| Try editing a molecule in the browser | `electron/playground.html` | Interactive SMILES editor, 2D preview, and SVG/SMILES export |
| Install or try the desktop editor | `docs/QUICK_START.md` | Release artifacts, checksums, unsigned-build warning |
| Move from another editor | `docs/MIGRATION.md` | Format-first migration steps and loss boundaries |
| Compare chemical structure editors | `docs/COMPARISON.md` | Workflow comparison without unsupported score claims |
| Check file compatibility | `docs/INTEROP.md` | Read/write/round-trip matrix and known loss |
| Use SMARTS/query features | `docs/API.md` and `docs/INTEROP.md` | Supported query contract and rejection behavior |
| Assess release safety | `docs/RELEASE_READINESS.md` and `SECURITY.md` | Evidence, signing, and external dependencies |

## Metadata for the browser playground

The repository now contains a browser-only playground entrypoint. When it is
deployed under the project website, use `/playground` as its canonical URL and
keep its page title and description focused on browser-based molecule editing.

```text
Title: Chematic Draw Playground — Edit chemical structures in your browser
Description: Try an open-source chemical structure editor online. Edit SMILES, preview molecules, and export SVG without uploading data.
```

## Metadata when a website is added

Use one unique title and description per page. Suggested homepage values:

```text
Title: chematic-draw — Open-source offline chemical structure editor
Description: Draw, validate, search, and export chemical structures locally on Windows, macOS, and Linux with Rust/WASM chemistry operations.
```

Suggested migration-page values:

```text
Title: Migrate from ChemDraw, ChemDoodle, Ketcher, or ChemSketch | chematic-draw
Description: Move molecule and reaction workflows to chematic-draw with a format-first guide for SMILES, MOL, SDF, CDXML, RXN, and reaction JSON.
```

The future site should add canonical URLs, Open Graph previews, descriptive
alt text, `SoftwareApplication` structured data, and a sitemap. Structured
data must describe the actual downloadable application and release state; it
must not claim ratings, capabilities, or reviews that are not evidenced.

## Content quality rules

- Lead with the user's task and the supported format, not a competitor's name.
- Use competitor names only in factual migration/comparison context.
- Link every capability claim to a guide, matrix, test, or limitation.
- Keep version and release dates synchronized with the manifests and CHANGELOG.
- State network, signing, platform, and format limitations near the relevant
  promise.
- Prefer one useful page per intent over keyword-heavy duplicate pages.
