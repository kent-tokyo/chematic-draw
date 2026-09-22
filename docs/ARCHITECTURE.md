# Architecture

chematic-draw is an Electron desktop editor with a React renderer and a Rust
chemistry engine compiled to WebAssembly. The only active Rust crate is
`crates/chem-wasm`; the root has no native Rust application.

```text
Electron main (main.js)
  file dialogs, native menu, trusted IPC, host-only provider secrets
        ↕ preload.js / typed electronApi.ts
React renderer (renderer.tsx)
  canvas, panels, hooks, Zustand document/UI stores
        ↕ wasmBridge.ts and bounded analysis workers
Rust/WASM (crates/chem-wasm)
  parsing, conversion, fingerprints, MCS, reactions, coordinates, adapters
```

## Main boundaries

| Area | Owns | Rule |
|---|---|---|
| `src/main.js` | OS windows, menu, file and privileged IPC | Validate every renderer input; expose narrow handlers only. |
| `src/preload.js` | `window.electronAPI` | Keep it synchronized with `renderer/electronApi.ts`; never expose a generic IPC or filesystem API. |
| `src/renderer.tsx` | application composition | Feature behavior belongs in hooks and panels, not long menu closures. |
| Zustand stores | molecule, canvas, UI, mechanisms, reactions | Call `pushUndo()` immediately before a mutation. |
| `renderer/lib` | pure document, export, layout, interop helpers | Preserve typed DTO and serialized-document compatibility. |
| `renderer/workers` | cancellable expensive analysis | Reject unknown operations and discard stale results. |
| `crates/chem-wasm` | public WASM bridge | Use `chematic::` umbrella re-exports, then retain stable bridge names. |

## Documents and formats

`MoleculeDto` is the editable 2D model. Session bundles, reaction JSON, query
documents, NMR spectra, and rich CDXML sessions are distinct contracts; do not
silently flatten one into another. Format loss is handled at export boundaries
and documented in [Interop](INTEROP.md).

The Web Component package is deliberately Electron-free. Its viewer is
read-only; its separate editor offers bounded immutable edits and has no
parsing, analysis, or network authority.

## Security and reliability

- `settings.json` and imported documents are user-controlled data: validate
  their shape before use.
- Main-process provider keys stay in host environment variables. The renderer
  can obtain status/results, never a credential or generic network primitive.
- Canvas resize clears its buffer, so resizing must trigger rendering.
- Native menu roles do not control a canvas editor. Canvas commands use custom
  menu click handlers and renderer subscriptions.

## Verification map

| Change | Minimum evidence |
|---|---|
| pure helper/contract | focused Jest test |
| renderer behavior | Jest plus renderer E2E where interaction matters |
| main/preload/OS flow | package then Electron smoke |
| Rust bridge | Rust tests, rebuild WASM when browser behavior changes |
| shared candidate | `npm run verify:candidate` |

Source and tests are authoritative for this overview. See [Build](BUILD.md)
for commands and [`AGENTS.md`](../AGENTS.md) for repository-specific traps.
