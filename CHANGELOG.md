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
  - Performance optimized with WebWorker offloading

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

- **Performance Optimization** — WebWorker and profiling tools
  - WebWorker for Canvas rendering offload
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

### Planned for v0.3.0
- Web version (browser-based)
- Real-time collaborative editing
- Cloud storage integration
- Advanced NMR prediction
- Metabolic stability models
- Retrosynthetic analysis

### Planned for v0.4.0
- WebGL-based rendering
- Augmented Reality (iOS/Android)
- Virtual Reality support
- Extended property prediction
- Plugin system

### Planned for v0.5.0+
- Machine learning integration
- Mobile native apps
- Jupyter notebook support
- Community contribution marketplace

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
- [List of contributors](https://github.com/yourusername/chematic-draw/graphs/contributors)

### Dependencies
- [chematic](https://github.com/rapodaca/chematic) — Chemistry library
- [Electron](https://www.electronjs.org/) — Desktop framework
- [React](https://react.dev/) — UI framework

---

For questions about changelog, see [CONTRIBUTING.md](./CONTRIBUTING.md).
