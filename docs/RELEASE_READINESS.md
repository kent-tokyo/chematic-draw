# Release readiness

This is the evidence matrix for the fixed `0.9.0` development line. A checked
item means the repository contains an automated or reproducible local gate; it
does not mean a GitHub release or registry publication has happened.

| Priority | Area | State | Evidence / boundary |
|---|---|---|---|
| P0 | Reaction JSON v2, agents, coefficients, multi-step preservation, RXN loss gate | Partial | JSON v2 and loss-blocking RXN tests pass; full 2/5/20-step corpus remains open. |
| P0 | CDXML writer, matrix, round-trip corpus | Partial | Single-fragment parser-backed corpus plus multi-page/page-attribute writer tests pass; upstream parser compatibility and advanced ChemDraw semantics remain open. |
| P1 | Query atoms/bonds, SMARTS, Markush/R-group/polymer | Partial | Versioned query editor, WASM-backed worker matching, and typed preserve-or-reject boundary pass; direct Rust AST serialization and full special-chemistry semantics remain open. |
| P1 | Publication layout and SVG/PDF gates | Partial | Deterministic SVG/PDF and automatic collision/crossing/clipping gates pass; human review is still a release action. |
| P1 | Electron-free packages and consumer conformance | Partial foundation | Added dependency-free `packages/chematic-contract`; renderer still consumes its local adapter and full HTML/React/Worker conformance remains open. |
| P2 | macOS/Windows signing and clean environment | Configured / pending secrets | Forge enables signing/notarization only with secret-backed credentials; local builds remain unsigned. `scripts/verify-clean-env.sh` provides a reproducible clean install/test gate. |

## Signing requirements

The signing workflow must provide Apple certificate/identity and notarization
credentials, or a Windows PFX certificate and password. Credentials must be
stored as repository or environment secrets and never committed. Checksums are
integrity evidence, not authenticity evidence.
