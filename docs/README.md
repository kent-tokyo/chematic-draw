# Documentation

This directory documents the current application and its public contract. The
source code plus the Electron, Rust, and contract-package manifests remain
authoritative when a version or capability changes.

## Guides

- [Chinese README](../README_zh.md) — 简体中文项目介绍和快速开始
- [Japanese README](../README_ja.md) — 日本語のプロジェクト紹介と開始手順
- [Migration Guide](MIGRATION.md) — move workflows from other structure editors
- [Comparison](COMPARISON.md) — workflow-based chemical editor comparison
- [Search and Discoverability](DISCOVERABILITY.md) — canonical content and metadata plan
- [Quick Start](QUICK_START.md) — install a release or start from source
- [Build Guide](BUILD.md) — toolchain, WASM build, tests, and packaging
- [User Tutorial](TUTORIAL.md) — common editor workflows
- [API Reference](API.md) — the Rust/WASM bridge contract
- [Web Component](../packages/chematic-web/README.md) — Electron-free HTML embedding boundary
- [Known Limitations](KNOWN_LIMITATIONS.md) — release-scoped support and risk matrix
- [Format Interoperability](INTEROP.md) — supported formats and known loss
- [Release Readiness](RELEASE_READINESS.md) — evidence matrix for release gates
- [Architecture](ARCHITECTURE.md) — application structure and data flow
- [Troubleshooting](TROUBLESHOOTING.md) — common setup and runtime problems
- [CI/CD](CI_CD.md) — GitHub Actions and release artifacts

## Release state

The current tagged release is `v1.0.13` (2026-09-23). The application version
is defined in `electron/package.json` and `crates/chem-wasm/Cargo.toml`; CI
checks that they stay in sync.
This release pins the upstream `chematic` engine at v1.0.19. See the root
[`CHANGELOG.md`](../CHANGELOG.md) for the release contents and validation.

Changes under a future `Unreleased` section are not a tagged or published
release until commit, tag, workflow, and artifact evidence exist.

## Important boundaries

- The app is Electron-only; the former native Rust/egui application is gone.
- PubChem lookup is an exact InChIKey lookup, not similarity search, and needs
  internet access. ChemSpider is an Electron-only opt-in name lookup: the host
  needs an RSC API key and explicit attribution acknowledgement, and keeps the
  key out of renderer code and settings files.
- The DB panel includes an offline MCS comparison using the current molecule and
  a second SMILES input; the search is bounded and reports its result budget.
- Reaction diagnostics report structural consistency, not a mechanism,
  complete stoichiometry, or product prediction.
- Stereoisomer enumeration is heuristic and is not a complete CIP assignment.
- CDXML and RXN are bounded, loss-aware interchange paths. NMR accepts generic
  JSON and Bruker 1D peak lists, not raw FID or prediction workflows. See
  [INTEROP](INTEROP.md) and [Known Limitations](KNOWN_LIMITATIONS.md).

## Which document to read

- Installing or running the app: [Quick Start](QUICK_START.md)
- Developing, testing, or packaging: [Build Guide](BUILD.md)
- User workflows: [User Tutorial](TUTORIAL.md)
- Format support and loss behavior: [Format Interoperability](INTEROP.md)
- Public WASM and contract APIs: [API Reference](API.md)
- Release evidence and known gaps: [Release Readiness](RELEASE_READINESS.md)
- Problems during setup or use: [Troubleshooting](TROUBLESHOOTING.md)

The longer Architecture, CI/CD, Migration, Comparison, and Discoverability
documents are supporting references; they should not duplicate the current
support matrix in `INTEROP.md` or `KNOWN_LIMITATIONS.md`.

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
