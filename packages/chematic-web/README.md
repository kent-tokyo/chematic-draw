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

The `<chematic-molecule>` viewer remains deliberately read-only: it validates
the full public molecule contract, including unique IDs, references, bond
orders, and stereo values, then renders an accessible SVG surface. Editing is
available only through the separate, explicitly opt-in
`<chematic-molecule-editor>` entrypoint described below; parsing and chemistry
analysis remain explicit host responsibilities.

The `@chematic/web/worker` entrypoint exposes the same validation, rendering,
serialization, and immutable validated edits without DOM or Electron globals:

```ts
import { handleMoleculeWorkerRequest } from '@chematic/web/worker';
const response = handleMoleculeWorkerRequest({ type: 'validate', molecule });
const summary = handleMoleculeWorkerRequest({ type: 'summarize', molecule });
const edited = handleMoleculeWorkerRequest({
  type: 'edit', molecule,
  edit: { type: 'update-atom', atomId: 1, updates: { charge: 1 } },
});
const editedBatch = handleMoleculeWorkerRequest({
  type: 'edit-batch', molecule,
  edits: [
    { type: 'update-atom', atomId: 1, updates: { charge: 1 } },
    { type: 'update-atom', atomId: 1, updates: { display_label: 'N+' } },
  ],
});
```

`edit-batch` applies at most 256 validated edits as one worker request. A
failed edit rejects the whole request and never mutates the input molecule.
The `summarize` operation returns deterministic formula, atom/bond counts,
formal charge, connected-component count, and an approximate molecular weight
when all elements are in the dependency-free weight table.

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
edits, including element/charge/isotope/coordinate and bond order/stereo
updates. It validates the resulting molecule and is suitable for a React
wrapper or a Worker command layer.

The `@chematic/web/editor-element` entrypoint provides an explicitly opt-in
`<chematic-molecule-editor>` custom element. Hosts own the controls and call
`applyEdit` or the atomic, bounded `applyEdits` batch method; accepted edits
emit one `molecule-change` event, while invalid or read-only edits emit
`schematic-error`. It also exposes bounded `canUndo`/`canRedo`, `undo()`,
`redo()`, `serialize()`, `validate()`, and `dispose()` lifecycle methods. A
failed batch leaves the molecule and history unchanged. The original
`<chematic-molecule>` element stays read-only. This surface does not parse
chemistry, infer reactions, or load Electron/network dependencies.

Pointer drawing is opt-in with `interaction="draw"`: an empty-space click adds
a carbon atom and dragging between two atoms adds a single bond. The default
interaction is inert, and invalid edits still emit `schematic-error`.

Keyboard history is opt-in with `keyboard="edit"`. The element becomes
focusable and supports Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, and Ctrl/Cmd+Y for the
validated bounded history. Read-only mode disables these mutations.

Editor changes and errors bubble and are composed, so an embedding host can
observe them from a wrapper element or across a shadow-DOM boundary.
