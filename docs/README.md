# Documentation

Start with the document that matches your task. The source, manifests, tests,
and published release artifacts remain authoritative when documentation and
implementation differ.

## Choose a guide

| Need | Read |
|---|---|
| Install, draw, save, or export | [Quick Start](QUICK_START.md) and [User Tutorial](TUTORIAL.md) |
| Move from ChemDraw, ChemDoodle, Ketcher, or ChemSketch | [Migration](MIGRATION.md) |
| Check format support and loss behavior | [Format Interoperability](INTEROP.md) and [Known Limitations](KNOWN_LIMITATIONS.md) |
| Build, test, package, or contribute | [Build](BUILD.md), [CI/CD](CI_CD.md), and [Contributing](../CONTRIBUTING.md) |
| Understand the bridge or public packages | [API](API.md), [Architecture](ARCHITECTURE.md), [`@chematic/contract`](../packages/chematic-contract/README.md), and [`@chematic/web`](../packages/chematic-web/README.md) |
| Evaluate a release boundary or a competing workflow | [Release Readiness](RELEASE_READINESS.md) and [Comparison](COMPARISON.md) |
| Diagnose a problem or report it safely | [Troubleshooting](TROUBLESHOOTING.md) and [Security](../SECURITY.md) |

[Japanese README](../README_ja.md) and [Chinese README](../README_zh.md) provide
short project introductions. [Discoverability](DISCOVERABILITY.md) is a
maintainer reference for public copy and metadata.

## Current release and development line

The current tagged release is `v1.0.14` (2026-10-03). The application version
is defined in `electron/package.json` and `crates/chem-wasm/Cargo.toml`; CI
checks that they match. That release pins `chematic` v1.0.19. Current `main`
pins v1.0.31. Items in [Unreleased](../CHANGELOG.md) are not published until
the commit, tag, workflow, and release artifacts have been verified.

## Boundaries to read before relying on an output

- CDXML and RXN are loss-aware interchange paths, not complete source-format
  presentation models.
- Reaction diagnostics report structural consistency, not a proven mechanism,
  full stoichiometry, or product prediction.
- PubChem is a networked exact InChIKey lookup. ChemSpider is desktop-only and
  opt-in. The rest of the core editing workflow is local-first.
- NMR accepts generic JSON and Bruker 1D peak lists; raw FID, prediction, and
  automatic assignment are outside the documented workflow.

## Development commands

Run application commands from `electron/`:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run package
```

Use `npm run verify:candidate` for the local release-candidate gate. Rebuild
WASM after Rust changes and package again before packaged Electron smoke tests.
