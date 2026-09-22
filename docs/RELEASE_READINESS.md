# Release readiness

This is the evidence matrix for the `1.0.13` release. “Ready” means a local,
reproducible gate exists; it never by itself proves a GitHub release, signed
artifact, or deployed site.

| Priority | Area | State | Evidence / boundary |
|---|---|---|---|
| P0 | Reaction JSON v2, agents, coefficients, multi-step preservation, RXN loss gate | Ready for candidate | 2/5/20-step preservation corpus, identity/provenance checks, and typed multi-step RXN loss blocking pass locally. Full chemical balancing remains outside this gate. |
| P0 | CDXML writer and fallback | Ready for supported subset | Supported multi-page data and safe source patches are covered; a fallback identifies affected page/object paths. Full ChemDraw presentation semantics remain out of scope. |
| P1 | Query atoms/bonds, SMARTS, Markush/R-group/polymer | Ready for bounded subset | Versioned query editor, WASM-backed worker matching, immutable Markush/polymer operations, deterministic bounded expansion, and preserve-or-reject tests pass. Upstream primitives are available; unrestricted query semantics remain outside the application subset. |
| P1 | Publication layout and SVG/PDF gates | Partial | Deterministic SVG/PDF, wrapped routes, and automatic geometry gates pass; human visual review remains a release action. |
| P1 | Electron-free packages and consumer conformance | Ready for contract boundary | `packages/chematic-contract` is independently type-checked; HTML/React/Worker-shaped consumers and Chromium renderer E2E pass. Full visual UI extraction from Electron remains future work. |
| P0 | Runtime dependency security audit | Ready for candidate | Nightly blocks on `npm audit --omit=dev --audit-level=moderate`; the full development-tool audit remains a visible non-blocking report while Forge transitive remediation would require a major downgrade. |
| P1 | Packaged Electron smoke | Ready for candidate gate | Packaged smoke covers menus, IPC, recovery, clipboard, settings, PDF, and the ChemSpider host boundary on macOS arm64. Cross-platform evidence remains workflow-dependent. |
| P2 | NMR and ChemSpider | Partial | Bruker 1D peak-list import and main-process-only opt-in ChemSpider name lookup have mocked/local gates. Vendor corpus, RSC account/terms, live rate limits, and provider staging evidence remain external. |
| P2 | macOS/Windows signing and clean environment | Configured / pending secrets | Forge enables signing/notarization only with secret-backed credentials; local builds remain unsigned. `scripts/verify-clean-env.sh` provides a reproducible clean install/test gate. |

## Signing requirements

The signing workflow must provide Apple certificate/identity and notarization
credentials, or a Windows PFX certificate and password. Credentials must be
stored as repository or environment secrets and never committed. Checksums are
integrity evidence, not authenticity evidence.
