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
│  (File I/O, Window Management, IPC)     │
└──────────────┬──────────────────────────┘
               │ IPC
┌──────────────▼──────────────────────────┐
│      Electron Renderer Process          │
│  (React UI, Canvas, Interactions)       │
├──────────────────────────────────────────┤
│  React Components (Sidebar, Canvas)     │
│  Zustand State Stores                   │
│  Event Handlers (Keyboard, Mouse)       │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼───────┐
        │   WebWorker  │
        │ (3D Calc)    │
        └──────┬───────┘
               │
        ┌──────▼───────────┐
        │  WASM Module     │
        │ (Chemistry Ops)  │
        └──────────────────┘
```

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
   - UI state
   - Reaction scheme state
   - Persistent settings

4. **Computation (WASM/Rust)**
   - SMILES parsing
   - 3D coordinate generation
   - Fingerprint calculation
   - Reaction execution
   - Property prediction

---

## Technology Stack

| Layer | Technology | Purpose | Version |
|-------|-----------|---------|---------|
| **Desktop** | Electron | Cross-platform app shell | 33.x |
| **UI Framework** | React | Component-based UI | 18.x |
| **Styling** | CSS/Tailwind | Responsive design | Inline |
| **State** | Zustand | Lightweight store | 4.x |
| **Canvas** | Canvas 2D API | 2D drawing, 3D projection | Native |
| **Chemistry Engine** | chematic (Rust) | Molecule operations | 0.1.40 |
| **WASM** | wasm-bindgen | Rust → JavaScript bridge | Latest |
| **Build** | Vite | Bundler and dev server | Latest |
| **WASM Build** | wasm-pack | Rust → WASM compilation | Latest |
| **Testing** | Jest | Unit testing | Latest |
| **E2E Testing** | Playwright | Browser automation | Latest |
| **Benchmarking** | Custom profiler | Performance analysis | Built-in |

---

## Component Architecture

### React Components

```
App
├── MenuBar
├── MainWindow
│   ├── Canvas (MoleculeCanvas)
│   │   └── 2D structure editor
│   └── Sidebar
│       ├── ChatPanel (Info display)
│       ├── InspectorPanel
│       │   └── Atom/bond properties
│       ├── TemplatesPanel
│       │   └── Molecule templates
│       ├── ReactionPanel
│       │   └── Reaction mechanisms
│       ├── StereoisomerPanel
│       │   └── Chirality enumeration
│       ├── PropertyPredictionPanel
│       │   └── Molecular descriptors
│       ├── LipinskiPanel
│       │   └── Drug-likeness scoring
│       ├── MechanismPanel
│       │   └── Reaction visualization
│       ├── DatabaseSearchPanel
│       │   └── MCS & similarity search
│       ├── BatchResultPanel
│       │   └── Batch operation results
│       └── Viewer3DPanel
│           └── 3D molecular structure
├── ContextMenu
│   └── Right-click operations
├── ArrowTypeDialog
│   └── Electron flow settings
├── BatchProcessDialog
│   └── Batch operation configuration
└── UndoTimeline
    └── Undo/redo visualization
