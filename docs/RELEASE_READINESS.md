# Release readiness

This is the evidence matrix for the `0.9.2` release line. A checked
item means the repository contains an automated or reproducible local gate; it
does not mean a GitHub release or registry publication has happened.

| Priority | Area | State | Evidence / boundary |
|---|---|---|---|
| P0 | Reaction JSON v2, agents, coefficients, multi-step preservation, RXN loss gate | Ready for candidate | 2/5/20-step preservation corpus, identity/provenance checks, and typed multi-step RXN loss blocking pass locally. Full chemical balancing remains outside this gate. |
| P0 | CDXML writer, matrix, round-trip corpus | Ready for supported subset | Multi-page parser/writer round-trips page metadata and supported annotations; molecule corpus and loss boundaries pass. Upstream Presentation semantics remain externally gated by schematic #446. |
| P1 | Query atoms/bonds, SMARTS, Markush/R-group/polymer | Ready for bounded subset | Versioned query editor, WASM-backed worker matching, immutable Markush/polymer operations, deterministic bounded expansion, and preserve-or-reject tests pass. General upstream semantics remain externally gated by schematic #447. |
| P1 | Publication layout and SVG/PDF gates | Partial | Deterministic SVG/PDF and automatic collision/crossing/clipping gates pass; human review is still a release action. |
| P1 | Electron-free packages and consumer conformance | Ready for contract boundary | `packages/chematic-contract` is independently type-checked; HTML/React/Worker-shaped consumers and Chromium renderer E2E pass. Full visual UI extraction from Electron remains future work. |
| P2 | macOS/Windows signing and clean environment | Configured / pending secrets | Forge enables signing/notarization only with secret-backed credentials; local builds remain unsigned. `scripts/verify-clean-env.sh` provides a reproducible clean install/test gate. |

## Signing requirements

The signing workflow must provide Apple certificate/identity and notarization
credentials, or a Windows PFX certificate and password. Credentials must be
stored as repository or environment secrets and never committed. Checksums are
integrity evidence, not authenticity evidence.
