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

`<chematic-molecule>` is deliberately read-only. It validates IDs, references,
bond orders, and stereo values, then renders accessible SVG. Parsing and
chemistry analysis remain host responsibilities. For bounded edits, opt in to
the separate `<chematic-molecule-editor>` entrypoint.

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

`edit-batch` applies at most 256 validated edits atomically. `summarize`
returns formula, atom/bond counts, formal charge, connected components, and an
approximate molecular weight when all elements are in its local table.

`@chematic/web/worker-entry` installs the browser Worker request-ID handler;
`worker-client` supplies IDs, timeouts, abort handling, error propagation, and
idempotent disposal. `@chematic/web/react` is a runtime-free props adapter.
`@chematic/web/editor` provides immutable, validated atom/bond edits for a
wrapper or Worker command layer.

`@chematic/web/editor-element` provides the opt-in
`<chematic-molecule-editor>`. Hosts can call `applyEdit` or atomic bounded
`applyEdits`, or enable pointer drawing with `interaction="draw"`. Its `tool`
is `draw`, `atom`, `bond`, or `erase`; `atom-element` and `bond-order` select
the mutation. Accepted edits emit one bubbling, composed `molecule-change`;
invalid or read-only edits emit `schematic-error`.

The element exposes bounded history (`canUndo`, `canRedo`, `undo`, `redo`),
`serialize`, `validate`, and `dispose`. Pointer drawing and keyboard history
(`keyboard="edit"`) are opt-in. A failed batch leaves the molecule and history
unchanged. This surface neither parses chemistry nor loads Electron or network
dependencies.
