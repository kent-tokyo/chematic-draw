# Changelog

Notable changes to chematic-draw. Dates use ISO 8601 format. See the git log
for the full development history.

## [Unreleased]

### Changed

- Updated artifact upload and download actions to v5, removing their deprecated
  Node 20 runtime warnings from GitHub Actions.

## [1.0.12] - 2026-09-22

### Added

- Completed the ChemDraw-familiar UI0–UI6 workspace: real wedge/dash bonds,
  five- and six-membered rings, aromatic rings, custom atom labels, reaction
  arrows, text, brackets, and one-step undo for drawing annotations.
- Added a resizable left Templates drawer whose click and drag actions merge
  into the current document, plus distinct right-side Properties, Query, and
  Stereo panels.
- Added real Electron New/Open/Save toolbar actions, Clean Up and zoom controls,
  Object distribute/flip commands, and a canonical command-placement inventory.

### Changed

- Reorganized native menus around File, Edit, View, Object, Structure, Search,
  Window, and Help while omitting unsupported lookalike commands.
- Persisted Main Tools, General Toolbar, Status Bar, Templates, sidebar widths,
  active panel, and familiar/compact workspace choice in validated desktop and
  browser settings.

### Validation

- Typecheck, ESLint, candidate verification, and coverage pass locally.
- Jest: 55 suites passed; 465 tests passed, 6 skipped.
- Renderer E2E: 114/114; built Playground E2E: 1/1; packaged Electron smoke:
  28/28; Rust `chem-wasm`: 30/30.

## [1.0.11] - 2026-09-22

### Added

- Added a shared ChemDraw-oriented desktop and browser workspace with familiar
  top commands, a left drawing palette, a right Inspector, and persistent
  workspace profiles for migration-friendly layout choices.
- Added a one-action six-membered ring tool, selection cut/duplicate/nudge
  workflows, local structure assistance, and importable database results.
- Added IndexedDB-backed Playground recovery plus browser-safe document import,
  export, drag-and-drop, and the same primary editor surface as the desktop app.
- Added explicit multi-reactant SMIRKS execution for two to eight reactant
  molecules, with validated Worker parsing and visible failure states.
- Added typed query-document boundaries for SMARTS constraints, Markush,
  polymer, and nucleic-acid metadata without flattening unsupported semantics.
- Added loss-aware CDXML page handling for presentation-only pages, nested
  chemistry fragments, opaque presentation groups, and fragment-scoped rich
  source patching.
- Added a dependency-free Web Component validation boundary that rejects
  duplicate IDs, invalid bond endpoints, and unsupported bond values before
  SVG rendering.

### Changed

- Updated the Rust/WASM chemistry engine dependency to upstream `chematic`
  v1.0.19, including its completed Ertl TPSA N/O/S/P environment-table update.
- Hardened CI with a shared workflow/version invariant check, maintained
  GitHub Action majors, pinned `wasm-pack 0.13.1 --locked` installs, and a full
  local `npm run verify:ci` gate. Tagged builds now wait for an exact-commit
  candidate gate before cross-platform artifacts can be published.
- Split the nightly npm audit into a blocking production-dependency gate and
  a visible, non-blocking report for known Electron Forge build-tool findings;
  production dependencies currently audit cleanly.
- Made packaged Electron canvas smoke interactions derive a blank point from
  the rendered canvas bounds instead of relying on a layout-dependent fixed
  coordinate.
- Refactored the Web Component validation, summary, and SVG rendering paths
  into focused modules, and extracted the reaction execution controls from
  the main ReactionPanel.
- Refactored the Rust/WASM bridge into focused document-adapter,
  molecule-conversion, and fingerprint modules; the public WASM API remains
  unchanged.
- Refactored CDXML atom, bond, text, and group handling into focused parser
  functions while preserving the existing supported-subset boundary.

### Validation

- TypeScript typecheck and ESLint pass locally.
- Jest: 53 suites passed; 458 tests passed, 6 skipped.
- Renderer E2E: 111 tests passed.
- Built Playground E2E: 1 test passed.
- Packaged Electron smoke: 28 tests passed, including menu, IPC, recovery,
  clipboard, settings, and PDF coverage.
