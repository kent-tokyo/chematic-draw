# Contributing to chematic-draw

Thank you for your interest in contributing! This guide explains how to contribute.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Making Changes](#making-changes)
4. [Testing](#testing)
5. [Submitting Changes](#submitting-changes)
6. [Code Style](#code-style)
7. [Commit Messages](#commit-messages)
8. [Pull Requests](#pull-requests)

---

## Getting Started

### Prerequisites

- **Node.js** 24 (see `electron/package.json`'s `engines.node`)
- **Rust** 1.70+
- **Git** 2.30+
- **GitHub account**

### Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/chematic-draw.git
cd chematic-draw

# Add upstream remote
git remote add upstream https://github.com/kent-tokyo/chematic-draw.git
```

---

## Development Setup

There is no root-level `package.json` — the Electron app (and every `npm`
command in this guide) lives under `electron/`.

### 1. Install Dependencies

```bash
cd electron
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

### 2. Build WASM

```bash
# From electron/ — always through this script, not a raw `wasm-pack build`.
# wasm-pack's --out-dir resolves relative to the crate path argument, not
# your cwd, so a bare invocation silently writes to the wrong directory.
npm run build:wasm
```

### 3. Start Development Server

```bash
npm start
```

Your changes auto-reload as you edit.

---

## Making Changes

### Create a Feature Branch

```bash
# Update main
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/short-description
# or
git checkout -b fix/bug-number
```

### Branch Naming Convention

- **Features:** `feature/add-xyz` or `feature/improve-xyz`
- **Bugs:** `fix/issue-123` or `fix/short-description`
- **Docs:** `docs/update-guide`
- **Tests:** `test/add-coverage`

### Make Your Changes

Edit files in:
- `electron/src/renderer/` — React components
- `crates/chem-wasm/src/` — Rust WASM code
- `docs/` — Documentation

### Test Your Changes

All commands below run from `electron/`.

```bash
# Unit tests
npm test

# E2E tests (real Chromium, no Electron shell — npm run test:e2e:electron
# for the real packaged app, which needs `npm run package` first)
npm run test:e2e

# Specific test file
npm test -- src/__tests__/wasmBridge.test.ts

# Lint (ESLint) and type check (real tsc --noEmit)
npm run lint
npm run typecheck
```

---

## Testing

### Write Tests for New Features

```typescript
// electron/src/__tests__/myfeature.test.ts

describe('My Feature', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });

  it('should handle edge case', () => {
    const result = myFunction(edgeCase);
    expect(result).toThrow();
  });
});
```

### Test Coverage

```bash
npm run test:coverage
```

Aim for:
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

### E2E Testing

For UI features, add Playwright tests:

```typescript
// electron/e2e/renderer/myfeature.e2e.ts — real browser, no Electron shell.
// A test that needs the actual Electron main process/preload bridge goes
// in electron/e2e/electron-smoke/ instead.

test('should render my feature', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="my-button"]');
  await expect(page.locator('[data-testid="my-output"]')).toBeVisible();
});
```

---

## Submitting Changes

### Before You Submit

- **Run tests:** `npm test` (all pass)
- **Check types:** `npm run typecheck` (no errors)
- **Update docs:** If you changed behavior, update docs/
- **One feature per PR:** Don't combine unrelated changes
- **Commit messages:** Follow [Commit Messages](#commit-messages) section

### Commit & Push

```bash
# Commit changes
git add .
git commit -m "feat: Add new 3D rotation algorithm

- Implements quaternion-based rotation
- Improves performance by 20%
- Adds test coverage for edge cases

Closes #123"

# Push to your fork
git push origin feature/my-feature
```

### Create Pull Request

1. Go to [GitHub](https://github.com/kent-tokyo/chematic-draw)
2. Click "New Pull Request"
3. Set:
   - Base: `upstream/main`
   - Compare: `feature/my-feature`
4. GitHub pre-fills the description from `.github/pull_request_template.md`
   — fill it in (description, type of change, what you tested, docs
   touched, breaking changes)
5. Submit PR

### PR Checklist

Before marking as ready:

- ✅ Tests pass (`npm test`)
- ✅ Types pass (`npm run typecheck`)
- ✅ No console errors
- ✅ Documentation updated
- ✅ Commit messages clear
- ✅ No unrelated changes

---

## Code Style

### TypeScript

Follow these conventions:

```typescript
// Use const by default
const value = 123;

// Explicit types for function parameters
function process(mol: MoleculeDto): string {
  return mol.atoms.length.toString();
}

// Use interfaces for objects
interface MyObject {
  id: number;
  name: string;
}

// Use enums for constants
enum ReactionType {
  SN1 = 'sn1',
  SN2 = 'sn2',
}

// Use async/await, not .then()
const coords = await wasmBridge.generate3dCoords(mol);

// Use template literals for strings
const message = `Molecule has ${mol.atoms.length} atoms`;
```

### Rust

Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/):

```rust
// Use descriptive names
pub fn generate_3d_coordinates(mol: &Molecule) -> Result<Coords3d> {
  // ...
}

// Proper error handling
match result {
  Ok(coords) => Ok(coords),
  Err(e) => Err(anyhow!("Failed: {}", e)),
}

// Comments for non-obvious logic
// Maximum common substructure search uses bitmask DP
fn find_mcs_impl() { }

// No trailing semicolons in unit tests
#[test]
fn test_parsing() {
  assert!(true)
}
```

### React Components

```typescript
// Functional components with hooks
export const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<Type>(initial);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return <div>{state}</div>;
};

// Memoize if needed
export const MemoComponent = React.memo(MyComponent);

// Extract custom hooks
const useMyHook = () => {
  const store = myStore((s) => s.value);
  return store;
};
```

### CSS/Styling

```css
/* Use semantic class names */
.molecule-canvas { }
.sidebar-panel { }
.button-primary { }

/* Avoid !important */
.element {
  display: flex; /* Good */
  display: flex !important; /* Bad */
}

/* Use consistent spacing */
.element {
  margin: 8px;
  padding: 12px;
}
```

### Comments

```typescript
// Use comments sparingly (code should be self-documenting)
// Good:
const mcsAtoms = findCommonAtoms(molA, molB);

// Bad:
// Find the MCS
const mcs = f(a, b);

// OK - explain WHY, not WHAT
// Use bitmask DP for O(n²) MCS search
// (simpler than graph matching algorithms)
function findMcs() { }
```

---

## Commit Messages

### Format

```
<type>: <subject>

<body>

<footer>
```

### Type

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `perf:` Performance improvement
- `chore:` Build, CI, dependencies

### Subject

- Imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at end
- <50 characters

### Body

- Explain WHAT and WHY (not HOW)
- Wrap at 72 characters
- Separate from subject with blank line
- Bullet points are fine

### Footer

```
Closes #123
Refs #456
Breaking change: description
```

### Examples

```
feat: Add quaternion-based 3D rotation

- Improves performance by 20% vs. Euler angles
- Fixes gimbal lock issues in edge cases
- Adds test coverage for 360° rotations

Closes #42

---

fix: Handle empty molecule in 3D viewer

The 3D panel crashed when loading a molecule with no atoms.
Added validation to check atom count before projection.

Fixes #51

---

docs: Update API reference for v0.2.0

Add examples for new fingerprint similarity functions.
Update performance targets based on latest benchmarks.
```

---

## Pull Requests

### Review Process

1. **Automated checks:**
   - Tests pass
   - Type checking passes
   - Coverage maintained

2. **Code review:**
   - 1+ maintainer approval
   - No unresolved comments

3. **Merge:**
   - Squash commits to 1-2 logical commits
   - Merge to main

### Responding to Feedback

```
# If reviewer suggests changes
- Make edits
- Push new commits
- Don't force-push (keeps conversation)
- Reply in comments

# If you disagree
- Explain your reasoning respectfully
- Ask for second opinion if needed
- Maintainer makes final call
```

### Merge Criteria

PR is ready to merge if:

- ✅ All checks pass
- ✅ Approved by 1+ maintainer
- ✅ No merge conflicts
- ✅ Commits are clean & documented
- ✅ Changes are focused

---

## Getting Help

### Questions?

- **GitHub Discussions:** Ask questions in Q&A
- **GitHub Issues:** Report bugs or request features — use the bug report
  or feature request template under `.github/ISSUE_TEMPLATE/`
- **Pull Request Comments:** Ask for clarification on review

### Resources

- [Documentation](./docs/)
- [API Reference](./docs/API.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

---

## Code of Conduct

This project adheres to the [Contributor Covenant](https://www.contributor-covenant.org/).

By participating, you agree to:

- Be respectful and inclusive
- Provide constructive feedback
- Assume good intent
- Report violations to maintainers

---

## Recognition

Contributors are recognized in:
- GitHub contributors page
- Release notes / [CHANGELOG.md](./CHANGELOG.md)

Thank you for contributing! 💙
