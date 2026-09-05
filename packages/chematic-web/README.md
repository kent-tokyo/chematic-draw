# `@chematic/web`

`@chematic/web` is the Electron-free Web Component boundary for embedding a
validated `Molecule` contract in an HTML page. It has no runtime dependencies
and does not load Electron APIs or perform network requests.

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
