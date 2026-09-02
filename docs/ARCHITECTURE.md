# Architecture Guide

High-level system design and component structure for chematic-draw.

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Component Architecture](#component-architecture)
4. [State Management](#state-management)
5. [WASM Integration](#wasm-integration)
6. [Data Flow](#data-flow)
7. [Performance Considerations](#performance-considerations)
8. [Design Decisions](#design-decisions)

---

## System Overview

chematic-draw is a **desktop chemistry application** built with Electron, React, and WASM.

```
┌─────────────────────────────────────────┐
│        Electron Main Process            │
│  (File I/O, Window Management, IPC,     │
│   native menu bar — main.js)            │
└──────────────┬──────────────────────────┘
               │ IPC (preload.js's window.electronAPI)
┌──────────────▼──────────────────────────┐
│      Electron Renderer Process          │
│  (React UI, Canvas, Interactions)       │
├──────────────────────────────────────────┤
│  React Components (Sidebar, Canvas)     │
│  Zustand State Stores                   │
│  Event Handlers (Keyboard, Mouse)       │
└──────────────┬──────────────────────────┘
               │ synchronous calls, no worker/async
               │ indirection (wasmBridge.ts)
        ┌──────▼───────────┐
        │  WASM Module     │
        │ (Chemistry Ops)  │
        └──────────────────┘
```

There is no WebWorker layer — 3D coordinate generation and every other WASM
call run synchronously on the main (renderer) thread, called directly from
`wasmBridge.ts`. (Verified: zero `new Worker(...)` calls anywhere in
`electron/src/renderer`.)

### Key Layers

1. **Desktop (Electron)**
   - File management
   - Native window integration
   - IPC message passing

2. **UI (React)**
   - Interactive canvas
   - Sidebar panels
   - Modal dialogs
   - Real-time feedback

3. **State (Zustand)**
   - Molecule state
   - Canvas/tool state
   - UI state
   - Mechanism-arrow state
   - Reaction scheme state

4. **Computation (WASM/Rust)**
   - SMILES/MOL/SDF/CML/CDXML parsing
   - 3D coordinate generation
   - Fingerprint calculation
   - Reaction execution (SMIRKS)
   - Property prediction

---

## Technology Stack

| Layer | Technology | Purpose | Version |
|-------|-----------|---------|---------|
| **Desktop** | Electron | Cross-platform app shell | 44.0.0 |
| **UI Framework** | React | Component-based UI | 19.2.8 |
| **Styling** | Inline styles | No CSS/Tailwind framework | — |
| **State** | Zustand | Lightweight store | 5.0.15 |
| **Canvas** | Canvas 2D API | 2D drawing, 3D projection | Native |
| **Chemistry Engine** | chematic (Rust) | Molecule operations | 0.35.0 (`v0.35.0`) |
| **WASM** | wasm-bindgen | Rust → JavaScript bridge | via wasm-pack |
| **Build** | Vite | Bundler and dev server | 7.3.6 (pinned exact — see Round 1 CI notes) |
| **WASM Build** | wasm-pack | Rust → WASM compilation | 0.13.x |
| **Testing** | Jest | Unit testing | ^30.4.2 |
| **E2E Testing** | Playwright | Browser automation | ^1.62.1 |
| **Benchmarking** | `wasmPerformance.bench.ts` (`npm run test:perf`) | Real-WASM performance suite | Built-in |
| **Node** | Node.js | Runtime | 24 (`.nvmrc`, `engines.node`) |

("Styling" was previously listed as CSS/Tailwind — there is no Tailwind
dependency or CSS framework; components use inline `style={{...}}` objects
throughout.)

---

## Component Architecture

### React Components

The real component tree is flatter than a typical "App → MenuBar →
MainWindow" nesting — `electron/src/renderer.tsx`'s single `App()` function
renders everything directly. The **native OS menu bar** (File/Edit/View/
Tools, with New/Open/Save/Export/Zoom/etc.) is a separate thing entirely: it
lives in `electron/src/main.js` (Electron's `Menu.buildFromTemplate`, main
process) and talks to the React tree only via IPC events that `App()`
subscribes to — it is not a React component.

```
App (renderer.tsx)
├── Toolbar (inline in App — tool buttons, theme toggle, status)
├── MoleculeCanvas
│   └── 2D structure editor (CanvasRenderer.ts does the actual drawing)
├── Sidebar
│   ├── InspectorPanel — atom/bond properties
│   ├── TemplatesPanel — molecule templates
│   ├── ReactionPanel — SMIRKS-template reaction execution + scheme steps
│   ├── BatchResultPanel — batch operation results
│   ├── StereoisomerPanel — chirality enumeration
│   ├── LipinskiPanel — drug-likeness scoring
│   ├── PropertyPredictionPanel — molecular descriptors
│   ├── MechanismPanel — manual electron-pushing-arrow drawing
│   ├── Viewer3DPanel — 3D molecular structure
│   ├── DatabaseSearchPanel — PubChem/ChemSpider search
│   ├── ResearchPanel — (present in the real tab list; doc's old
│   │   component tree omitted this one entirely)
│   └── ChatPanel — info display
├── ContextMenu — right-click menu (atom/bond/empty-canvas, selection-sensitive)
├── ShortcutsModal — keyboard shortcuts reference (doc's old tree omitted this)
├── UndoTimelineModal — undo/redo history
├── ArrowTypeDialog — electron-flow arrow type picker (mounted inside MechanismPanel)
└── BatchProcessDialog — batch operation configuration (conditionally rendered)
```

Sidebar tabs, in the real order (`Sidebar.tsx`): Inspector, Templates,
Reactions, Batch, Stereo, Lipinski, Props, Mech, 3D, DB, Research, Chat (12
tabs, not the ~10 the old tree implied).

### Component Responsibilities

| Component | Purpose | State Management |
|-----------|---------|------------------|
| **MoleculeCanvas** | 2D structure editor | moleculeStore + canvasStore |
| **Sidebar** | Panel container | uiStore |
| **InspectorPanel** | Atom/bond details | uiStore (`selectedAtomIdForInspector`/`selectedBondIdForInspector`) + moleculeStore for live document data and mutations |
| **Viewer3DPanel** | 3D visualization | Local component state + WASM |
| **ReactionPanel** | Reaction step builder | reactionSchemeStore (single source of truth — see State Management) |
| **MechanismPanel** | Electron-pushing arrows | mechanismStore (+ mirrors into reactionSchemeStore when a scheme exists) |
| **ContextMenu** | Right-click menu | uiStore |
| **TemplatesPanel** | Molecule library | Local state |
| **BatchProcessDialog** / **BatchResultPanel** | Bulk operations | uiStore (`batchResults` array) — there is no separate `batchStore` |
| **DatabaseSearchPanel** | Compound search | Local state — there is no separate `databaseStore` |

---

## State Management

### Zustand Stores

chematic-draw uses **Zustand** for lightweight, functional state management.
Five real stores exist under `electron/src/renderer/store/` —
`moleculeStore.ts`, `canvasStore.ts`, `uiStore.ts`, `mechanismStore.ts`,
`reactionSchemeStore.ts`. There is no `batchStore` or `databaseStore`.

#### 1. **moleculeStore**
Contains the current molecule being edited, plus undo/redo history.

```typescript
interface MoleculeStore {
  molecule: MoleculeDto;             // never null — starts as { atoms: [], bonds: [] }
  undoStack: MoleculeDto[];
  redoStack: MoleculeDto[];
  setMolecule: (mol: MoleculeDto) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  addAtom: (element: string, x: number, y: number) => number; // returns new id
  updateAtom: (id: number, updates: Partial<AtomDto>) => void;
  removeAtom: (id: number) => void;
  addBond: (from: number, to: number, order: number, stereo: number) => void;
  updateBond: (id: number, updates: Partial<BondDto>) => void;
  removeBond: (id: number) => void;
  selectAtom: (id: number, additive: boolean) => void;
  selectBond: (id: number, additive: boolean) => void;
  deselectAll: () => void;
  getSelectedAtoms: () => AtomDto[];
  getSelectedBonds: () => BondDto[];
}
```

Undo/redo is snapshot-based (whole-`MoleculeDto` stack, bounded by
`UNDO_LIMIT`), not a command pattern. `selectAtom`/`selectBond` toggle a
purely-visual `selected` flag on the atom/bond — this is a **different**
selection concept from the Inspector panel's own selection (see uiStore
below); the two are not kept in sync.

**Key operations:**
- Load SMILES/MOL/etc. → `setMolecule()`
- Draw atom → `addAtom()`
- Draw bond → `addBond()`
- Edit → `updateAtom()` / `updateBond()`
- Delete → `removeAtom()` / `removeBond()`

#### 2. **canvasStore**
Tool and viewport state — which drawing tool is active, zoom, pan offset,
in-progress drag state. Not part of the old version of this doc at all.

#### 3. **uiStore**
UI state: theme, sidebar, active panel, context menu, modals, status
messages, batch-results history.

```typescript
interface UIStoreState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  sidebarWidth: number;
  activeSidebarPanel:
    | 'inspector' | 'templates' | 'chat' | 'research' | 'reactions'
    | 'batch-results' | 'stereoisomers' | 'lipinski' | 'properties'
    | 'mechanism' | 'database' | '3d';
  selectedAtomIdForInspector: number | null;
  selectedBondIdForInspector: number | null;
  contextMenu: { visible: boolean; x: number; y: number; atomId?: number; bondId?: number } | null;
  showShortcutsModal: boolean;
  showUndoModal: boolean;
  showBatchDialog: boolean;
  batchResults: Array<BatchResultSummary>;
  // + setTheme, setActiveSidebarPanel, setSelectedAtomIdForInspector,
  //   setSelectedBondIdForInspector,
  //   showContextMenu/hideContextMenu, showModal/hideModal,
  //   setStatus/clearStatus, addBatchResult, ...
}
```

`BatchResultSummary` retains per-item status, compact before/after counts,
provenance, and the original retry payload. The Batch Result panel can retry
failed items once at a time; the control is disabled while the async retry is
running and successful output is committed through the normal undo boundary.

The inspector stores atom and bond IDs and derives the selected objects from
the current molecule. This keeps left-click and context-menu selection on the
same path and prevents displayed inspector values from becoming stale after an
edit.

#### 4. **mechanismStore**
Electron-pushing-arrow drawing state: the arrow list, click-source→click-sink
selection mode, and AI-suggested source/sink pairs.

**A second real, currently-unresolved quirk:** `mechanismStore.arrows` is a
single flat array with no per-step semantics — nothing syncs it with
`reactionSchemeStore`'s step navigation (`goToStep`/`nextStep`/`previousStep`).
An arrow is mirrored into the current step's `arrows` at creation time only;
it isn't reloaded or re-scoped when the user navigates to a different step.

#### 5. **reactionSchemeStore**
The single source of truth for reaction-scheme documents: steps, atom
mapping, green-chemistry metrics, reaction classification, and the mechanism
scheme's step navigation/layout.

```typescript
interface ReactionSchemeStore {
  scheme: ReactionSchemeContext | null; // { id, title, description?, steps: MechanismStep[], currentStepIndex, viewMode }
  schemeLayout: SchemeLayout | null;
  atomMappings: AtomMapping | null;
  reactionClassification: ReactionClassification | null;
  greenMetrics: GreenChemistryMetrics | null;
  createScheme: (title: string, description?: string) => void;
  addStep: (step: MechanismStep) => void;   // recalculates mappings/classification/metrics
  removeStep: (stepId: string) => void;     // same
  updateStep: (stepId: string, updates: Partial<MechanismStep>) => void;
  nextStep: () => void; previousStep: () => void; goToStep: (index: number) => void;
  // ...
}
```

(The old version of this doc described a `reactions: Reaction[]` /
`currentStep: number` shape with `addReaction`/`removeReaction` — that
shape never existed in this codebase.)

### State Updates Flow

```
User Action (click, type, keyboard)
    ↓
React Event Handler
    ↓
Zustand Store Update
    ↓
Component Re-render
    ↓
Canvas/UI Update
```

---

## WASM Integration

### Bridge Architecture

```
React Components
    ↓
TypeScript wasmBridge.ts (electron/src/renderer/wasm/wasmBridge.ts)
    ↓  import * as wasmModule from './pkg'
JavaScript wasm-bindgen wrapper (built into ./pkg via `npm run build:wasm`)
    ↓
WebAssembly Module
    ↓
Rust WASM Functions (crates/chem-wasm)
    ↓
chematic Library (crates.io, not vendored)
```

Every call is synchronous from the caller's point of view — there is no
worker thread or async queue between `wasmBridge.ts` and the compiled
module (the one genuinely async step is the one-time `initWasm()` load).

### Key WASM Functions (real names — `wasmBridge.ts`)

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `parseMolecule` | text (any supported format) | MoleculeDto | Parse structure |
| `generate3dCoords` | MoleculeDto | Coords3dDto | 3D generation |
| `minimize3d` | Mol + Coords | Coords3dDto | UFF minimization |
| `getFingerprint` / `getFingerprintWithMetadata` | MoleculeDto | hex string / FingerprintDto | ECFP4 fingerprint |
| `tanimotoSimilarity` | 2 fingerprint hex strings | number | Similarity score |
| `runReactants` | MoleculeDto + SMIRKS | ReactionRunResult | Reaction execution |
| `findMcs` | 2 MoleculeDtos | McsResultDto | Maximum common substructure |
| `toSvg` / `toMolV2000` / `toMolV3000` / `toSdf` / `toCml` / `toSmiles` / `toCanonicalSmiles` | MoleculeDto | string | Format export |
| `getProperties` | MoleculeDto | PropertiesDto | Physicochemical properties |

(There is no `parseSmilesWasm` — that name never existed in this codebase.
`predictProperties` is **not** a direct WASM wrapper at all — it's a
TypeScript-side heuristic in `lib/advancedFeatures.ts` that calls
`getProperties` and post-processes the result; worth knowing since it means
adding a new prediction doesn't necessarily mean touching Rust.)

### TypeScript Bridge

**File:** `electron/src/renderer/wasm/wasmBridge.ts`

```typescript
import * as wasmModule from './pkg';
import { MoleculeDto } from '../store/types';

export function parseMolecule(text: string): MoleculeDto {
  return wasmModule.parse_any(text) as MoleculeDto;
}
// ... one thin wrapper function per WASM export, not an object literal
```

**Purpose:**
- Type-safe JavaScript interface to WASM
- Converts snake_case Rust/wasm-bindgen exports to camelCase TS functions
- Surfaces WASM errors as JS exceptions callers can catch

---

## Data Flow

### Typical User Interaction Flow

```
User Draws Atom
    ↓
MoleculeCanvas mouse handler (useCanvasInteraction.ts)
    ↓
Store: moleculeStore.addAtom()
    ↓
Zustand updates state (immutably)
    ↓
React re-renders affected components
    ↓
Canvas redraws with new atom
    ↓
InspectorPanel derives the selected atom ID from the current molecule
```

### 3D Visualization Flow

```
User clicks "Generate 3D"
    ↓
Get current molecule from moleculeStore
    ↓
Call wasmBridge.generate3dCoords(mol) — synchronous, main thread, no worker
    ↓
Call wasmBridge.minimize3d(mol, coords)
    ↓
Store result in Viewer3DPanel's local component state
    ↓
Viewer3DPanel renders a Canvas 2D scene (manual 3D→2D projection, not WebGL)
    ↓
Mouse drag → rotate (update angles) · Scroll → zoom
    ↓
Canvas re-renders on each interaction
```

### Reaction Flow (two separate, real flows — not one wizard)

**SMIRKS template execution** (`ReactionPanel`):
```
User picks a SMIRKS template (or types a custom pattern)
    ↓
Call wasmBridge.runReactants(mol, smirks)
    ↓
reactionSchemeStore.addStep() — also recalculates atom mapping,
classification, and green-chemistry metrics
    ↓
ReactionPanel renders the updated step list + those metrics
```

**Manual mechanism-arrow drawing** (`MechanismPanel`, separate tab):
```
User clicks "Add Arrow" → clicks source atom → clicks sink atom
    ↓
Arrow type dialog (forward/retro/resonance)
    ↓
mechanismStore.addArrow() (always) + mirrored into the current
reactionSchemeStore step's arrows (only if a scheme with steps exists)
    ↓
Canvas draws the arrow; atom-mapping color coding comes from
reactionSchemeStore's atomMappings, independently of the arrow itself
```

---

## Performance Considerations

There is no dedicated profiler UI or WebWorker offloading in this codebase.
Real, current performance work is the WASM benchmark suite —
`electron/src/__tests__/wasmPerformance.bench.ts`, run via `npm run
test:perf`, against a fixed 13-molecule corpus
(`wasm/__fixtures__/benchmarkMolecules.ts`). It reports median/p90/max
timings as a CI artifact (`perf-report.json`) rather than gating on fixed
numbers, since there's no prior-run baseline to regress against yet — the
static benchmark table this section used to show (5ms parse, 300ms/1.2s/2.5s
for 3D gen/minimize, etc.) was never measured against this app; it's been
removed rather than left as an unverified claim.

No `React.memo`, `lazy()`, or `requestAnimationFrame` usage exists anywhere
in the renderer today (verified by grep) — the Memoization/Lazy
Loading/WebWorker code samples this section used to show described
techniques that were never implemented, not real optimizations in place.
Real, verified layout/render determinism work instead lives in
`layoutDeterminism.test.ts` (repeated-call determinism + golden-SVG
byte comparison for `to_svg`/`clean_layout`/`generate_3d_coords`).

---

## Design Decisions

### 1. Why Zustand (not Redux)?

**Decision: Lightweight stores for each domain**

**Rationale:**
- Redux too verbose for this codebase size
- Zustand: Simple, no boilerplate
- Each domain (molecule, canvas, ui, mechanism, reaction scheme) is independent
- Easy to test and reason about

**Trade-off:** Slightly less type safety than Redux typed selectors; five
independent stores also means cross-store synchronization has to be done by
hand — see the mechanism-store quirk noted in State Management above.

### 2. Why Canvas 2D (not WebGL)?

**Decision: Canvas 2D + projection matrices for 3D**

**Rationale:**
- WebGL has higher learning curve
- Canvas 2D sufficient for molecular visualization
- Simpler debugging and profiling
- Cross-platform compatibility
- WASM projection calculations very fast

**Trade-off:** Not suitable for very complex scenes (many thousands of atoms) — untested at that scale, no specific atom-count ceiling has been measured.

### 3. Why WASM (not pure JavaScript)?

**Decision: Rust WASM for chemistry operations**

**Rationale:**
- Chemistry algorithms are CPU-intensive (SMILES parsing, 3D gen, fingerprinting)
- WASM meaningfully faster than JavaScript for this class of work
- Reuse the `chematic` crate ecosystem rather than reimplementing chemistry in TS
- Safety guarantees from Rust

**Trade-off:** Build complexity (a Rust toolchain + wasm-pack step ahead of
every `npm start`), WASM module distribution.

### 4. Why Electron (not web app)?

**Decision: Desktop Electron app**

**Rationale:**
- File I/O (save/load molecules)
- Native window integration
- Menu bar customization
- Offline functionality
- System integration

**Trade-off:** Larger distribution, platform-specific code paths.

(A previous "Why WebWorker?" entry has been removed — there is no
WebWorker anywhere in this codebase; see System Overview above.)

---

## Extensibility

### Validated local extensions

`renderer/lib/documentCommands.ts` is the v0.9.0 integration boundary. Local
extensions register a manifest, validated document commands, or read-only
analysis providers. Commands require `document:write` and their output is
checked before application; providers require `analysis:read` and cannot
mutate editor state through the API. Import/export permissions are reserved
for explicit adapters, so an extension does not silently gain file or network
access. This is an in-process API for now; third-party bundle loading and
schema migrations remain gated on a compatibility policy.

### Adding a New Feature

**Illustrative example only** — hERG cardiac-toxicity prediction does not
exist in this codebase today. This walks through the real *pattern* an
addition like it would follow (Rust WASM function → TS bridge wrapper →
React panel → register in `Sidebar.tsx`'s tab list), not a description of
existing code.

1. **Rust WASM** (`crates/chem-wasm/src/lib.rs`)
   ```rust
   #[wasm_bindgen]
   pub fn predict_herg(mol_json: &JsValue) -> Result<f64, JsValue> {
       // Implement hERG prediction model
   }
   ```

2. **TypeScript Bridge** (`electron/src/renderer/wasm/wasmBridge.ts`)
   ```typescript
   export function predictHerg(mol: MoleculeDto): number {
     return wasmModule.predict_herg(mol) as number;
   }
   ```

3. **React Component** (`electron/src/renderer/components/sidebar/HergPanel.tsx`)
   ```typescript
   export function HergPanel() {
     const mol = useMoleculeStore((s) => s.molecule);
     const [herg, setHerg] = useState<number | null>(null);

     useEffect(() => {
       try {
         setHerg(wasmBridge.predictHerg(mol));
       } catch {
         setHerg(null);
       }
     }, [mol]);

     return <div>hERG Risk: {herg?.toFixed(2) ?? 'N/A'}</div>;
   }
   ```

4. **Register the tab** (`electron/src/renderer/components/sidebar/Sidebar.tsx`)
   Add to the `tabs` array and the `activeSidebarPanel === '...' && <HergPanel />` branch.

### Adding Tests

```typescript
// electron/src/__tests__/herg.test.ts
describe('hERG Prediction', () => {
  it('should predict hERG risk for a known-cardiotoxic compound', () => {
    const mol = wasmBridge.parseMolecule('C1=CC=C(C=C1)CCN');
    const risk = wasmBridge.predictHerg(mol);
    expect(risk).toBeGreaterThan(0.5);
  });
});
```

---

## Security Considerations

### 1. WASM Sandboxing
- WASM runs in the browser/Electron-renderer sandbox
- No filesystem access from WASM itself
- Data crosses the WASM boundary as `serde`-serialized DTOs

### 2. Input Validation
- `dto_to_chem` rejects unknown element symbols as a real error, not a silent guess
- `validate_molecule` reports real valence/connectivity/aromaticity findings (see `docs/API.md`)

### 3. IPC Security (Electron)
- `preload.js` uses `contextBridge.exposeInMainWorld` — the renderer never gets raw `ipcRenderer`
- The exposed `window.electronAPI` surface is a fixed, enumerated set of functions (menu-event listeners, file dialog/write, clipboard, settings) — not a generic message-passing channel

---

## Future Improvements

1. **Web Version**
   - Port to web browser
   - Use same WASM module
   - Server-side batch processing

2. **Plugin System**
   - Load custom WASM modules
   - Extend with third-party tools
   - Module marketplace

3. **Collaborative Features**
   - Real-time molecule sharing
   - Collaborative drawing
   - Cloud sync

4. **Advanced Rendering**
   - WebGL for large molecules
   - Volumetric visualization
   - VR/AR support

(All four are aspirational/not started — see `internal_docs/ROADMAP.md`'s
"Explicitly deferred" section for the project's current stance on several
of these, e.g. cloud sync/real-time collaboration are deliberately out of
scope, not just unscheduled.)

---

## Resources

- **Electron docs:** https://www.electronjs.org/docs
- **React docs:** https://react.dev
- **Zustand docs:** https://github.com/pmndrs/zustand
- **WASM guide:** https://rustwasm.org/

---

## See Also

- [API Reference](./API.md) — WASM function documentation
- [Build Guide](./BUILD.md) — Development setup
- [User Tutorial](./TUTORIAL.md) — Feature walkthroughs
