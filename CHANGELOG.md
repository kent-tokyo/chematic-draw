# Changelog

Notable changes to chematic-draw. Dates use ISO 8601 format. See the git log
for the full development history.

## [Unreleased]

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
