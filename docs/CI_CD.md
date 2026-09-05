# CI/CD Pipeline Guide

Automated testing, building, and releasing with GitHub Actions.

## Table of Contents

1. [Overview](#overview)
2. [Workflows](#workflows)
3. [Configuration](#configuration)
4. [Release Process](#release-process)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

---

## Overview

chematic-draw uses **GitHub Actions** for continuous integration and deployment.

### Pipeline Summary

```
Push to main/PR
    ↓
Test Workflow (Ubuntu)
    ├─ Lint & Type Check
    ├─ Unit Tests (+ coverage)
    ├─ E2E Tests
    └─ Performance Benchmarks
    ↓
Build Workflow (on tag push)
    ├─ Build on Linux
    ├─ Build on macOS
    ├─ Build on Windows
    ↓
Release Workflow (automatic)
    └─ Create GitHub release with assets
```

### Status Badges

Add to README:

```markdown
![Tests](https://github.com/kent-tokyo/chematic-draw/actions/workflows/test.yml/badge.svg)
![Build](https://github.com/kent-tokyo/chematic-draw/actions/workflows/build.yml/badge.svg)
```

---

## Workflows

### 1. Test Workflow (`.github/workflows/test.yml`)

Runs on every **push** to `main`/`develop` and on **pull requests**.

**Triggers:**
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

**Jobs:**

| Job | Time | Purpose |
|-----|------|---------|
| **Lint & Type Check** | 2-3 min | ESLint + TypeScript validation |
| **Unit Tests** | 5-8 min | Jest unit tests + coverage |
| **E2E Tests** | 8-12 min | Playwright browser tests |
| **Performance Benchmarks** | 5-10 min | Performance regressions |
| **Summary** | <1 min | Overall pass/fail |

**Steps:**
1. Checkout code
2. Setup Node 24
3. Setup Rust + WASM target
4. Build WASM module
5. Install dependencies
6. Run tests

Note: "Lint & Type Check" runs both `npm run lint` (ESLint —
typescript-eslint + react-hooks recommended configs) and `npm run
typecheck` (real `tsc --noEmit`). In the v0.9.4 checkout, lint completes with
zero errors and no warnings; rerun it after dependency or source changes.

**Coverage:**
- Coverage report uploaded to [Codecov](https://codecov.io)
- Accessible via badge: `codecov/codecov-action`

**Artifacts:**
- Playwright reports (if tests fail)
- Coverage data

---

### 2. Build Workflow (`.github/workflows/build.yml`)

Runs on **tag push** (`v*`) or manual dispatch.

**Triggers:**
```yaml
on:
  push:
    tags: ['v*']
  workflow_dispatch:
```

**Jobs:** one `build` job with an OS matrix (`ubuntu-latest`/`macos-latest`/`windows-latest`), plus a `release` job.

| OS | Artifacts (real Electron Forge makers — see `electron/forge.config.js`) |
|----|---------|
| Ubuntu | `.deb`, `.rpm` (maker-deb/maker-rpm — **not** `.AppImage`) |
| macOS | `.zip` (maker-zip — **not** `.dmg`) |
| Windows | `.exe`/`.nupkg` (maker-squirrel) |

Every artifact set also gets a `SHA256SUMS-<OS>.txt` checksum file
(generated in a dedicated step, uploaded alongside the binaries), and the
build job includes a "Check version consistency" step comparing
`electron/package.json`, `crates/chem-wasm/Cargo.toml`, and the git tag.

**Steps per platform:**
1. Checkout code
2. Setup tools (Node, Rust, wasm-pack)
3. Build WASM (release optimized)
4. Build Electron package (`npm run make`)
5. Generate SHA-256 checksums
6. Upload artifacts

**Code signing / notarization is optional.** Release builds sign macOS and
Windows artifacts when the corresponding GitHub secrets are configured. Until
Apple secrets are available, the tagged release workflow explicitly publishes
an unsigned macOS `.zip`; the warning is emitted by
`scripts/verify-signing-env.sh`. Checksums provide integrity evidence only,
not publisher authenticity.

```yaml
# Optional GitHub Actions secrets for signed releases:
APPLE_ID: Apple Developer account email
APPLE_APP_SPECIFIC_PASSWORD: Generated in Apple ID settings
APPLE_TEAM_ID: Developer team ID
CSC_LINK: Code signing certificate (base64)
CSC_KEY_PASSWORD: Certificate password
```

---

### 3. Nightly Workflow (`.github/workflows/nightly.yml`)

Runs daily at **2 AM UTC**.

**Triggers:**
```yaml
on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:
```

**Jobs** (real job ids in `nightly.yml`):
- **build**: full build with all tests
- **security-audit**: `npm audit`, `cargo audit` (via `taiki-e/install-action@v2`)
- **dependency-check**: `npm outdated`, `cargo outdated` (informational, non-blocking)
- **sbom-and-license**: SPDX SBOM (`anchore/sbom-action@v0`) plus Rust (`cargo-license`) and npm (`license-checker`) license reports, uploaded as a workflow artifact

**Purpose:**
- Detect issues that don't appear on PR
- Monitor dependency security
- Track emerging problems

---

## Configuration

### Prerequisites

**GitHub Repository Settings:**

1. **Secrets** (Settings → Secrets and variables → Actions)
   ```
   APPLE_ID
   APPLE_APP_SPECIFIC_PASSWORD
   APPLE_TEAM_ID
   CSC_LINK
   CSC_KEY_PASSWORD
   WIN_CSC_LINK
   WIN_CSC_KEY_PASSWORD
   ```

2. Node/Rust versions are hardcoded in the workflow files (Node `'24'` via
   `actions/setup-node@v4`'s `node-version`, Rust via
   `dtolnay/rust-toolchain@stable`) — not read from repo Variables.

### Caching

**Node.js dependencies:**
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```
Caches `node_modules/` automatically.

**Rust dependencies:**
```yaml
- uses: Swatinem/rust-cache@v2
  with:
    workspaces: 'crates'
```
Caches Cargo artifacts.

### Parallel Jobs

Jobs run in parallel, reducing total pipeline time:
- Test jobs: ~15-20 min total (sequential steps, parallel job execution)
- Build jobs: ~20-30 min total (3 OS builds in parallel)

---

## Release Process

### Creating a Release

#### Step 1: Update Version

```bash
# Update the application version in electron/package.json. Keep
# crates/chem-wasm/Cargo.toml and packages/chematic-contract/package.json in
# sync when the public contract changes.
cd electron && npm version 0.9.4
cd ..

# Also update crates/chem-wasm/Cargo.toml's version to match — the build's
# "Check version consistency" step fails the build if these two (and the
# git tag) disagree.

# Commit and tag
git commit -am "release: v0.9.4"
git tag v0.9.4
git push origin main --tags
```

#### Step 2: GitHub Actions Triggers

Push to `main` with tags automatically triggers:
1. **Test workflow** (normal PR tests)
2. **Build workflow** (creates binaries)
3. **Release workflow** (publishes to Releases)

#### Step 3: Release Assets

GitHub automatically creates a release with:
- `.deb`/`.rpm` (Linux), `.zip` (macOS), `.exe`/`.nupkg` (Windows) — see the real maker table above
- `SHA256SUMS-<OS>.txt` per platform
- Marked as a pre-release automatically when the tag contains a `-`
  (e.g. `v0.3.0-rc.1`) — `prerelease: ${{ contains(github.ref_name, '-') }}`
- Auto-generated release notes

### Semantic Versioning

Follow [semver](https://semver.org/):

```
MAJOR.MINOR.PATCH
  0.   2.      1
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Examples:
- `v0.1.0` → Initial release
- `v0.2.0` → Add 3D viewer feature
- `v0.2.1` → Fix 3D rendering bug

### Pre-releases

Tag with suffix for pre-releases:

```bash
git tag v0.3.0-alpha.1  # Alpha (buggy)
git tag v0.3.0-beta.1   # Beta (feature complete, testing)
git tag v0.3.0-rc.1     # Release candidate
```

These appear as "Pre-release" in GitHub.

---

## Monitoring

### GitHub Actions Dashboard

**View at:** https://github.com/kent-tokyo/chematic-draw/actions

Shows:
- Workflow runs
- Job status (pass/fail)
- Execution time
- Artifacts

### Workflow Status

**Quick status:**
```bash
# View latest runs
gh run list --workflow test.yml

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

### Email Notifications

GitHub sends emails for:
- Failed workflows
- Completed scheduled workflows
- Action required (secrets, permissions)

**Configure:** Settings → Notifications

### Codecov Integration

Coverage reports appear as:
1. PR comment with coverage diff
2. Badge in README
3. Historical trends at codecov.io

---

## Performance Optimization

### Cache Strategy

**Node.js:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24'
    cache: 'npm'
    cache-dependency-path: 'electron/package-lock.json'
```

**Rust:**
```yaml
- uses: Swatinem/rust-cache@v2
  with:
    workspaces: 'crates'
    cache-all-crates: true
```

### Artifact Upload Strategy

Upload only final artifacts (not intermediate builds):

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: linux-binaries
    path: electron/out/make/**/*.deb
    retention-days: 30  # Auto-delete after 30 days
```

### Parallel Matrix

Build on multiple OS in parallel:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
  fail-fast: false  # Continue even if one fails
```

---

## Troubleshooting

### Build Fails: "WASM module not found"

**Cause:** wasm-pack not installed or build failed.

**Solution:**
```yaml
- name: Install wasm-pack
  run: cargo install wasm-pack --locked
- name: Build WASM
  working-directory: electron
  run: npm run build:wasm  # or build:wasm:release / build:wasm:test
```

### Test Timeout (>60 min)

**Cause:** Large dependency install, slow network.

**Solutions:**
1. Increase timeout:
   ```yaml
   timeout-minutes: 120
   ```

2. Use cache more aggressively:
   ```yaml
   cache-dependency-path: '**/package-lock.json'
   ```

### Secrets Not Available

**Cause:** Secrets not configured in GitHub.

**Solution:**
1. Go to Settings → Secrets and variables → Actions
2. Add required secrets
3. Re-run workflow

### macOS Codesigning / Windows Signing

Signing is optional. If Apple secrets are absent, the release workflow emits
an explicit unsigned macOS `.zip` and continues. Windows signing remains
enabled whenever its certificate secrets are present.

```bash
# Export certificate as base64
base64 -i certificate.p12 | pbcopy

# Set secret in GitHub: CSC_LINK
# Set password in GitHub: CSC_KEY_PASSWORD
# (Windows: WIN_CSC_LINK / WIN_CSC_KEY_PASSWORD)
```

---

## Advanced Configuration

### Custom Notifications

Send notifications on failure:

```yaml
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: custom
    custom_payload: |
      {text: `Build failed on ${process.env.AS_BRANCH}`}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Conditional Steps

Run steps based on conditions:

```yaml
- name: Build WASM
  if: matrix.os == 'ubuntu-latest'  # Run only on Linux
  working-directory: electron
  run: npm run build:wasm  # not a raw `wasm-pack build` — see BUILD.md
```

### Matrix Variables

`electron-forge`'s `make` already produces the right artifact type per OS on
its own (no `make:mac`/`make:win` variants exist or are needed) — the real
`build.yml` just runs `npm run make` on every OS in the matrix:

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
steps:
  - working-directory: electron
    run: npm run make
```

---

## Security Best Practices

1. **Use trusted actions**
   - Prefer official actions (actions/checkout@v4)
   - Pin to commit hash: `actions/checkout@abc123...`

2. **Minimal secrets**
   - Only store sensitive data as secrets
   - Rotate secrets regularly

3. **Artifact retention**
   - Delete old artifacts: `retention-days: 30`
   - Don't store secrets in artifacts

4. **Dependency updates**
   - Run `npm audit` regularly
   - Update dependencies in nightly builds
   - Use Dependabot for auto-updates

---

## Next Steps

- 📖 See [Build Guide](./BUILD.md) for local builds
- 🧪 See [Troubleshooting](./TROUBLESHOOTING.md) for issues
- 🚀 See [Quick Start](./QUICK_START.md) for user docs

---

## References

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Artifact Management](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
