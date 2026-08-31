# Changelog

Notable changes to chematic-draw. Dates use ISO 8601 format. See the git log
for the full development history.

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

[0.5.2]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.2
[0.5.1]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.1
[0.5.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.5.0
[0.4.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.4.0
[0.3.0]: https://github.com/kent-tokyo/chematic-draw/releases/tag/v0.3.0