- Rust `chem-wasm`: 30 tests passed locally.
- Workflow lint and the production dependency audit pass; the production
  dependency audit reports zero vulnerabilities.
- The final refactoring gate passes with no new Rust warnings; `lib.rs` is now
  1,680 lines, down from approximately 2,017 before the module extraction.

## [1.0.10] - 2026-09-10

### Changed

- Refactored Electron main-process file/PDF, Clipboard, and Autosave IPC
  handlers into focused modules without changing their validation contracts.
- Updated Electron, React, Playwright, Jest, ESLint, React type definitions,
  and typescript-eslint within their compatible release lines.
- Updated release and compatibility documentation for the v1.0.10 application
  release.

### Validation

- Unit tests: 43 suites passed, 344 tests passed, 6 skipped.
- TypeScript typecheck, ESLint, Electron Forge packaging, and `git diff --check`
  pass locally.
- The upstream `chematic` engine remains pinned at v1.0.9; its separate
  semantic and format limitations remain documented explicitly.

## [1.0.9] - 2026-09-09

### Added

- Added idempotent release uploads, packaged Electron smoke-target discovery,
  and production Worker asset verification.
- Added Worker-backed normal molecule parsing/serialization and a reproducible
  candidate verification command with coverage thresholds.
- Added complete capability fixture inventory, reaction corpus diagnostics,
  session provenance checks, and hardened PDF SVG input safety.

### Validation

- `npm run verify:candidate` passes: 41 suites, 336 tests total, 330 passed,
  6 skipped; typecheck, lint, coverage, and diff checks pass.
- Forge Vite compilation and packaging pass locally; packaged Electron smoke
  launch is blocked in the current macOS environment by an early SIGABRT,
  while signing, external audit remediation, and human review remain separate
  gates.

## [1.0.8] - 2026-09-08

### Added

- Added publication-oriented SVG presets, deterministic export checks, XML
  text escaping, and bounded PDF page-size and SVG safety contracts.
- Added reaction step reordering, positive stoichiometric coefficient editing,
  Worker-validated agent SMILES input, and component identity editing.
- Added coefficient-aware atom and formal-charge diagnostics plus fail-closed
  reaction JSON export validation.
- Expanded user-facing README, multilingual onboarding copy, and SEO metadata.

### Validation

- TypeScript typecheck, ESLint, Jest (40 suites, 310 passed, 6 skipped), and
  `git diff --check` pass locally. The focused Reaction Renderer E2E suite
  passes 7 tests.

## [1.0.7] - 2026-09-08

### Added

- Added loss-aware RXN document import/export through chematic v1.0.9.
- Added rich CDXML source preservation for unchanged chemistry and coordinates.
- Added the NMR contract/panel, deterministic 3D XYZ export, and an
  Electron-free Web Worker analysis boundary.

### Changed

- Updated the Rust/WASM chemistry engine dependency to chematic v1.0.9.
- Moved template-drop and pasted-content parsing through the analysis Worker.

### Validation

- TypeScript typecheck, ESLint, Jest (38 suites, 294 passed, 6 skipped),
  Renderer E2E (73 passed), and `git diff --check` pass locally.

## [0.9.4] - 2026-09-05

### Added

- Added the dependency-free Electron-free `<chematic-molecule>` Web Component
  for validated read-only SVG embedding, including invalid-input error events.

### Changed

- Updated the Rust/WASM chemistry engine dependency to chematic 1.0.7.
- Updated renderer and contract provenance to chematic 1.0.7.

### Validation

- `cargo check`, browser WASM build, TypeScript typecheck, lint, full Jest (34
  suites, 270 passed, 6 skipped), and `git diff --check` pass.

## [0.9.3] - 2026-09-05

### Changed

- Updated the Rust/WASM chemistry engine from chematic 1.0.3 to 1.0.4 and
  regenerated the browser-targeted WASM bundle.
- Exposed chematic 1.0.4's typed semantic-model validation, R-group selection,
  and bounded expansion through the WASM bridge with a real Node-WASM contract
  test.

### Validation

- `cargo check`, WASM build, typecheck, lint, 32 Jest suites (245 passed, 6
  skipped), real Node-WASM contract tests, and `git diff --check` pass.