```

### Component Responsibilities

| Component | Purpose | State Management |
|-----------|---------|------------------|
| **MoleculeCanvas** | 2D structure editor | moleculeStore |
| **Sidebar** | Panel container | uiStore |
| **InspectorPanel** | Atom/bond details | moleculeStore |
| **Viewer3DPanel** | 3D visualization | Local state + WASM |
| **ReactionPanel** | Reaction builder | reactionSchemeStore |
| **ContextMenu** | Right-click menu | uiStore |
| **TemplatesPanel** | Molecule library | Local state |
| **BatchProcessDialog** | Bulk operations | batchStore |

---

## State Management

### Zustand Stores

chematic-draw uses **Zustand** for lightweight, functional state management.

#### 1. **moleculeStore**
Contains current molecule being edited.

```typescript
interface MoleculeState {
  molecule: MoleculeDto | null;
  setMolecule: (mol: MoleculeDto) => void;
  addAtom: (atom: AtomDto) => void;
  updateAtom: (id: number, updates: Partial<AtomDto>) => void;
  deleteAtom: (id: number) => void;
  addBond: (bond: BondDto) => void;
  updateBond: (id: number, updates: Partial<BondDto>) => void;
  deleteBond: (id: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}
```

**Key operations:**
- Load SMILES → `setMolecule()`
- Draw atom → `addAtom()`
- Draw bond → `addBond()`
- Select/edit → `updateAtom()` / `updateBond()`
- Delete → `deleteAtom()` / `deleteBond()`

#### 2. **uiStore**
UI state: active panels, dialogs, selections.

```typescript
interface UIState {
  activeSidebarPanel: 'props' | '3d' | 'reactions' | 'stereo' | 'inspector' | 'db' | ...;
  setActiveSidebarPanel: (panel: string) => void;
  selectedAtomId: number | null;
  setSelectedAtomId: (id: number | null) => void;
  selectedBondId: number | null;
  setSelectedBondId: (id: number | null) => void;
  contextMenu: { x: number; y: number; visible: boolean };
  setContextMenu: (menu: ContextMenu | null) => void;
  // ... more UI state
}
```

#### 3. **reactionSchemeStore**
Reaction mechanism and scheme state.

```typescript
interface ReactionSchemeState {
  reactions: Reaction[];
  currentStep: number;
  scheme: ReactionScheme | null;
  addReaction: (rxn: Reaction) => void;
  removeReaction: (id: number) => void;
  setCurrentStep: (step: number) => void;
  // ... more
}
```

#### 4. **Batch & Search Stores**
- `batchStore` — Bulk operation configuration and results
- `databaseStore` — Search results and cache

### State Updates Flow

```
User Action (click, type, keyboard)
    ↓
React Event Handler
    ↓
Validate Input
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
TypeScript wasmBridge.ts
    ↓
JavaScript wasm_bindgen wrapper
    ↓
WebAssembly Module
    ↓
Rust WASM Functions
    ↓
chematic Library
```

### Key WASM Functions

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `parseSmilesWasm` | SMILES string | MoleculeDto | Parse structure |
| `generate3dCoords` | MoleculeDto | Coords3dDto | 3D generation |
| `minimize3d` | Mol + Coords | Coords3dDto | UFF optimization |
| `getFingerprint` | MoleculeDto | String (hex) | ECFP4 fingerprint |
| `tanimotoSimilarity` | 2 FP strings | Number | Similarity score |
| `runReactants` | SMIRKS + Mols | Mol[] | Reaction execution |
| `findMcs` | 2 Molecules | McsResult | Common substructure |
| `predictProperties` | MoleculeDto | PropertyPrediction | Property prediction |

### TypeScript Bridge

**File:** `electron/src/renderer/wasm/wasmBridge.ts`

```typescript
// Wrapper around wasm_bindgen generated code
import * as wasmModule from '../../../pkg/chem_wasm';

export const wasmBridge = {
  // Direct wrapping of WASM functions
  parseSmilesWasm: (smiles: string) => {...},
  generate3dCoords: async (mol: MoleculeDto) => {...},
  // ... more functions
};
```

**Purpose:**
- Type-safe JavaScript interface to WASM
- Error handling and conversion
- Performance monitoring
- Profiling hooks

---

## Data Flow

### Typical User Interaction Flow

```
User Draws Atom
    ↓
MoleculeCanvas onClick handler
    ↓
Store: moleculeStore.addAtom()
    ↓
Zustand updates state (immutably)
    ↓
React re-renders affected components
    ↓
Canvas redraws with new atom
    ↓
InspectorPanel updates (if selected)
    ↓
PropsPanel recalculates (if open)
    ↓
User sees updated UI
```

### 3D Visualization Flow

```
User clicks "3D 生成"
    ↓
Get current molecule from moleculeStore
    ↓
Call wasmBridge.generate3dCoords(mol)
    ↓
  [WebWorker] Offload heavy computation?
    ↓
Wait for WASM result
    ↓
Call wasmBridge.minimize3d(mol, coords)
    ↓
Store result in component state
    ↓
Viewer3DPanel renders Canvas 2D scene
    ↓
User sees 3D structure
    ↓
Mouse drag → rotate (update angles)
    ↓
Scroll → zoom (update zoom level)
    ↓
Canvas re-renders continuously
```

### Reaction Mechanism Flow

```
User selects reaction type
    ↓
Input nucleophile/electrophile
    ↓
Call wasmBridge.runReactants(smirks, mols)
    ↓
Mechanism classification
    ↓
Store in reactionSchemeStore
    ↓
ReactionPanel renders steps
    ↓
User clicks "Next Step"
    ↓
Update currentStep in store
    ↓
Canvas highlights atom mapping
    ↓
Color code atoms (green/blue/red/gray)
```

---

## Performance Considerations

### Bottlenecks & Solutions

| Bottleneck | Symptom | Solution |
|-----------|---------|----------|
| Large 3D molecules (>500 atoms) | UI freezes for 5+ seconds | WebWorker offloading |
| Frequent canvas redraws | Stuttering at 30-40 FPS | Canvas optimization, requestAnimationFrame |
| WASM startup | Slow cold start | Lazy load WASM, preload in background |
| State updates | Component cascade | Zustand selector memoization |
| Fingerprint calculation | Slow for large batches | Batch processing with workers |

### Optimization Techniques

#### 1. WebWorker for 3D
Canvas rendering offloaded to separate thread:
- Main thread: React UI, event handling
- Worker thread: 3D rotation, projection calculations
- Result: Smooth 60 FPS interaction

**Usage:**
```typescript
const worker = new Worker('./canvasWorker.ts');
worker.postMessage({ atoms, angleX, angleY, zoom });
worker.onmessage = (result) => {
  // Update canvas with projected atoms
};
```

#### 2. Memoization
Prevent unnecessary re-renders:
```typescript
const MemoCanvas = React.memo(Canvas, (prev, next) => {
  return prev.molecule === next.molecule &&
         prev.selectedAtom === next.selectedAtom;
});
```

#### 3. Lazy Loading
Load panels only when needed:
```typescript
const Viewer3DPanel = lazy(() => import('./Viewer3DPanel'));

<Suspense fallback={<Spinner />}>
  {activeSidebarPanel === '3d' && <Viewer3DPanel />}
</Suspense>
```

#### 4. Canvas Batching
Minimize canvas state changes:
```typescript
// Good: One draw call per frame
ctx.clearRect(0, 0, width, height);
for (const atom of atoms) {
  drawAtom(ctx, atom);  // Batched
}

// Bad: Multiple state changes
for (const atom of atoms) {
  ctx.fillStyle = getColor(atom);  // Expensive
  ctx.fillRect(...);
}
```

### Benchmark Results

Current performance (as of last optimization):

| Operation | Time | Target | Status |
|-----------|------|--------|--------|
| Parse SMILES | 5ms | <10ms | ✅ |
| Generate 3D (50 atoms) | 300ms | <500ms | ✅ |
| Generate 3D (200 atoms) | 1.2s | <2s | ✅ |
| 3D Minimize | 2.5s | <5s | ✅ |
| Fingerprint | 30ms | <100ms | ✅ |
| Similarity calc | 2ms | <10ms | ✅ |
| Canvas render | 14ms | <16.67ms | ✅ |
| Memory per 3D | 20MB | <50MB | ✅ |

---

## Design Decisions

### 1. Why Zustand (not Redux)?

**Decision: Lightweight stores for each domain**

**Rationale:**
- Redux too verbose for this codebase size
- Zustand: Simple, no boilerplate
- Each domain (molecule, ui, reaction) is independent
- Easy to test and reason about

**Trade-off:** Slightly less type safety than Redux typed selectors

### 2. Why Canvas 2D (not WebGL)?

**Decision: Canvas 2D + projection matrices for 3D**

**Rationale:**
- WebGL has higher learning curve
- Canvas 2D sufficient for molecular visualization
- Simpler debugging and profiling
- Cross-platform compatibility
- WASM projection calculations very fast

**Trade-off:** Not suitable for very complex scenes (>10K atoms)

### 3. Why WASM (not pure JavaScript)?

**Decision: Rust WASM for chemistry operations**

**Rationale:**
- Chemistry algorithms are CPU-intensive (SMILES parsing, 3D gen, FP)
- WASM 10-100x faster than JavaScript
- Reuse chematic library (battle-tested)
- Safety guarantees from Rust

**Trade-off:** Build complexity, WASM module distribution

### 4. Why WebWorker?

**Decision: Offload 3D calculations to worker thread**

**Rationale:**
- 3D rotation/projection can be expensive (>50ms)
- Main thread must stay responsive for UI
- Worker runs in parallel
- Smooth 60 FPS achievable

**Trade-off:** Message passing overhead (usually <1ms)

### 5. Why Electron (not web app)?

**Decision: Desktop Electron app**

**Rationale:**
- File I/O (save/load molecules)
- Native window integration
- Menu bar customization
- Offline functionality
- System integration

**Trade-off:** Larger distribution, platform-specific code paths

---

## Extensibility

### Adding a New Feature

**Example: Add new property prediction (e.g., hERG cardiac toxicity)**

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
       return wasmModule.predict_herg(JSON.stringify(mol));
   }
   ```

3. **React Component** (`electron/src/renderer/components/sidebar/HergPanel.tsx`)
   ```typescript
   export const HergPanel = () => {
     const mol = moleculeStore((s) => s.molecule);
     const [herg, setHerg] = useState<number | null>(null);

     useEffect(() => {
       if (mol) {
         setHerg(wasmBridge.predictHerg(mol));
       }
     }, [mol]);

     return <div>hERG Risk: {herg?.toFixed(2)}</div>;
   };
   ```

4. **Register Panel** (`electron/src/renderer/components/sidebar/Sidebar.tsx`)
   ```typescript
   const tabs = [
     // ... existing tabs
     { id: 'herg', label: 'hERG', component: HergPanel },
   ];
   ```

### Adding Tests

```typescript
// electron/src/__tests__/herg.test.ts
describe('hERG Prediction', () => {
  it('should predict hERG risk for cardiotoxic compound', () => {
    const mol = wasmBridge.parseSmilesWasm('C1=CC=C(C=C1)CCN');
    const risk = wasmBridge.predictHerg(mol);
    expect(risk).toBeGreaterThan(0.5);  // High risk
  });
});
```

---

## Security Considerations

### 1. WASM Sandboxing
- WASM runs in browser sandbox
- No filesystem access
- Limited to JSON data serialization

### 2. File Validation
- Validate SMILES syntax before parsing
- Reject oversized molecules
- Scan for malformed input

### 3. IPC Security (Electron)
- Use preload script for IPC
- Validate all messages
- Limit exposed APIs

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

---

## Resources

- **Electron docs:** https://www.electronjs.org/docs
- **React docs:** https://react.dev
- **Zustand docs:** https://github.com/pmndrs/zustand
- **WASM guide:** https://rustwasm.org/
- **chematic docs:** https://github.com/rapodaca/chematic

---

## See Also

- [API Reference](./API.md) — WASM function documentation
- [Build Guide](./BUILD.md) — Development setup
- [User Tutorial](./TUTORIAL.md) — Feature walkthroughs
