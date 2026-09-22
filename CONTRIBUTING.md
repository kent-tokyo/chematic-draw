# Contributing to chematic-draw

Thank you for improving the editor. Keep changes small, test the real boundary
they affect, and do not claim support beyond the documented chemistry contract.

## Setup

```bash
git clone https://github.com/<you>/chematic-draw.git
cd chematic-draw/electron
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack # once
npm run build:wasm
npm start
```

See [Build](docs/BUILD.md) for prerequisites and every verification command.

## Before opening a pull request

```bash
cd electron
npm run typecheck
npm run lint
npm test
git diff --check
```

Add renderer E2E when a visible interaction matters. For `main.js` or
`preload.js` changes, run `npm run package` followed by
`npm run test:e2e:electron`; browser tests cannot prove IPC behavior. Rebuild
WASM after changes under `crates/chem-wasm`.

## Project rules

- Use the `chematic::` umbrella re-export in Rust.
- Call `pushUndo()` immediately before the mutation it snapshots; avoid a
  second snapshot for the same interaction.
- Treat imported files and `settings.json` as untrusted input.
- Keep `window.electronAPI` narrow and typed in `renderer/electronApi.ts`.
- Preserve serialized DTO and public WASM names unless the change is explicitly
  versioned and migrated.
- Do not use native menu `role` actions for canvas operations; send a custom
  renderer command instead.

## Pull request content

Describe the user-visible change, tests run, format/undo/IPC impact, and any
remaining external gate. Keep unrelated formatting out of the change. Report
security issues through [SECURITY.md](SECURITY.md), not a public issue.

## Style

Use existing TypeScript/Rust formatting and naming. Prefer small pure helpers,
focused tests, and clear user-facing errors over broad abstractions. The
repository's [`AGENTS.md`](AGENTS.md) contains the authoritative local rules.
