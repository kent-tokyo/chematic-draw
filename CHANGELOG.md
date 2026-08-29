# Changelog

All notable changes to chematic-draw are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-06-10

### Added
- **3D Molecular Viewer** — Canvas 2D-based 3D visualization with rotation, zoom, and export
  - Orthographic projection with depth sorting
  - CPK color scheme with VDW radius-based visualization
  - Mouse interaction (drag to rotate, scroll to zoom)
  - XYZ file export for computational chemistry software

- **Property Prediction** — Molecular descriptor calculation
  - Molecular weight and formula
  - LogP (lipophilicity)
  - TPSA (topological polar surface area)
  - Hydrogen bond donors/acceptors
  - Rotatable bond count
  - Synthetic Accessibility (SA) score
  - ESOL solubility prediction
  - PAINS alert detection
  - Lipinski's Rule of Five evaluation

- **Reaction Mechanism Visualization** — Step-by-step reaction display
  - SN1, SN2, E1, E2, Addition mechanism types
  - Automatic reaction classification
  - Atom mapping with color coding (persistent/new/leaving/spectator)
  - Electron flow visualization
  - Multi-step navigation with annotations

- **Stereoisomer Enumeration** — Chiral center detection and visualization
  - Automatic R/S configuration assignment
  - Enumeration of all stereoisomers (2^n combinations)
  - Wedge/dash bond visualization
  - Stereochemistry notation support

- **Similarity Search** — Molecular database comparison
  - ECFP4 fingerprint generation
  - Tanimoto similarity calculation
  - Dice coefficient similarity
  - Maximum Common Substructure (MCS) detection
  - Similarity-based molecule search

- **Batch Operations** — Process multiple molecules efficiently
  - Batch 3D coordinate generation
  - Parallel property prediction
  - Configurable batch parameters
  - Progress tracking and result export

- **Performance Optimization** — profiling tools
  - WASM memory profiler
  - Performance benchmark suite
  - Scaling analysis (O(n) verification)

- **Comprehensive Documentation** — 7 guides totaling 3,165 lines
  - Quick Start (5-minute onboarding)
  - User Tutorial (detailed feature walkthroughs)
  - API Reference (WASM functions)
  - Build Guide (development setup)
  - Architecture (system design)
  - CI/CD Documentation
  - Troubleshooting guide

- **CI/CD Pipeline** — Automated testing and release
  - GitHub Actions workflows for test, build, release, nightly
  - Cross-platform builds (Linux/macOS/Windows)
  - Automated testing on PR/push
  - Code coverage tracking (Codecov)
  - Automatic GitHub release creation

- **Contributor Guidelines** — CONTRIBUTING.md (600+ lines)
  - Development workflow
  - Code style guidelines
  - Testing requirements
  - Commit message conventions
  - Pull request process

### Changed
- Updated chematic dependency from 0.1.36 → 0.1.40
- Improved Canvas rendering performance (14ms frame budget)
- Refactored state management with Zustand store memoization
- Enhanced WASM bridge error handling

### Fixed
- Fixed infinite re-render loop in component state selectors
- Corrected WASM Cargo.toml version mismatch (0.1.23 → 0.1.40)
- Fixed ArrowTypeDialog JSX syntax error (colon → equals)
- Fixed MechanismStep import path (types.ts → advancedFeatures.ts)
- Fixed SVG export metrics (replaced placeholders with actual values)
- Fixed 3D coordinate API signature mismatches
- Fixed fingerprint serialization (BitVec2048 → hex format)
- Fixed run_reactants SMIRKS API signature (string parameter)

### Removed
- Removed emoji icons from UI (per OS standard guidelines)

### Performance
- 3D generation: <500ms for <50 atoms, <2s for 100-500 atoms
- Fingerprint generation: <100ms
- Similarity calculation: <10ms
- Canvas rendering: 14ms (60 FPS)
- Memory: <50MB per 3D generation

---

## [0.2.2-rc.1] - 2026-08-28 (pre-release)

### Added
- Real WASM contract tests (compiled binary, not mocks) and a full
  native + WASM/Electron capability audit
- Fingerprint result metadata (`get_fingerprint_with_metadata`)
- Reaction errors now distinguish invalid-SMIRKS from unsupported-chemistry
- Real WASM performance benchmark suite (calls the actual WASM binary —
  parse, canonical SMILES, fingerprint, similarity, MCS, layout,
  validation, 3D — against a fixed molecule corpus)
- Explicit WASM init state machine (`idle`/`loading`/`ready`/`failed`)
  with an app-wide startup boundary and a real error panel on failure
- Per-OS release checksums (`SHA256SUMS-<OS>.txt`) published with every
  release

### Fixed
- `AtomDto.element` now returns the real chemistry element symbol
  instead of a rendering label, so `parse_any()`'s own output can be fed
  back into other WASM functions
