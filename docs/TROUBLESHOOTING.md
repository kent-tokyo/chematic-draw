# Troubleshooting Guide

Solutions for common problems in chematic-draw.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Build Issues](#build-issues)
3. [Runtime Errors](#runtime-errors)
4. [Performance Issues](#performance-issues)
5. [Feature-Specific Issues](#feature-specific-issues)
6. [Platform-Specific Issues](#platform-specific-issues)
7. [Debugging Tips](#debugging-tips)
8. [Getting Help](#getting-help)

---

## Installation Issues

### "Node.js is not installed"

**Error Message:**
```
command not found: node
```

**Solution:**

1. **macOS (Homebrew):**
   ```bash
   brew install node
   node --version  # Verify
   ```

2. **Windows:**
   - Download from [nodejs.org](https://nodejs.org)
   - Run installer
   - Restart terminal

3. **Linux (Ubuntu/Debian):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
   sudo apt-get install nodejs
   ```

**Verify:** Node 24+ is required (`electron/package.json`'s `engines.node`, `.nvmrc`)
```bash
node --version  # Should output v24.x.x or higher
```

---

### "npm command not found"

npm comes bundled with Node.js. If you have Node.js, you have npm.

**Solution:**
```bash
# Reinstall Node.js
# npm will be installed automatically
node --version
npm --version
```

---

### "Git is not installed"

**Solution:**

1. **macOS:**
   ```bash
   xcode-select --install
   ```

2. **Windows:**
   - Download from [git-scm.com](https://git-scm.com)
   - Run installer

3. **Linux:**
   ```bash
   sudo apt-get install git
   ```

---

## Build Issues

### "wasm-pack command not found"

**Error:**
```
Command 'wasm-pack' not found
```

**Causes:**
- wasm-pack not installed
- Rust not installed
- wasm target not installed

**Solutions:**

1. **Install Rust first:**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   rustc --version  # Verify
   ```

2. **Install wasm-pack:**
   ```bash
   cargo install wasm-pack
   wasm-pack --version  # Verify
   ```

3. **Add wasm target:**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

---

### "Cannot find module './pkg'" (or similar WASM import error)

**Cause:**
WASM module not built yet — there's no npm package involved; `wasmBridge.ts`
imports the WASM build output directly from a local, gitignored folder
(`electron/src/renderer/wasm/pkg/`) that only exists after building.

**Solution:**
```bash
cd electron
npm install
npm run build:wasm       # dev build -> src/renderer/wasm/pkg/
# or: npm run build:wasm:release   # optimized build

# Verify WASM exists
ls src/renderer/wasm/pkg/
# Should see: chem_wasm.js, chem_wasm_bg.wasm, etc.
```

---

### "npm ERR! peer dep missing"

**Error:**
```
npm ERR! peer dep missing: @types/react@19.0.0
```

**Solution:**
```bash
cd electron
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

### "Compilation error in crates/chem-wasm"

**Common causes:**
- Rust version too old
- chematic version mismatch
- Missing Rust dependencies

**Solution:**

1. **Update Rust:**
   ```bash
   rustup update
   rustc --version  # Needs 1.85+ — the workspace uses `edition = "2024"`
   ```

2. **Check Cargo.toml versions:**
   ```toml
   [dependencies]
   chematic = { git = "https://github.com/kent-tokyo/chematic.git", tag = "v1.0.3", features = ["full"] }
   ```

3. **Clean build:**
   ```bash
   cargo clean -p chem-wasm
   cd electron
   npm run build:wasm:release
   ```

---

## Runtime Errors

### "WASM module failed to load"

**Error in Browser Console:**
```
Failed to load WASM module
TypeError: Cannot read property 'instance' of undefined
```

**Causes:**
- WASM not built
- WASM MIME type incorrect
- Network error loading WASM

**Solutions:**

1. **Verify WASM exists:**
   ```bash
   ls electron/src/renderer/wasm/pkg/
   # Should see: chem_wasm.js, chem_wasm_bg.wasm, etc.
   ```

2. **Rebuild WASM:**
   ```bash
   cd electron
   npm run build:wasm:release
   npm start
   ```

3. **Check WASM import path:**
   In `electron/src/renderer/wasm/wasmBridge.ts`:
   ```typescript
   import * as wasmModule from './pkg';
   ```

---

### "TypeError: molecule is null"

**Error:**
```
Cannot read property 'atoms' of null
```

**Cause:**
No molecule loaded in canvas when performing operation.

**Solution:**
1. Load a molecule first: File → Open, or paste SMILES/MOL with `Ctrl+V`
2. Or draw a molecule on canvas
3. Then try the operation

---

### "Invalid SMILES" error

**Error:**
```
Invalid SMILES syntax
```

**Common issues:**
- Missing brackets for branching
- Incorrect atom symbols
- Malformed charges

**Examples:**

| ❌ Wrong | ✅ Correct | Molecule |
|---------|-----------|----------|
| `C1CCCCC1C(` (unbalanced parenthesis) | `Cc1ccccc1` | Toluene |
| `C(C)C(C)C` | `CC(C)C` | Isobutane |
| `c1ccccc1N+` | `c1ccccc1[NH+]` | Aniline cation |
| `C=C=C` (this is allene, not propene) | `CC=C` | Propene |

**Solution:**
- Verify SMILES syntax on [cheminfo.org](https://cheminfo.org/Molecular-Weight-Calculator)
- Test with known compounds first

---

### "PAINS violation count seems wrong"

**Cause:**
PAINS filtering may have false positives/negatives.

**Context:**
PAINS alerts are heuristic-based. Some alerts are known to be overly restrictive.

**Solution:**
- Review the specific alert type
- Cross-reference with published literature
- Use results as guidance, not absolute rule

---

## Performance Issues

### "3D generation is slow (>5 seconds)"

**For molecules <500 atoms:**

**Cause:**
WASM module is not optimized.

**Solution:**
1. **Rebuild with optimizations:**
   ```bash
   cd electron
   npm run build:wasm:release
   npm start
   ```

2. **Check molecule size:**
   - Props panel shows atom count
   - If >500 atoms, slowness is expected
   - Consider splitting large molecules

3. **Profile performance:**
   ```bash
   cd electron
   npm run test:perf
   # Review benchmark output
   ```

---

### "Canvas is laggy (not 60 FPS)"

**Cause:**
Main thread is overloaded — all WASM calls and 3D coordinate generation run
synchronously on the main thread in this app (there's no WebWorker
offloading anywhere in the renderer).

**Solutions:**

1. **Profile the main thread:**
   - Open DevTools → Performance tab and record while interacting
   - Look for long WASM call frames or excessive re-renders

2. **Reduce molecule size:**
   - Large molecules (>200 atoms) render slower
   - 3D projection is O(n) in atom count

3. **Disable features:**
   - Close unused sidebar panels
   - This reduces re-render overhead

---

### "High memory usage (>500MB)"

**Cause:**
Memory leak in WASM or JavaScript.

**Solutions:**

1. **Check browser memory:**
   - DevTools → Memory tab
   - Take heap snapshot
   - Look for growing object pools

2. **Check WASM allocations:**
   ```bash
   cd electron
   npm run test:perf
   # Reports median/p90/max timing and WASM binary size per benchmark run —
   # there's no dedicated leak-detection section; use DevTools' heap
   # snapshot (above) to actually diagnose a leak.
   ```

3. **Clear unused data:**
   - Close panels with large data
   - Load new molecule (clears old data)
   - Restart application

---

## Feature-Specific Issues

### 3D Viewer

#### "3D panel won't open"

**Solution:**
1. Click "3D" tab in sidebar
2. If nothing appears, try:
   ```bash
   cd electron && npm start  # Restart app
   ```

#### "3D generation completes but no canvas"

**Cause:**
Canvas element not rendering.

**Solution:**
1. Open DevTools (F12)
2. Check console for errors
3. Verify molecule is loaded (not null)
4. Try with simple molecule: `c1ccccc1` (benzene)

#### "Rotation is inverted"

**Feature behavior:**
- Drag right → rotates around Y (horizontal axis)
- Drag up → rotates around X (vertical axis)
- This is conventional in 3D graphics

No fix needed — behavior is correct.

---

### Reaction Mechanisms

#### "Reaction mechanism doesn't generate"

**Cause:**
SMIRKS pattern doesn't match molecule structure.

**Solution:**
1. Verify molecule has required functional groups
   - Example: SN2 requires alkyl halide (C-X)
2. Check SMIRKS pattern syntax
3. Test with known example

#### "Product doesn't match expected"

**Cause:**
Multiple possible products (regioisomers/stereoisomers).

**Context:**
Reaction engine returns first valid product. Other possibilities exist.

**Solution:**
- Review reaction mechanism step-by-step
- Manually draw expected product for comparison

---

### Properties Panel

#### "SA score seems off"

**Note:**
SA score is heuristic (based on fragment frequency). Edge cases exist.

**Solution:**
- Use as general guide (0-3 easy, 6-10 hard)
- Verify with literature for specific compound

#### "Solubility (ESOL) differs from experimental"

**Note:**
ESOL is a prediction model with typical error of ±1-2 log units.

**Solution:**
- Use for relative comparison (which is more soluble?)
- Not for absolute value prediction
- Check literature for measured solubility

---

## Platform-Specific Issues

### macOS

#### "Cannot open app" (unsigned)

**Issue:**
macOS blocks unsigned applications.

**Solution:**
1. Open Finder → Applications
2. Right-click chematic-draw
3. Click "Open"
4. Confirm security dialog

---

### Windows

#### "Smart Screen blocked the app"

**Cause:** the Windows build is unsigned (no code-signing certificate
configured in CI — see `docs/CI_CD.md`).

**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. Confirm UAC prompt

---

### Linux

#### "Application window fails to display"

**Cause:**
X11 or Wayland session issue.

**Solution:**
```bash
# Run with X11 explicitly
export DISPLAY=:0
cd electron && npm start
```

---

## Debugging Tips

### Enable DevTools

**In running app:**
- Press `Ctrl+Shift+I` (Windows/Linux)
- Press `Cmd+Option+I` (macOS)
- Or F12

### View Console Logs

1. Open DevTools (F12)
2. Click "Console" tab
3. Look for red errors or yellow warnings

### Profile Performance

```bash
# In DevTools:
1. Click "Performance" tab
2. Click record
3. Interact with 3D viewer
4. Click stop
5. Analyze timeline
```

### Inspect Elements

```bash
# In DevTools:
1. Click Element Inspector (top-left icon)
2. Click molecule on canvas
3. HTML structure appears
4. Check CSS styles, event listeners
```

### Check WASM Module

There's no installable `@wasm-bindgen/chematic` package to `import` from a
live DevTools console — the WASM bindings are a local build output bundled
into the app. To inspect a parse result, add a temporary log in
`electron/src/renderer/wasm/wasmBridge.ts`'s `parseMolecule()` (or any other
exported function) and rebuild, or check the result from the app's own UI
(e.g. the Inspector panel after loading a molecule).

### Monitor State

Zustand's `create()` attaches `getState()`/`subscribe()` directly to the
exported hook, so this works if you have a way to reach the module (e.g.
pasted into a breakpoint's console, not a fresh DevTools console — plain
`import` of a project-relative path doesn't resolve there):

```typescript
import { useMoleculeStore } from './renderer/store/moleculeStore';

// View current state
const state = useMoleculeStore.getState();
console.log(state.molecule);

// Watch state changes
const unsubscribe = useMoleculeStore.subscribe((state) => {
  console.log('State updated:', state);
});
```

### Run with Debug Logging

Set environment variable:
```bash
cd electron
DEBUG=* npm start
```

---

## Getting Help

### Before Reporting an Issue

1. **Check this guide** — You might find the solution
2. **Run latest version** — Bug might be fixed
3. **Try with sample molecule** — `c1ccccc1` (benzene)
4. **Check browser console** — Copy error message
5. **Note OS and version** — macOS 13.5, Windows 11, Ubuntu 22.04, etc.

### Where to Report Issues

- **GitHub Issues:** https://github.com/kent-tokyo/chematic-draw/issues
- **GitHub Discussions:** For questions and feature requests

This is a solo-maintained project — there's no dedicated support inbox or
formal response-time SLA (see [`SECURITY.md`](../SECURITY.md) for the same
note on vulnerability reports specifically).

### Information to Include

When reporting a bug, include:

```markdown
**OS:** macOS 13.5
**Version:** chematic-draw 0.9.2
**Runtime:** Electron (pinned version in `electron/package.json`)

**Steps to Reproduce:**
1. Load benzene (c1ccccc1)
2. Click 3D tab
3. Click "3D 生成"

**Expected:** 3D structure renders
**Actual:** No canvas displayed

**Error Message:**
(Paste from DevTools console)

**Console Log:**
(Screenshots or error traces)
```

---

## FAQ

**Q: Is my data secure?**
A: Nearly all processing happens locally with no network calls. The DB tab's
PubChem lookup sends the generated InChIKey to the public PubChem REST API.
It is an exact-match structure lookup, not a name or similarity search.
ChemSpider is visible in the selector but is not implemented.

**Q: Can I use this offline?**
A: Yes, except for the PubChem-based compound lookup noted above —
drawing, editing, export, 3D, and all property calculations work fully
offline.

**Q: How do I export my work?**
A: Three separate export paths, not one menu:
- File → Export: SVG, PNG, MOL V2000, SMILES (the molecule itself)
- 3D panel's own "XYZ エクスポート" button: 3D coordinates as XYZ
- Reactions panel's "Export & Import" section: the reaction scheme as JSON, CSV, or SVG

**Q: Can I undo changes?**
A: Yes, `Ctrl+Z` / `Cmd+Z` to undo. Use "Undo Timeline" panel to see history.

**Q: How do I contribute?**
A: See CONTRIBUTING.md in repository root.

---

## Still Having Issues?

If this guide doesn't help:

1. **Check closed GitHub issues** — Your problem might be solved
2. **Search GitHub Discussions** — Q&A section
3. **Create a new issue** — Include all requested information above

We're here to help!
