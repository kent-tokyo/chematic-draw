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
- **Node.js** 18+ (18.13.0 or later)
- **npm** 9+
- **Rust** 1.70+
- **Git** 2.30+

### Recommended
- **Node.js** 20 (LTS)
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
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
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
git clone https://github.com/yourusername/chematic-draw.git
cd chematic-draw
```

### 2. Install Dependencies

```bash
# Install Node.js packages
npm install

# Install Rust toolchain for WASM
rustup target add wasm32-unknown-unknown

# Install wasm-pack globally (optional but recommended)
cargo install wasm-pack
```

### 3. Verify Installation

```bash
# Check versions
node --version      # Should be 18+
npm --version       # Should be 9+
rustc --version     # Should be 1.70+
cargo --version
wasm-pack --version
```

---

## Building

### Build WASM Module

The WASM module is the Rust chemistry backend compiled to WebAssembly.

```bash
# Build for development (faster, larger bundle)
cd crates/chem-wasm
wasm-pack build --target web

# Build for production (optimized, smaller bundle)
wasm-pack build --target web --release

# Output appears in: pkg/
```

**Build output:**
- `pkg/chem_wasm.js` — JavaScript wrapper
- `pkg/chem_wasm.wasm` — WebAssembly binary (~500KB optimized)
- `pkg/chem_wasm.d.ts` — TypeScript definitions

### Build Electron App

```bash
# From root directory
npm run build

# Output in: dist/
```

**Build process:**
1. TypeScript → JavaScript compilation
2. WASM module integration
3. Vite bundling for main process
4. Vite bundling for renderer process

### Complete Build (Development)

```bash
cd crates/chem-wasm && wasm-pack build --target web && cd ../..
npm install
npm run build
```

---

## Running

### Development Mode

**Start Electron with hot reloading:**

```bash
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
npm run make
```

Creates platform-specific installers in `out/make/`:
- `*.dmg` (macOS)
- `*.exe` (Windows)
- `*.AppImage` (Linux)

---

## Testing

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

**Test suites:**
- `src/__tests__/wasmBridge.test.ts` — WASM function testing
- `src/__tests__/Viewer3DPanel.test.tsx` — React component tests
- `src/__tests__/integration.test.ts` — End-to-end workflows

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run with UI browser
npm run test:e2e:ui

# Debug mode (step through)
npm run test:e2e:debug

# Test reports in: test-results/
```

**E2E test suites:**
- `e2e/molecule-drawing.e2e.ts` — Canvas drawing functionality
- `e2e/viewer-3d.e2e.ts` — 3D panel operations
- `e2e/workflow.e2e.ts` — Complete workflows

### Performance Benchmarks

```bash
# Run performance benchmarks
npm run test:perf

# Output includes:
# - 3D generation timing
# - Memory usage analysis
# - Scaling analysis (O(n) verification)
# - Recommendations for optimization
```

### Linting

```bash
# Run TypeScript compiler check
npm run lint

# Note: ESLint not configured, may add in future
```

---

## Code Organization

```
chematic-draw/
├── crates/
│   ├── chem-wasm/              # Rust WASM module
│   │   ├── Cargo.toml
│   │   └── src/lib.rs
│   └── ...
├── electron/
│   ├── src/
│   │   ├── main.js             # Electron main process
│   │   ├── preload.js          # IPC security context
│   │   ├── renderer.tsx        # React app entry
│   │   ├── renderer/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── store/          # Zustand stores
│   │   │   ├── wasm/           # WASM bridge
│   │   │   └── lib/            # Utilities
│   │   └── __tests__/          # Unit tests
│   ├── e2e/                    # E2E tests
│   ├── jest.config.js
│   ├── playwright.config.ts
│   ├── package.json
│   └── vite.config.ts
├── docs/                        # Documentation
└── README.md
```

---

## Development Workflow

### Typical Development Cycle

1. **Start dev server:**
   ```bash
   npm start
   ```

2. **Edit TypeScript/React files**
   - Changes auto-reload in running app
   - React DevTools available

3. **Modify WASM module:**
   ```bash
   cd crates/chem-wasm
   wasm-pack build --target web
   cd ../..
   # Refresh Electron app manually (Ctrl+R)
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
- **WASM module:** Manual rebuild required
- **Main process:** Restart required (use `npm start` again)

### Debugging

**JavaScript/React:**
- Press `F12` in running app
- DevTools opens with console, debugger, profiler
- Set breakpoints and inspect state

**Rust WASM:**
- Build with `wasm-pack build` (not `--release`)
- Browser DevTools shows WASM code
- Use `console.log()` for debugging

**Electron Main Process:**
- Start with: `npm start`
- DevTools not available by default
- Add debugging via VS Code Debugger

---

## Build Configuration

### Vite Configuration

**File:** `electron/vite.config.ts`

Key settings:
- Main process bundling
- Renderer bundling
- WASM asset handling
- Development server port (5173)

### Jest Configuration

**File:** `electron/jest.config.js`

Key settings:
- TypeScript support (ts-jest)
- jsdom test environment
- Mock setup for WASM

### Playwright Configuration

**File:** `electron/playwright.config.ts`

Key settings:
- Chrome/Chromium browser
- Screenshot/video capture on failure
- 30-second timeout per test

---

## Troubleshooting

### "wasm-pack command not found"

**Solution 1: Install globally**
```bash
cargo install wasm-pack
```

**Solution 2: Use cargo**
```bash
cargo install wasm-pack
```

**Solution 3: Use npm script**
```bash
npx wasm-pack build --target web
```

### "Cannot find module '@wasm-bindgen'"

This usually means WASM wasn't built.

```bash
cd crates/chem-wasm
wasm-pack build --target web
cd ../..
npm install
```

### "Electron fails to start"

**Check:**
1. Node version: `node --version` (should be 18+)
2. Dependencies: `npm install` (run again)
3. WASM built: `ls crates/chem-wasm/pkg/`

**Debug:**
```bash
npm start 2>&1 | tee debug.log
# Review debug.log for error details
```

### "Tests timeout or fail"

**Playwright E2E:**
- Increase timeout in `playwright.config.ts`
- Check browser compatibility: `npx playwright install`
- Run in debug mode: `npm run test:e2e:debug`

**Jest:**
- Check mocks in `src/__tests__/setup.ts`
- Review WASM module mocks
- Increase timeout: `jest.setTimeout(10000)` in test file

### "WASM module not loading"

**Check in browser console:**
```javascript
// Verify WASM module
import { parseSmilesWasm } from '@wasm-bindgen/chematic';
console.log(parseSmilesWasm);  // Should be a function
```

**Common causes:**
- WASM not built
- Incorrect import path
- WASM MIME type misconfigured (check server headers)

### "Performance issues during development"

**Solutions:**
- Use `--release` flag: `wasm-pack build --target web --release`
- Profile with: `npm run bench` (performance benchmarks)
- Check DevTools Performance tab

---

## Continuous Integration

### GitHub Actions

Tests run automatically on push/PR:

```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test
      - run: npm run test:e2e
```

### Local CI Simulation

```bash
# Simulate CI locally
npm install
npm run build
npm test
npm run test:e2e
npm run test:perf
```

---

## Distribution

### Building Release Packages

```bash
# Clean previous builds
npm run clean

# Build WASM
cd crates/chem-wasm && wasm-pack build --target web --release && cd ../..

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
# Build with profiling
wasm-pack build --target web

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