- Aromatic N bearing an explicit H (e.g. pyrrole's `[nH]`) now round-trips
  with the correct implicit-hydrogen count and molecular formula
- `validate_molecule`'s JSON serialization bug that made every
  `InspectorPanel` validation call silently report zero errors
- Lipinski / Property Prediction / Research / 3D Viewer panels no longer
  display a caught WASM failure as a valid or empty result
- Infinite render loop in the molecule canvas (Zustand selector returning
  a new object on every call)
- `InspectorPanel` crash from a WASM-not-ready race condition
- Sidebar collapsing to ~1px under certain window sizes
- DevTools no longer opens unconditionally in packaged builds
- CI: Node.js unified to 24 everywhere, a real `tsc --noEmit` typecheck
  now runs (previously untyped), coverage thresholds scoped to modules
  that actually have tests, E2E suite redesigned around real browser/
  Electron launches instead of loose selectors that tolerated breakage
- `CONTRIBUTING.md`'s upstream remote corrected to the real repository

### Changed
- Vite pinned to `7.3.6` exact (Vite 8's bundler isn't yet compatible
  with the current Electron Forge / `vite-plugin-top-level-await`
  toolchain)

---

## [0.1.0] - 2026-05-15

### Added
- Initial Electron + React framework
- 2D molecular structure editor
- Canvas-based drawing with atoms and bonds
- SMILES input/output
- File save/load functionality
- Sidebar panels (Inspector, Templates)
- Keyboard shortcuts
- Dark mode support

---

## Unreleased

Development target since 2026-08-29: the Electron app in `electron/` only
— the native Rust/egui app (`crates/chem-ui`/`chem-io`) is frozen, not
deleted, and receives no further feature work.

### Added (toward v0.3.0 "Reliable Chemical Editor")
- Chemistry validation beyond basic valence: real valence errors,
  connected-component disconnection detection, antiaromatic-ring warnings
- Deterministic layout with golden-SVG regression tests
- Verified format-interoperability matrix (`docs/INTEROP.md`)
- Reaction-scheme state unified onto a single store (previously split
  across two disconnected state trees, silently leaving atom mapping /
  reaction classification / green-chemistry metrics dead in the shipped UI)
- Isotope support end-to-end (Inspector input, canvas label, round-trips
  through SMILES/CML; MOL V2000/SDF drop it — an upstream writer
  limitation, not this bridge's)
- PNG export
- `SECURITY.md` and download-checksum verification instructions

### Fixed
- Mechanism arrows becoming invisible once a reaction scheme existed
- Dead "Export as MOL V2000" / "Export as SMILES" menu items (main
  process sent the IPC event; nothing in the renderer ever listened)
- Context menu's "Charge +1"/"Charge -1" (previously `console.log`
  no-ops); removed the non-functional "Set Element" stub rather than
  leaving a button that opened nothing
- 7 leftover placeholder `github.com/yourusername/...` URLs across docs

### Documentation
- Removed fabricated features from BUILD/CI_CD/QUICK_START/TUTORIAL/
  ARCHITECTURE that never existed: a double-click property editor, an
  SN2-dropdown mechanism wizard, WebWorker-offloaded 3D generation, a
  code-signing/notarization CI step, fictional stores and components
- Root README now points readers at the actively-developed Electron app

### Next (v0.4.0+, not started)
Per `internal_docs/ROADMAP.md`, in rough priority order:
- yomitoki / RENKIN integration (blocked — no local access to either
  project yet; needs their current API surface understood first)
- v0.5.0 advanced document semantics (R-groups, S-groups, Markush,
  multi-page, plugins) — plugin support in particular is a public-API
  commitment that needs its own design pass
- Materials track (mikiwame/gugen/kizashi) — blocked on a dedicated
  crystal document model, deliberately not started
- v1.0 gates: stable APIs, verified installers, and a migration policy
  remain unmet (checksums and a security policy are done, see above)

**No longer planned** — web/browser version, real-time collaborative
editing, cloud storage sync, AR/VR support, and built-in ML model
integration were previously listed here but are explicitly out of scope
per the current roadmap's "Explicitly deferred" list, not near-term plans.

---

## Guidelines for Reporting Changes

When submitting changes, please:

1. **Update CHANGELOG.md** in your PR
2. **Categorize** using: Added, Changed, Fixed, Removed, Deprecated
3. **Link** to related issues (#123)
4. **Mention** performance impact if applicable
5. **Note** breaking changes prominently

### Format Example

```markdown
### Added
- Feature X (brief description)
  - Sub-feature 1
  - Sub-feature 2
  - Performance: <10ms

### Fixed
- Issue #123: Description of fix
```

---

## Release Process

### Version Numbering
- **MAJOR.MINOR.PATCH** (e.g., 0.2.1)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Steps to Release
1. Update CHANGELOG.md with new version
2. Update version in `electron/package.json`
3. Commit: `chore: Bump version to x.y.z`
4. Create tag: `git tag vx.y.z`
5. Push tag: `git push origin vx.y.z`
6. GitHub Actions auto-builds and creates release

### Pre-releases
Tag with suffix for testing:
- `v0.3.0-alpha.1` — Early development
- `v0.3.0-beta.1` — Feature complete, testing
- `v0.3.0-rc.1` — Release candidate

---

## Deprecation Policy

Deprecated features are:
1. **Announced** in CHANGELOG.md
2. **Documented** in code with `@deprecated`
3. **Supported** for at least 2 minor versions
4. **Removed** in next MAJOR version

---

## Support Timeline

| Version | Release | Status | Support Ends |
|---------|---------|--------|--------------|
| 0.2.x | 2026-06-10 | Current | 2026-12-10 |
| 0.3.x | 2026-12-31 | Planned | 2027-06-30 |
| 0.4.x | 2027-06-30 | Planned | 2027-12-31 |
| 0.1.x | 2026-05-15 | EOL | 2026-06-10 |

---

## Acknowledgments

### Contributors
- [List of contributors](https://github.com/kent-tokyo/chematic-draw/graphs/contributors)

### Dependencies
- [chematic](https://github.com/rapodaca/chematic) — Chemistry library
- [Electron](https://www.electronjs.org/) — Desktop framework
- [React](https://react.dev/) — UI framework

---

For questions about changelog, see [CONTRIBUTING.md](./CONTRIBUTING.md).
