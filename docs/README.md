# Documentation

This directory documents the current Electron application. The source code and
the two manifests remain authoritative when a version or capability changes.

## Guides

- [Chinese README](../README_zh.md) — 简体中文项目介绍和快速开始
- [Migration Guide](MIGRATION.md) — move workflows from other structure editors
- [Comparison](COMPARISON.md) — workflow-based chemical editor comparison
- [Search and Discoverability](DISCOVERABILITY.md) — canonical content and metadata plan
- [Quick Start](QUICK_START.md) — install a release or start from source
- [Build Guide](BUILD.md) — toolchain, WASM build, tests, and packaging
- [User Tutorial](TUTORIAL.md) — common editor workflows
- [API Reference](API.md) — the Rust/WASM bridge contract
- [Known Limitations](KNOWN_LIMITATIONS.md) — release-scoped support and risk matrix
- [Format Interoperability](INTEROP.md) — supported formats and known loss
- [Release Readiness](RELEASE_READINESS.md) — evidence matrix for release gates
- [Architecture](ARCHITECTURE.md) — application structure and data flow
- [Troubleshooting](TROUBLESHOOTING.md) — common setup and runtime problems
- [CI/CD](CI_CD.md) — GitHub Actions and release artifacts

## Current release

The current tagged release is `v0.9.2` (2026-09-04). The application version
is defined in `electron/package.json` and `crates/chem-wasm/Cargo.toml`; CI
checks that they stay in sync.

## Important boundaries

- The app is Electron-only; the former native Rust/egui application is gone.
- PubChem lookup is an exact InChIKey lookup, not similarity search, and needs
  internet access. ChemSpider is present in the selector but not implemented.
- The DB panel includes an offline MCS comparison using the current molecule and
  a second SMILES input; the search is bounded and reports its result budget.
- Stereoisomer enumeration is heuristic and is not a complete CIP assignment.
- CDXML supports a bounded writer subset; RXN V2000, XYZ, and PDB are import/export
  capabilities limited as described in [INTEROP](INTEROP.md).

## Development commands

Run these from `electron/`:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run package
```

See [CONTRIBUTING.md](../CONTRIBUTING.md) before opening a pull request.
