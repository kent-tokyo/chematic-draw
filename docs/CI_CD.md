# CI and release automation

GitHub Actions is the publication authority; a successful local command is not
evidence that a GitHub release, Pages deployment, or signed artifact exists.

## Workflows

| Workflow | Trigger | What it proves |
|---|---|---|
| `test.yml` | push and pull request | configuration, lint/typecheck, unit/coverage, renderer E2E, packaged Electron smoke, and performance jobs |
| `build.yml` | `main`, `v*` tag, dispatch | candidate gate, Linux/macOS/Windows Forge builds, checksums, and tagged release path |
| `playground-pages.yml` | Playground-relevant push or dispatch | built static Playground deployment |
| `nightly.yml` | scheduled or dispatch | build, runtime/development audits, dependency report, SBOM, and license artifacts |

All workflows force JavaScript actions onto Node 24. `npm run check:ci-config`
checks workflow/version invariants locally before the wider candidate gate.

## Local sequence

```bash
cd electron
npm run verify:candidate
npm run package
npm run test:e2e:electron
```

Use `npm run verify:ci` when changing workflow-facing configuration. Package
before Electron smoke; renderer E2E alone cannot validate main/preload IPC.

## Release sequence

1. Update versioned manifests and `CHANGELOG.md`.
2. Run the local candidate gate and review `git diff --check`.
3. Commit the release snapshot and create its matching `vX.Y.Z` tag.
4. Push commit and tag, then inspect the exact GitHub Actions run.
5. Confirm uploaded artifacts, checksums, release record, and (when relevant)
   the deployed Playground commit.

Forge produces `.deb`/`.rpm` on Linux, `.zip` on macOS, and Squirrel `.exe`/
`.nupkg` on Windows. Locally produced artifacts are unsigned. Checksums prove
integrity, not publisher identity; signing/notarization require repository
secrets and a separate platform verification.

## Failure handling

Read the first failed job and its artifact before retrying. A dependency/network
failure is not a source regression. Do not bypass a failing release gate by
publishing a locally built artifact. See [Release Readiness](RELEASE_READINESS.md)
for the evidence that remains external.
