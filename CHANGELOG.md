# Changelog

Notable changes to chematic-draw. Dates use ISO 8601 format. See the git log
for the full development history.

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
