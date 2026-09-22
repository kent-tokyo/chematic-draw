# Changelog

Notable user-visible changes. Dates use ISO 8601. The complete historical
record remains available through the Git log and release tags.

## 1.0.13 — 2026-09-23

- Split renderer responsibilities behind typed Electron APIs without changing
  undo or serialized-document contracts.
- Added 55 categorized templates, deterministic wrapped reaction-scheme layout,
  and CDXML fallback warnings naming affected page/object paths.
- Added Bruker 1D peak-list NMR import with provenance, manual annotations,
  and JSON export.
- Added Electron-main-process-only, opt-in ChemSpider name lookup with bounded
  results, in-memory caching, and rate-limit errors. Keys are never persisted
  or returned to the renderer.
- Expanded the opt-in Web Component editor with atom, bond, and erase pointer
  tools.
- Reworded reaction results as structural consistency rather than chemical
  verification. Mechanism correctness, complete stoichiometry, and product
  prediction remain outside scope.
- Updated GitHub Actions to Node 24-compatible artifact and Pages actions.

## 1.0.12 — 2026-09-22

- Added the ChemDraw-familiar workspace: canonical menus, left drawing tools,
  templates, right Properties/Query/Stereo panels, familiar/compact profiles,
  and persisted workspace chrome.
- Added real Electron and browser document actions, object arrangement, and
  task-based migration guidance.
- Local validation at release time: Rust 30/30, Jest 465 passed (6 skipped),
  renderer E2E 114/114, Playground E2E 1/1, and Electron smoke 28/28.

## 1.0.11 — 2026-09-22

- Introduced the shared desktop/browser workspace and migration-oriented menu
  geography, drawing palette, Inspector, and profiles.
- Added session-bundle migration hardening, explicit document-format loss
  boundaries, and candidate/CI checks.

## 1.0.10 — 2026-09-10

- Stabilized the Electron, WASM, package, and test pipeline for the 1.0 line.

## Earlier releases

Versions 0.1.0–1.0.9 established the Electron/React/Rust-WASM editor,
format adapters, query/reaction/3D tools, tests, and release workflow. Use
`git log -- CHANGELOG.md`, repository tags, and GitHub Releases when a
historical release-level detail is required.
