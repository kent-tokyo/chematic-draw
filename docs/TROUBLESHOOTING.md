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
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install nodejs
   ```

**Verify:** Node 18+ is installed
```bash
node --version  # Should output v18.x.x or higher
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

### "Error: Cannot find module '@wasm-bindgen/...'"

**Error:**
```
Cannot find module '@wasm-bindgen/chematic'
```

**Cause:**
WASM module not built yet.

**Solution:**
```bash
# Build WASM first
cd crates/chem-wasm
wasm-pack build --target web
cd ../..

# Then install dependencies
npm install

# Verify WASM exists
ls crates/chem-wasm/pkg/
```

---

### "npm ERR! peer dep missing"

**Error:**
```
npm ERR! peer dep missing: @types/react@18.0.0
```

**Solution:**
```bash
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
   rustc --version  # Should be 1.70+
   ```

2. **Check Cargo.toml versions:**
   ```toml
   [dependencies]
   chematic = { version = "0.1.40", features = ["full"] }
   ```

3. **Clean build:**
   ```bash
   cd crates/chem-wasm
   cargo clean
   wasm-pack build --target web --release
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
   ls electron/src/renderer/wasm/../../../crates/chem-wasm/pkg/
   # Should see: chem_wasm.wasm, chem_wasm.js, etc.
   ```

2. **Rebuild WASM:**
   ```bash
   cd crates/chem-wasm
   wasm-pack build --target web --release
   cd ../..
   npm start
   ```

3. **Check WASM import path:**
   In `electron/src/renderer/wasm/wasmBridge.ts`:
   ```typescript
   import * as wasmModule from '../../../crates/chem-wasm/pkg/chem_wasm';
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
1. Load a molecule first: File → New from SMILES
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
| `C1CCCCC1C` | `C1CCCCC1C` | Toluene |
| `C(C)C(C)C` | `CC(C)C` | Isobutane |
| `c1ccccc1N+` | `c1ccccc1[NH+]` | Aniline cation |
| `CC=C` | `CC=C` | Propene |

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
   cd crates/chem-wasm
   wasm-pack build --target web --release
   cd ../..
   npm start
   ```

2. **Check molecule size:**
   - Props panel shows atom count
   - If >500 atoms, slowness is expected
   - Consider splitting large molecules

3. **Profile performance:**
   ```bash
   npm run test:perf
   # Review benchmark output
   ```

---

### "Canvas is laggy (not 60 FPS)"

**Cause:**
Main thread is overloaded.

**Solutions:**

1. **Enable WebWorker:**
   - Viewer3DPanel should automatically use it
   - Check if worker is spawning correctly
   - Open DevTools → Performance tab

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
   npm run test:perf
   # Review "Memory leak detection" section
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
   npm start  # Restart app
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

**Solution:**
1. Click "More info"
2. Click "Run anyway"
3. Confirm UAC prompt

#### "Visual Studio C++ runtime missing"

**Install:**
- [Visual C++ Redistributable](https://support.microsoft.com/en-us/help/2977003)

---

### Linux

#### "Application window fails to display"

**Cause:**
X11 or Wayland session issue.

**Solution:**
```bash
# Run with X11 explicitly
export DISPLAY=:0
npm start
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

```javascript
// In DevTools console:
import { parseSmilesWasm } from '@wasm-bindgen/chematic';
const mol = parseSmilesWasm('c1ccccc1');
console.log(mol);  // Should show molecule object
```

### Monitor State

Zustand provides debugging utilities:

```typescript
// In DevTools console:
import { moleculeStore } from './renderer/store/moleculeStore';

// View current state
const state = moleculeStore.getState();
console.log(state.molecule);

// Watch state changes
const unsubscribe = moleculeStore.subscribe((state) => {
  console.log('State updated:', state);
});
```

### Run with Debug Logging

Set environment variable:
```bash
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

- **GitHub Issues:** https://github.com/yourusername/chematic-draw/issues
- **GitHub Discussions:** For questions and feature requests
- **Email Support:** support@example.com

### Information to Include

When reporting a bug, include:

```markdown
**OS:** macOS 13.5
**Version:** chematic-draw 0.2.0
**Browser:** Chrome 120

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
A: All processing happens locally. No data sent to servers. Molecules stay on your computer.

**Q: Can I use this offline?**
A: Yes, fully offline application. No internet connection required.

**Q: How do I export my work?**
A: File → Export As → Choose format (SVG, PNG, XYZ, CSV, JSON)

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
4. **Email support** — support@example.com (response time: 24-48 hours)

We're here to help! 💬
