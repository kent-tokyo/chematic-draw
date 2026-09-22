# Build and test

All application npm commands run from `electron/`; the repository root has no
`package.json`. The active chemistry binary is Rust compiled to WASM, not a
native desktop executable.

## Prerequisites

- Node.js 24 or newer
- current stable Rust, with `wasm32-unknown-unknown`
- `wasm-pack`
- Git; platform build tools required by Electron Forge

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw/electron
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack # once
```

## Daily development

```bash
npm run build:wasm # rebuild after crates/chem-wasm changes
npm start          # Vite + Electron with reload
```

`npm run build:wasm` writes the browser module to
`electron/src/renderer/wasm/pkg/`. Do not substitute a raw `wasm-pack build`:
its output directory is easy to place somewhere the application never loads.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e                 # renderer-only Chromium suite
npm run build:playground
npm run test:e2e:playground      # built Pages artifact
npm run package
npm run test:e2e:electron        # packaged app; run package first
npm run verify:candidate         # local release-candidate gate
npm run verify:ci                # candidate gate plus CI-oriented checks
```

Use focused Jest paths while iterating. Rebuild the WASM web target after Rust
changes and package again before Electron smoke tests; otherwise the smoke
suite can launch a stale or development bundle.

## Outputs and boundaries

| Output | Command | Purpose |
|---|---|---|
| WASM web module | `npm run build:wasm` | renderer and Playground chemistry |
| WASM Node module | `npm run build:wasm:test` | direct Node/WASM tests |
| Playground | `npm run build:playground` | static site under `electron/site` |
| packaged desktop app | `npm run package` | Electron Forge package, unsigned locally |

The package command is not a signed release. Signing, notarization, hosted CI,
and publication require external credentials and evidence; see
[Release Readiness](RELEASE_READINESS.md).

## Common failures

- **`wasm-pack` missing:** install it with `cargo install wasm-pack`.
- **WASM import missing:** rerun `npm run build:wasm` (or `build:wasm:test` for
  Node-oriented tests).
- **Electron smoke opens DevTools or fails its title check:** rerun
  `npm run package` before the smoke command.
- **Package cannot download Electron:** restore network access, then rerun the
  same package command; do not replace the downloaded binary manually.

For runtime and platform diagnostics, see [Troubleshooting](TROUBLESHOOTING.md).
