# Build Guide

Instructions for building chematic-draw from source.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Development Setup](#development-setup)
3. [Building](#building)
4. [Running](#running)
5. [Testing](#testing)
6. [Packaging](#packaging)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum
- **Node.js** 24 (see `electron/.nvmrc` / `electron/package.json`'s `engines.node`)
- **npm** 9+
- **Rust** 1.70+
- **Git** 2.30+

### Recommended
- **Rust** latest stable
- **macOS** 11+, **Windows** 10+, or **Ubuntu** 20.04+

### Platform-Specific

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node rust
```

**Ubuntu/Debian:**
```bash
# Install build essentials
sudo apt-get install build-essential git curl

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install nodejs

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Windows:**
- Install Node.js from [nodejs.org](https://nodejs.org)
- Install Rust from [rustup.rs](https://rustup.rs)
- Install Git from [git-scm.com](https://git-scm.com)
- Install Visual Studio Build Tools (C++ workload)

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/kent-tokyo/chematic-draw.git
cd chematic-draw
```

### 2. Install Dependencies

There is no root `package.json` — the Electron app (and every `npm` script
in this guide) lives under `electron/`.

```bash
cd electron

# Install Node.js packages
npm install

# Install Rust toolchain for WASM
rustup target add wasm32-unknown-unknown

# Install wasm-pack (required — the build scripts below shell out to it)
cargo install wasm-pack
```

### 3. Verify Installation

```bash
# Check versions
node --version      # Should be 24
npm --version       # Should be 9+
rustc --version     # Should be 1.70+
cargo --version
wasm-pack --version
```

---

## Building

### Build WASM Module

The WASM module is the Rust chemistry backend (`crates/chem-wasm`) compiled
to WebAssembly. Always build it through the npm scripts below, not a raw
`wasm-pack build` — `wasm-pack`'s `--out-dir` resolves relative to the crate
path argument, not your current directory, so a bare `wasm-pack build
--target web` run from inside `crates/chem-wasm` silently writes to
`crates/chem-wasm/pkg/`, which the app never loads from.

Run from `electron/`:

```bash
# Development build (web target — what the running app loads)
npm run build:wasm

# Production build (optimized)
npm run build:wasm:release

# Node target (needed for Jest, which runs WASM directly in Node)
npm run build:wasm:test
```

**Build output:**
- `electron/src/renderer/wasm/pkg/` — web target (`build:wasm`/`build:wasm:release`)
- `electron/src/renderer/wasm/pkg-node/` — Node target (`build:wasm:test`)
- Each contains `chem_wasm.js` (JS wrapper), `chem_wasm_bg.wasm` (binary), `chem_wasm.d.ts` (types)

### Build the Electron App

There's no separate "compile the app" step distinct from packaging — Vite
bundling (main process, preload, renderer) happens automatically as part of
`package`/`make`/`start`, driven by `electron/vite.main.config.mjs`,
`vite.preload.config.mjs`, and `vite.renderer.config.mjs`.

```bash
# From electron/
npm run package   # Unpacked app, for local inspection — out/<platform>/
npm run make      # Full distributable installers — out/make/
```

### Complete Build (Development)

```bash
cd electron
npm install
npm run build:wasm
npm run typecheck
npm start
```

---

## Running

### Development Mode

**Start Electron with hot reloading:**

```bash
cd electron
npm start
```

This launches:
- Main process (Electron)
- Renderer process (React)
- HMR (Hot Module Replacement) dev server
- Auto-reloads on file changes

**What you'll see:**
- New window opens with chematic-draw UI
- DevTools available (press F12)
- File changes auto-reload instantly

### Production Build

**Package as distributable:**

```bash
cd electron
npm run make
```

Creates platform-specific installers in `electron/out/make/`:
- `*.deb`, `*.rpm` (Linux)
- `*.zip` (macOS)
- Squirrel installer (Windows)

(Not `.dmg`/`.AppImage` — see `electron/forge.config.js`'s `makers` list.)

---

## Testing

All commands below run from `electron/`.

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Coverage output in: coverage/
```

Unit tests need the Node-target WASM build first (`npm run build:wasm:test`)
— they call the real compiled WASM binary, not a mock.

**Test suites (`src/__tests__/`):** `wasmBridge.test.ts`, `wasmContract.test.ts`,
`parseAnyContract.test.ts`, `wasmInit.test.ts`, `layoutDeterminism.test.ts`,
`reactionSchemeStore.test.ts`, `integration.test.ts`, `Viewer3DPanel.test.tsx`.

### E2E Tests (Playwright)

```bash
# Renderer tests (real Chromium + Vite dev server, no Electron shell)
npm run test:e2e

# Electron smoke test (the real packaged app via Playwright's _electron — run `npm run package` first)
npm run test:e2e:electron

# Both
npm run test:e2e:all

# Run with UI browser / step-through debug mode
npm run test:e2e:ui
npm run test:e2e:debug
```

**E2E test suites:**
- `e2e/renderer/*.e2e.ts` — canvas drawing, mechanism arrows, 3D viewer, workflows, WASM init (real browser, no Electron)
- `e2e/electron-smoke/app.smoke.ts` — the only suite that touches the real Electron main process/preload bridge

### Performance Benchmarks

```bash
npm run test:perf
```

Runs the real Node-target WASM binary against a fixed molecule corpus
(parse, canonical SMILES, fingerprint, similarity, MCS, layout, validation,
3D) and reports median/p90/max timings.

### Linting / Type Checking

```bash
# Real TypeScript type check
npm run typecheck

# `npm run lint` is currently a no-op — no ESLint configured yet
```

---

## Code Organization

```
chematic-draw/
├── crates/
│   ├── chem-wasm/              # Rust WASM module (the electron app's only chemistry dependency)
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── ...                     # chem-ui/chem-io: native egui app, frozen — not built by anything above
├── electron/
│   ├── src/
│   │   ├── main.js             # Electron main process
│   │   ├── preload.js          # IPC security context
│   │   ├── renderer.tsx        # React app entry
│   │   ├── renderer/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── store/          # Zustand stores
│   │   │   ├── wasm/           # WASM bridge + built pkg/pkg-node output
│   │   │   └── lib/            # Utilities
│   │   └── __tests__/          # Unit tests
│   ├── e2e/                    # E2E tests (renderer/ + electron-smoke/)
│   ├── jest.config.js
│   ├── playwright.config.ts
│   ├── package.json
│   ├── forge.config.js
│   └── vite.main.config.mjs / vite.preload.config.mjs / vite.renderer.config.mjs
├── docs/                        # Documentation
└── internal_docs/ROADMAP.md     # Gitignored working roadmap, not published
```

---

## Development Workflow

### Typical Development Cycle

1. **Start dev server:**
   ```bash
   cd electron
   npm start
   ```

2. **Edit TypeScript/React files**
   - Changes auto-reload in running app
   - React DevTools available

3. **Modify the WASM module:**
   ```bash
   npm run build:wasm
   # Refresh Electron app manually (Ctrl+R) — WASM changes aren't hot-reloaded
   ```

4. **Run tests:**
   ```bash
   npm test          # Unit tests
   npm run test:e2e  # E2E tests
   ```

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "Feature: Description"
   git push
   ```

### Hot Reload

- **React code:** Automatic (HMR enabled)
- **WASM module:** Manual rebuild required (`npm run build:wasm`)
- **Main process:** Restart required (use `npm start` again)

### Debugging

**JavaScript/React:**
- Press `F12` in running app
- DevTools opens with console, debugger, profiler
- Set breakpoints and inspect state

**Rust WASM:**
- Build with `npm run build:wasm` (not `:release` — keeps debug info)
- Browser DevTools shows WASM code
- Use `console.log()` for debugging

**Electron Main Process:**
- Start with: `npm start`
- DevTools not available by default for the main process
- Add debugging via VS Code Debugger

---

## Build Configuration

### Vite Configuration

**Files:** `electron/vite.main.config.mjs`, `vite.preload.config.mjs`, `vite.renderer.config.mjs`

Three separate configs (main process, preload, renderer), wired together by
`electron/forge.config.js`'s Vite plugin. Renderer dev server runs on port
5173.

### Jest Configuration

**File:** `electron/jest.config.js`

Key settings:
- TypeScript support (ts-jest)
- jsdom test environment
- `src/test-setup.ts` — global setup, including the WASM module mock for
  the Performance CI job's node-target-only builds

### Playwright Configuration

**File:** `electron/playwright.config.ts`

Two projects: `renderer-e2e` (Chromium against the Vite dev server) and
`electron-smoke` (the real packaged Electron app via `_electron.launch()`).

---

## Troubleshooting

### "wasm-pack command not found"

**Solution 1: Install via cargo**
```bash
cargo install wasm-pack
```

**Solution 2: Run without a global install**
```bash
npx wasm-pack --version   # confirms it's reachable via npx
npm run build:wasm        # the actual build script (see above)
```

### "Cannot find module './pkg'" (or `./pkg-node`)

This means WASM wasn't built for the target the code path needs.

```bash
cd electron
npm run build:wasm        # for the running app (web target)
npm run build:wasm:test   # for Jest (Node target)
```

### "Electron fails to start"

**Check:**
1. Node version: `node --version` (should be 24)
2. Dependencies: `cd electron && npm install` (run again)
3. WASM built: `ls electron/src/renderer/wasm/pkg/`

**Debug:**
```bash
cd electron
npm start 2>&1 | tee debug.log
# Review debug.log for error details
```

### "Tests timeout or fail"

**Playwright E2E:**
- Increase timeout in `playwright.config.ts`
- Check browser compatibility: `npx playwright install`
- Run in debug mode: `npm run test:e2e:debug`

**Jest:**
- Check global setup in `src/test-setup.ts`
- Confirm `npm run build:wasm:test` has been run (unit tests call the real WASM binary)
- Increase timeout: `jest.setTimeout(10000)` in test file

### "WASM module not loading"

**Check in browser console:**
```javascript
// electron/src/renderer/wasm/wasmBridge.ts imports the built package directly:
import * as wasmModule from './pkg';
// If this throws, the web-target build is missing or stale — rebuild
// with `npm run build:wasm`.
```

**Common causes:**
- WASM not built (`npm run build:wasm` never run, or run for the wrong target)
- Stale build after a Rust source change (rebuild needed — not hot-reloaded)

### "Performance issues during development"

**Solutions:**
- Use the release build: `npm run build:wasm:release`
- Profile with: `npm run test:perf` (performance benchmarks)
- Check DevTools Performance tab

---

## Continuous Integration

### GitHub Actions

Real workflow files, not illustrative examples:
- `.github/workflows/test.yml` — typecheck, unit tests + coverage gate, E2E, Electron smoke, performance benchmarks
- `.github/workflows/build.yml` — per-OS package builds, checksums, release publishing
- `.github/workflows/nightly.yml` — dependency/license audit, SBOM

All jobs `cd electron` before running `npm` commands, mirroring this guide.

### Local CI Simulation

```bash
cd electron
npm install
npm run build:wasm:test
npm run typecheck
npm test
npm run test:e2e
npm run test:perf
```

---

## Distribution

### Building Release Packages

```bash
cd electron

# Build WASM (release)
npm run build:wasm:release

# Build Electron packages for all platforms
npm run make

# Output in: out/make/
```

### Code Signing (macOS)

For production macOS builds with notarization:

```bash
# Set signing certificate
export APPLE_ID=your-email@example.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx

npm run make
```

See [Electron docs](https://www.electronjs.org/docs/tutorial/code-signing) for details.

---

## Performance Optimization

### Profile WASM

```bash
cd electron

# Build with debug info (not --release)
npm run build:wasm

# Run benchmarks
npm run test:perf

# Review output for bottlenecks
```

### Profile Rendering

```bash
# In DevTools:
1. Open Performance tab
2. Record while interacting with 3D viewer
3. Identify slow frames (>16.67ms for 60 FPS)
4. Use Flamegraph to find bottlenecks
```

---

## Next Steps

- 📖 See [API Reference](./API.md) for WASM functions
- 🏗️ See [Architecture](./ARCHITECTURE.md) for system design
- 🔧 See [Troubleshooting](./TROUBLESHOOTING.md) for common issues

---

## Support

- **Build issues?** Check troubleshooting section above
- **WASM errors?** Review [WASM guide](https://rustwasm.org/)
- **Electron problems?** See [Electron docs](https://www.electronjs.org/docs)
- **Report bugs:** GitHub Issues
