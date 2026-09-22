# Troubleshooting

Start with the smallest reproducible command. Run all npm commands inside
`electron/`.

| Symptom | Check / remedy |
|---|---|
| `npm` or Node missing | Install Node 24+, reopen the terminal, then run `node --version`. |
| `wasm-pack` missing | `cargo install wasm-pack`; add the WASM target with `rustup target add wasm32-unknown-unknown`. |
| WASM import/module missing | Run `npm run build:wasm`; use `npm run build:wasm:test` only for Node-target tests. |
| Electron fails at startup | Run `npm run package` again, then inspect the first terminal error. Do not test packaged smoke against a dev bundle. |
| Type/lint failure | Run `npm run typecheck` and `npm run lint` separately; fix the first reported error. |
| renderer E2E failure | Run the named Playwright test once, inspect its trace/report, and distinguish browser-only behavior from Electron IPC. |
| packaged smoke failure | Repackage first; then run `npm run test:e2e:electron`. This is the only suite that proves main/preload IPC. |
| CDXML/RXN output differs | Consult [Interop](INTEROP.md). Keep the original source or reaction JSON when a loss warning appears. |
| NMR input rejected | Use contract JSON or a Bruker 1D peak list with a nucleus header and numeric peak rows. Raw FID and processed spectra are unsupported. |
| ChemSpider disabled | This is expected without `CHEMSPIDER_API_KEY` and `CHEMSPIDER_ATTRIBUTION_ACCEPTED=true` in the Electron host environment. The Playground never enables it. |

## Before filing an issue

Include the app version, platform, command or UI steps, expected and actual
behavior, a minimal non-sensitive input, and the first relevant error. Do not
include API keys, private structures, or unredacted user-data files.

For security reports, use [SECURITY.md](../SECURITY.md), not a public issue.