## [0.9.2] - 2026-09-04

### Changed

- Updated the Rust/WASM chemistry engine from chematic 1.0.1 to 1.0.3.
- Regenerated the browser-targeted WASM bundle from the pinned upstream commit.
- Shared structure-keyed WASM analysis results across renderer panels.

### Validation

- `cargo check`, typecheck, lint, 32 unit-test suites, and 71 renderer E2E tests pass locally.

## [0.9.1] - 2026-09-03

### Added

- Packaged Electron windows now deny unexpected navigation, permissions, and
  popups; approved PubChem/ChemSpider links open in the system browser.
- Open and Recent Files reads now reject invalid paths and oversized local
  inputs before loading file contents into the main process.
- PDF export now rejects SVG scripts, event handlers, and external resource
  references before rendering the SVG in a hidden HTML window.
- Clipboard and settings IPC now validate the renderer sender, supported
  arguments, setting keys, and payload sizes.
- Settings hydration now rejects invalid theme, sidebar-width, and shortcut
  value types instead of passing corrupted user-edited settings to the UI.
- Local analysis extensions now reject invalid molecule documents before the
  provider is invoked, matching the command execution boundary.
- Keyboard shortcuts now preserve native editing in textareas, selects, and
  contenteditable controls, not only single-line inputs.
- Settings persistence now uses an atomic temporary-file rename and safely
  recovers when the settings root is not a JSON object.
- Batch filter results now distinguish skipped items from actual failures in
  both aggregate counts and the review panel.
- Autosave validation now rejects duplicate bond IDs before writing a recovery
  snapshot.
- Batch completion and cancellation status messages now include skipped-item
  counts alongside processed and failed counts.
- Batch results now include a deterministic FNV-1a provenance hash for repeat
  comparison of the same operation and inputs.
- Batch processing now rejects non-finite or contradictory filter ranges before
  starting a job.
- Batch processing now validates each molecule before invoking the chemistry
  engine and records malformed inputs as explicit failed items.
- File, binary, and PDF exports now write through a temporary file and atomic
  rename to avoid leaving partially-written output after interruption.
- Batch filters now honor valid zero-valued boundaries instead of treating them
  as unspecified.
- Batch filter inputs now preserve zero values and accept decimal molecular
  weight boundaries.
- Successful batch transformations can now be undone as one document change.
- Bond Inspector values now stay synchronized after order or stereo edits.
- Malformed molecule arrays now fail with bounded validation errors instead of
  throwing while inspecting an atom or bond entry.
- Untrusted element and display-label fields are now type- and size-checked
  before chemistry processing.
- Self-referential bonds and whitespace-padded element values are now rejected
  before chemistry processing.
- Duplicate bonds between the same atom pair are now rejected before chemistry
  processing.
- Batch processing now exposes the existing property-calculation operation in
  the dialog.
- Batch property results now show formula, molecular weight, LogP, and TPSA for
  review alongside the deterministic result hash.
- Batch history now records the chemistry engine and execution options as
  provenance alongside each result.
- Batch review now includes per-item before/after Atom and Bond counts.
- Batch history selection now remains tied to the selected result when older
  entries are evicted from the bounded history.
- Batch item review now supports filtering by succeeded, failed, skipped, or
  cancelled status.
- Batch history now offers a guarded Retry failed action that disables itself
  during async work and applies successful output as one undoable change.
- Batch retry and direct index selections now reject out-of-range, non-integer,
  or duplicate item indexes.
- Native offline differential fixtures now compare ECFP4 encoding and MCS
  cardinality/similarity against independent upstream calculations.
- Reaction-document JSON v2 now preserves agents and aligned stoichiometric
  coefficients, with safe migration from v1.
- CDXML now has a deterministic supported-subset writer with wildcard loss
  confirmation and parser-backed round-trip fixtures.
- Batch result hashes now normalize task key order, making equivalent execution
  options produce the same deterministic hash.
- Batch hash key ordering now uses locale-independent code-point ordering for
  cross-environment reproducibility.
- Sidebar panels now expose full accessible names and explicit tab/tabpanel
  relationships while retaining compact visual labels.
