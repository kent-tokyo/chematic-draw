# `@chematic/web`

`@chematic/web` is the Electron-free Web Component boundary for embedding a
validated `Molecule` contract in an HTML page. It depends only on the separate
`@chematic/contract` package and does not load Electron APIs or perform network
requests.

```html
<script type="module" src="./schematic-web.js"></script>
<chematic-molecule aria-label="Caffeine"></chematic-molecule>
<script type="module">
  const view = document.querySelector('chematic-molecule');
  view.molecule = { atoms: [], bonds: [] };
</script>
```

The current boundary is deliberately read-only: it validates finite atom/bond
data and renders an accessible SVG surface. Editing, parsing, and chemistry
analysis remain explicit host responsibilities until the contract is published
as a stable standalone package.

The `@chematic/web/worker` entrypoint exposes the same validation and rendering
without DOM or Electron globals:

```ts
import { handleMoleculeWorkerRequest } from '@chematic/web/worker';
const response = handleMoleculeWorkerRequest({ type: 'validate', molecule });
```

Use `@chematic/web/worker-entry` as the module URL for a dedicated browser
Worker. It installs the request-ID protocol handler and replies with the
validated render/serialize result; it has no DOM or Electron dependency.

Use `@chematic/web/worker-client` when the host owns a browser Worker. The
client adds request IDs, timeout and abort rejection, worker-error propagation,
and idempotent disposal; it does not create a Worker or select a WASM binary.

The `@chematic/web/react` entrypoint is a React-compatible, runtime-free props
adapter. A wrapper can pass its result to `<chematic-molecule>` without
coupling this package to a particular React version.

The `@chematic/web/editor` entrypoint provides immutable, headless atom/bond
edits. It validates the resulting molecule and is suitable for a React wrapper
or a Worker command layer.

The `@chematic/web/editor-element` entrypoint provides an explicitly opt-in
`<chematic-molecule-editor>` custom element. Hosts own the controls and call
`applyEdit`; accepted edits emit `molecule-change`, while invalid or read-only
edits emit `schematic-error`. It also exposes bounded `canUndo`/`canRedo`,
`undo()`, `redo()`, and `dispose()` lifecycle methods. The original
`<chematic-molecule>` element stays read-only. This surface does not parse
chemistry, infer reactions, or load Electron/network dependencies.

Pointer drawing is opt-in with `interaction="draw"`: an empty-space click adds
a carbon atom and dragging between two atoms adds a single bond. The default
interaction is inert, and invalid edits still emit `schematic-error`.