- Empty canvases now show a concise next-action guide for choosing an atom or
  bond tool, which disappears after the first edit.
- Undo and redo now announce whether the action changed the document and show
  the resulting atom and bond counts.
- File and PDF export IPC now validates the renderer sender, destination path,
  and payload size before writing user-selected files.
- Added local RXN V2000 import/export for one-step authored reactant/product
  schemes, using the existing MOL conversion boundary.
- RXN exchange rejects malformed counts or missing molecule blocks instead of
  silently dropping reaction components.

### Limitations

- RXN agents, stoichiometric coefficients, multi-step schemes, and unsupported
  extensions remain outside the current DTO and are preserved only by JSON.
- RXN V2000 export now uses the existing loss-warning boundary before writing
  wildcard or isotope data that the format cannot preserve.
- Multi-step reaction diagnostics now report missing authored intermediate
  continuity instead of silently treating disconnected steps as one sequence.
- Intermediate continuity checks now compare authored isotope, hydrogen, charge,
  wildcard, and bond structure facts instead of element counts alone.
- Reaction verification now exposes the authored intermediate count for each
  multi-step boundary to make continuity evidence reviewable.
- Intermediate continuity now requires authored atom-map numbers to remain
  consistent across a step boundary.
- Multi-step RXN export attempts now stop with an explicit status directing
  users to the lossless JSON reaction-document format.
- RXN import now rejects oversized text and excessive molecule-block counts
  before invoking the molecule parser.
- Session bundles and local extension commands now reject oversized molecules
  and invalid chemistry numeric fields at the shared document boundary.
- Session bundle imports now reject oversized JSON before parsing it.
- Session bundle imports now validate source-path, schema-version, and provenance
  metadata before accepting a document.
- Versioned reaction-document imports now reject oversized documents and malformed
  steps instead of silently defaulting invalid molecule arrays.
- Versioned reaction-document imports now validate mechanism-arrow references and
  bounded reaction-condition values.
- Current-schema reaction documents without provenance evidence are now rejected
  instead of being accepted without hash verification.
- Autosave cleanup now waits for queued atomic writes during clean quit, avoiding
  stale recovery snapshots caused by a write/cleanup race.
- Autosave IPC now validates molecule shape, numeric fields, references, and size
  before saving or restoring local recovery data.
- Autosave IPC now accepts requests only from the current application window's
  renderer.
- Reaction integrity diagnostics now include formal-charge conservation in
  addition to authored atom inventory and mapping checks.
- Reaction integrity diagnostics also account for isotope labels and explicit
  hydrogen counts when those fields are present.

## [0.9.0] - 2026-08-31

### Added

- Added authored reaction integrity diagnostics for element inventory balance
  and atom-map consistency, with explicit per-step evidence.
- Reaction-document JSON exports now include the recalculated integrity report.
  Unannotated reactions remain `not_verified`; the editor never invents atom
  mappings or products.

### Documentation

- Documented the scope and limits of reaction integrity verification.

## [0.8.0] - 2026-08-31

### Added

- Added a verified WASM CIP descriptor API for R/S/E/Z assignments.
- Added a Stereoisomer panel action that reports verified descriptors and
  explicitly leaves ambiguous centers unassigned.
- Added a real WASM contract test for E/Z assignment and updated the
  known-limitations matrix.

## [0.7.0] - 2026-08-31

### Added

- Froze the v1 document schema and local extension API compatibility contract.
- Session bundle exports now use a v2 envelope with an explicit document schema.
- Added a safe v1-to-v2 migration path and rejection of unknown future versions.
- Added provenance hash verification and packaged-app migration coverage.
- Added release-scoped known-limitations and migration policy documentation.

### Security

- Session bundles reject malformed documents and tampered structure hashes before
  they reach the editor.

## [0.6.1] - 2026-08-31

### Added

- Added a permissioned local extension API for validated document commands and
  read-only analysis providers.
- Routed template insertion through the same document validation boundary used
  by extensions.

## [0.6.0] - 2026-08-31

### Added

- Added configurable, conflict-checked keyboard shortcuts with portable
  primary-modifier bindings and persisted settings.
- Added shortcut editing, validation errors, and reset-to-default controls to
  the Keyboard Shortcuts dialog.

## [0.5.7] - 2026-08-31

### Added

- Added provenance metadata and a deterministic result hash to reaction-document
  JSON exports.
- Added import-time hash verification so modified or inconsistent reaction
  documents are rejected instead of being silently trusted.

## [0.5.6] - 2026-08-31

### Added

- Added a versioned reaction-document JSON envelope with explicit schema and
  migration-safe defaults for legacy unversioned scheme exports.
- Rejected unknown future reaction-document schemas and malformed step IDs
  instead of guessing or inventing reaction data.

## [0.5.5] - 2026-08-31

### Added

- Added importable JSON session bundles containing the current molecule,
  source path, engine metadata, and a deterministic structure fingerprint.
- Added a File → Export → Export session bundle (JSON) command and JSON bundle
  open support for local review and bug reports.

## [0.5.4] - 2026-08-31

### Added

- Added generated InChI and InChIKey display to the Research panel.
- Added one-click copying for both identifiers through the desktop clipboard.
- Labeled the pure-Rust InChI output as approximate so it is not confused with
  PubChem/RDKit-compatible identifiers.

### Fixed

- Serialized Electron smoke tests that share the process-global OS clipboard,
  removing a local full-suite race that could mask otherwise passing tests.

## [0.5.3] - 2026-08-31

### Added

- Added an offline Maximum Common Substructure (MCS) comparison to the DB
  panel, using the current molecule and a second SMILES input.
- Added explicit MCS result details and malformed-input error states.

## [0.5.2] - 2026-08-31

### Fixed

- Added direct atom element editing to the right-click context menu by
  reusing the Inspector's element picker.
- Preserved undo behavior and visible Inspector state for context-menu edits.

## [0.5.1] - 2026-08-31

### Changed

- Updated the chemistry engine to the official `chematic` v0.35.0 workspace
  tag.
- Updated the WASM random-source integration to `getrandom` 0.4 with the
  `wasm_js` feature.

## [0.5.0] - 2026-08-31

### Added

- Reviewable batch processing with per-item success, skip, failure, and
  cancellation states retained in input order.
- Batch progress callbacks, cancellation through `AbortSignal`, filter
  warnings, and a per-item review section in the Batch panel.

### Safety

- Failed and skipped items remain visible instead of being hidden.
- Cancellation stops future work without fabricating or replacing results.

## [0.4.0] - 2026-08-31

- Added authored reaction verification: atom-balance diagnostics, map-number
  consistency checks, and a visible verified/not-verified state.
- Recalculate diagnostics whenever a reaction step changes.

## [0.3.0] - 2026-08-31

- Added loss-aware molecule saving and export for wildcard and isotope data.
- Added format-aware saving for SMILES, SDF, CML, and MOL V2000.
- Treat opened CDXML documents as read-only instead of overwriting them with
  MOL data.

## [0.2.2] - 2026-08-31

- Removed the obsolete native Rust/egui application; Electron is the only
  supported desktop application.
- Fixed menu actions, clipboard handling, undo coverage, canvas resizing,
  stale keyboard handlers, and other editor reliability issues.
- Added real WASM contract tests, performance tests, release checksums, and
  cross-platform packaging validation.

## [0.2.0] - 2026-06-10

- Added the 3D viewer, property and Lipinski panels, reaction mechanisms,
  stereoisomer enumeration, batch processing, and database lookup foundation.

## [0.1.0] - 2026-05-15

- Initial Electron application release.

[0.8.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.8.0
[0.9.4]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.9.4
[1.0.7]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v1.0.7
[1.0.9]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v1.0.9
[1.0.10]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v1.0.10
[1.0.11]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v1.0.11
[1.0.12]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v1.0.12
[1.0.8]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v1.0.8
[0.9.3]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.9.3
[0.9.1]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.9.1
[0.9.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.9.0
[0.7.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.7.0
[0.6.1]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.6.1
[0.6.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.6.0
[0.5.7]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.7
[0.5.6]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.6
[0.5.5]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.5
[0.5.4]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.4
[0.5.3]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.3
[0.5.2]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.2
[0.5.1]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.1
[0.5.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.0
[0.4.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.4.0
[0.3.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.3.0
