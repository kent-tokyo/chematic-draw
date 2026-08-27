# chematic-draw Roadmap

**Status:** Post-v0.2.0 quality reset
**Primary goal:** Build a trustworthy, offline-first chemical structure editor powered by chematic.
**Current positioning:** An experimental open-source chemical drawing environment — not yet a drop-in replacement for ChemDraw, Ketcher, ChemDoodle, or ChemSketch.

This roadmap intentionally prioritizes chemical correctness, editing quality, interoperability, testing, and real desktop distribution over cloud features or speculative feature breadth.

## Mission

chematic-draw aims to become a practical open-source desktop environment for:

- drawing and editing molecular structures;
- drawing reactions and reaction mechanisms;
- validating chemically meaningful document content;
- importing and exporting common chemistry formats without silent data loss;
- producing publication-ready vector and raster output;
- running selected chemistry analyses locally and reproducibly;
- connecting to other open-source chemistry tools through explicit, versioned interfaces.

The project will not attempt to win by copying every feature of mature commercial suites. It will compete through:

- a Rust-native, offline-first architecture;
- transparent and testable chemistry;
- strong integration with the chematic ecosystem;
- honest capability and limitation reporting;
- reproducible local workflows without mandatory accounts or uploads.

## Product and Architecture Decision

### Canonical product

The native Rust desktop application is the canonical chematic-draw product.

- `chem-ui` and the shared document/command model are authoritative.
- Native Windows, macOS, and Linux releases are required for stable versions.
- The application must remain usable without a network connection, except for features explicitly labeled as online.

The Electron/WASM application remains an experimental secondary client until it uses the same document model, chemistry contracts, and golden tests as the native application.

A feature implemented only in the Electron client must not be described as generally supported by chematic-draw.

This decision prevents two independent applications from drifting while preserving WASM as a valuable route for demos, embedding, and optional local integrations.

### Proposed internal layers

```
chematic
  molecular and reaction primitives
        |
        v
chematic-draw-core
  document model, commands, selection, history, validation contracts
        |
        +----------------------+
        |                      |
        v                      v
native desktop UI         WASM integration API
authoritative product     browser / Electron / embedders
        |
        v
optional local integrations
yomitoki, RENKIN, and future adapters
```

The UI must not contain independent chemistry implementations when the operation belongs in chematic or another dedicated library.

## Development Principles

1. **Correctness before breadth** — A missing feature is preferable to a chemically incorrect feature presented as working.
2. **The editor comes first** — Drawing, selection, editing, cleanup, undo/redo, validation, and export take priority over NMR, ADMET, cloud storage, collaboration, AR/VR, and other adjacent features.
3. **No placeholder science in production paths** — Mock values, atom-count proxies, string-based fingerprint comparisons, and silent fallbacks must never be exposed as chemical calculations.
4. **Every scientific claim needs an executable test** — Chemistry functions require reference cases, invariants, error cases, and provenance for expected results.
5. **No silent information loss** — Import and export operations must either preserve supported information or return a structured loss report.
6. **Integrate through boundaries, not duplication** — chematic-draw should call chematic, yomitoki, or RENKIN through explicit adapters rather than reimplementing their logic.
7. **Local by default** — New integrations must work locally where the underlying library supports it. Network access must be optional, visible, and separately consented to.
8. **Documentation is part of the product** — README tables, screenshots, support claims, package instructions, and release artifacts must be verified before every release.

## Integration Strategy

chematic-draw can become the visual front end of a broader chemistry toolchain, but integrations must not destabilize the core editor.

| Project | Relationship to chematic-draw | Roadmap decision |
|---|---|---|
| chematic | Molecular representation, parsing, depiction, stereochemistry, fingerprints, reactions, properties | Core dependency and single source of chemical truth |
| yomitoki | Explainable, route-free intrinsic structural synthesizability diagnostics | Optional local analysis panel after the editor core is reliable |
| RENKIN | Retrosynthesis planning and route auditing | Optional local synthesis workspace after v0.3.0 |
| mikiwame | Diagnostics for periodic crystal structures | Do not add to the molecular editor core; reconsider only with a real crystal document model |
| gugen | Explainable inorganic synthesis and process planning | Future materials workspace or sister application, not a core drawing feature |
| kizashi | Explainable materials candidate generation | Adapter-level future integration only; no direct dependency in the molecular editor |
| Domain-specific tools such as masstrust or adductra | Specialized downstream analysis | Use export/import or plugin adapters rather than permanent core panels |

### Integration rules

- Integrations are optional features, not mandatory dependencies of the drawing engine.
- Each integration must expose a versioned request and response schema.
- A selected molecule should be transferable as canonical SMILES, MOL/SDF, or a versioned chematic representation.
- Reports must preserve their original semantics. For example:
  - yomitoki difficulty, confidence, applicability, and findings must remain separate;
  - RENKIN route scores must not be displayed as experimental success probabilities;
  - route audit results must retain provenance and partial/failure states.
- Long-running calculations must support cancellation, progress reporting, and deterministic inputs.
- The application must display which library and version produced a result.
- No integration may silently upload structures to an external service.

## Release Plan

### v0.2.1 — Scientific Correctness Repair

**Theme:** Remove or repair untrustworthy chemistry paths before adding features.

#### P0: Fingerprint similarity

- Replace character-set comparison with real fingerprint bit or count vectors.
- Implement Tanimoto and Dice using mathematically correct set/count semantics.
- Define behavior for empty fingerprints and invalid molecules.
- Add tests for identical, disjoint, partially overlapping, and independently verified molecule pairs.
- Confirm native Rust and WASM return equivalent results.
- Include fingerprint type, radius, bit length, and count/bit mode in result metadata.

#### P0: Maximum common substructure

- Connect the UI and WASM API to a real MCS implementation.
- Return a structured unsupported or not_available result if a correct implementation is unavailable.
- Remove atom-count ratio or other proxy values presented as MCS.
- Add reference tests covering identical molecules, substructures, disconnected fragments, aromatic systems, and no-match cases.
- Add explicit time and search-budget limits.

#### P0: Reaction execution and errors

- Distinguish successful application, no match, invalid reaction, unsupported chemistry, and internal failure.
- Never convert a failed reaction into an empty or apparently successful result.
- Add atom-balance and mapping invariants where applicable.
- Preserve warnings and provenance in the UI.

#### Scientific capability audit

- Inventory every displayed calculated property and chemistry action.
- Classify each item as validated, experimental, limited, or unsupported.
- Remove unsupported claims from menus, screenshots, and README tables.
- Record the algorithm, data source, unit, limitations, and expected domain for each calculated property.

#### Exit criteria

v0.2.1 may be released only when:

- no known placeholder chemistry remains in user-visible paths;
- similarity and MCS tests execute the real implementation;
- invalid input produces an explicit error rather than a plausible-looking result;
- native and WASM chemistry results pass the same golden cases;
- the README no longer describes the project as a drop-in replacement.

### v0.2.2 — Test, CI, and Release Integrity

**Theme:** Make every green check and downloadable artifact mean something.

#### Rust quality gates

- `cargo fmt --all -- --check`
- `cargo clippy --workspace --all-targets --all-features -- -D warnings`
- `cargo test --workspace --all-features`
- `cargo test --workspace --no-default-features` where supported
- `RUSTDOCFLAGS="-D warnings" cargo doc --workspace --all-features --no-deps`

#### Dependency and license audit

#### WASM and Electron tests

- Build the real chem-wasm package before JavaScript tests.
- Replace chemistry mocks with tests that import and execute the built WASM module.
- Keep UI mocks only for isolated presentation tests.
- Add contract tests shared by Rust and JavaScript.
- Configure real TypeScript checking and linting; remove the no-op lint script.
- Set the correct `electron/` working directory and npm cache dependency path in GitHub Actions.

#### Desktop release pipeline

- Produce native Rust binaries for Windows, macOS, and Linux.
- Make artifact names include product, version, target, and architecture.
- Create GitHub Releases from version tags.
- Upload only artifact types actually produced by the configured packagers.
- Generate SHA-256 checksums.
- Add an SBOM or dependency manifest.
- Run installation and launch smoke tests for each platform.
- Document signing/notarization status rather than implying signed releases.

#### Documentation repair

- Rewrite the competitor comparison using dated, sourced claims.
- Correct Ketcher CDXML, 3D, reaction-mapping, and related capability claims.
- Correct FreeChemDraw platform and product classification.
- Correct ChemSketch availability and licensing statements.
- Remove contradictions about undo/redo and CDXML support.
- Replace placeholder repository links, email addresses, and collaborator claims.
- State exactly which features exist in native, Electron, and WASM builds.

#### Exit criteria

- CI runs from a clean checkout and all mandatory jobs execute real checks.
- A version tag creates installable artifacts for all supported desktop platforms.
- Installation and first launch are smoke-tested.
- README support claims match the released binaries and test evidence.

### v0.3.0 — Reliable Chemical Editor

**Theme:** Deliver a coherent editor before expanding into adjacent scientific products.

#### Shared document model

- Introduce a UI-independent chemical document model.
- Represent molecules, reactions, annotations, arrows, text, and page layout explicitly.
- Add a command system with reversible operations.
- Make undo/redo cover every editing command.
- Add stable object identifiers and deterministic serialization.
- Add document schema versioning and migrations.

#### Core 2D editing

- Reliable atom, bond, ring, chain, charge, isotope, radical, and lone-pair editing.
- Single, double, triple, aromatic, wedge, hashed wedge, and unknown stereobonds.
- Marquee selection, additive selection, move, rotate, scale, duplicate, delete, and align.
- Copy/paste structures and images through the system clipboard.
- Atom and bond property dialogs.
- Abbreviated groups and editable labels.
- Searchable structure templates.
- Keyboard-first workflows with documented shortcuts.

#### Chemical validation

- Real-time valence and connectivity diagnostics.
- Aromaticity and kekulization failure reporting.
- Undefined or conflicting stereochemistry warnings.
- R/S and E/Z assignment display backed by chematic.
- Duplicate atom, zero-length bond, disconnected fragment, and malformed reaction checks.
- Validation findings must identify affected atoms/bonds and explain remediation.

#### Depiction and cleanup

- Deterministic structure cleanup.
- Consistent bond lengths and angles.
- Ring-system layout and fused/bridged ring handling.
- Collision avoidance for atom labels, charges, hydrogens, stereolabels, and bonds.
- Multi-fragment placement.
- Reaction layout with configurable spacing and alignment.
- Golden SVG fixtures and visual regression tests.

#### Reaction documents

- Reactant, reagent, condition, product, and catalyst regions.
- Reaction arrows and multi-step schemes.
- Electron-pushing arrows with explicit source and destination anchors.
- Reaction SMILES and RXN import/export.
- Atom mapping display and manual editing.
- Automatic mapping only after benchmarked accuracy and failure reporting are available.

#### Interoperability

Supported formats must have an explicit support matrix covering atoms, bonds, coordinates, stereochemistry, charges, isotopes, atom maps, reactions, annotations, and unsupported data.

- MOL V2000 round-trip
- MOL V3000 round-trip
- SDF multi-record import/export
- SMILES and canonical SMILES
- Reaction SMILES
- RXN
- CDXML documented subset with structured loss reporting
- CML documented subset
- InChI/InChIKey where the selected chematic-inchi backend supports it
- Automatic format detection with unambiguous error reporting

#### Publication output

- SVG export with stable geometry and text.
- High-resolution PNG export.
- PDF export or print-to-PDF support.
- Copy as SVG and copy as raster image.
- Configurable page size, margins, bond width, font size, and monochrome mode.
- Reference rendering corpus covering common organic, inorganic, charged, aromatic, and stereochemical structures.

#### Usability and accessibility

- Recoverable error messages with actionable details.
- Autosave and crash recovery.
- Recent-file list and safe file replacement.
- High-DPI and multi-monitor testing.
- Keyboard navigation and visible focus.
- Japanese and English UI parity.
- Screen-reader-accessible labels where the UI framework permits.

#### Exit criteria

v0.3.0 is complete when a user can install the application and reliably:

- draw and edit ordinary organic structures;
- undo and redo every edit;
- receive meaningful chemical validation;
- import and export the documented format subset;
- create a basic reaction scheme;
- export publication-usable SVG/PNG/PDF output;
- reproduce the same chemistry results on all supported platforms.

### v0.3.x — Editing Depth and Compatibility

Patch and minor releases after v0.3.0 should deepen the editor rather than open new product areas.

- Expand CDXML round-trip coverage based on real fixture corpora.
- Add superatoms, aliases, brackets, repeat units, and S-groups.
- Improve polymer and Markush representation only where the document model can preserve semantics.
- Add reaction cleanup and multi-step scheme layout.
- Add structure comparison and visual diff.
- Add batch format conversion with structured per-record errors.
- Add performance budgets for large molecules and multi-structure documents.
- Add fuzzing and minimized crash fixtures for all parsers.
- Publish a versioned interoperability report for every release.

No v0.3.x release should add cloud accounts, shared workspaces, or unrelated prediction models.

### v0.4.0 — Local Synthesis Intelligence

**Theme:** Connect the reliable editor to existing specialist libraries without merging their responsibilities.

#### yomitoki integration

- Add an optional Explain synthesizability action for the selected molecule.
- Run locally through a direct Rust adapter or WASM package.
- Display overall intrinsic structural difficulty, confidence, applicability, findings, and evidence separately.
- Highlight referenced atoms and substructures on the drawing.
- Preserve yomitoki finding codes and report schema version.
- Clearly state that the result is route-free and does not predict route length or experimental success.
- Export the unmodified machine-readable report.

#### RENKIN integration

- Add an optional Plan synthesis workspace.
- Pass the selected structure to RENKIN as a versioned target request.
- Support local native or WASM execution; no mandatory server.
- Visualize route trees, precursors, reaction templates, stock status, and route provenance.
- Open any route node as an editable molecule or reaction document.
- Support route-audit import for RENKIN-supported external planner formats.
- Preserve pass, fail, and partial audit outcomes.
- Display template identity, search limits, stock source, and library version.
- Support cancellation and bounded search.
- Never label route ranking scores as yields or calibrated success probabilities.

#### Integration API v1

- Define versioned request/response envelopes.
- Include producer name, producer version, schema version, input identity, options, warnings, and provenance.
- Add compatibility tests against supported yomitoki and RENKIN versions.
- Fail closed when a schema is unsupported.
- Keep integrations behind optional features or separately loaded modules.

#### Exit criteria

- The editor remains fully usable without either integration.
- Analyses run locally and do not transmit structures without explicit action.
- A report produced in the UI can be exported and reproduced with the corresponding library CLI.
- Integration failures cannot corrupt the open chemical document.
- The UI preserves each library's scientific scope and uncertainty language.

### v0.5.0 — Advanced Chemical Documents

This release expands document semantics only after the core editor and local integration contracts are stable.

- More complete CDXML interoperability.
- R-group and attachment-point editing.
- S-groups and polymer repeat-unit editing.
- Markush structures with explicit supported-subset documentation.
- Multi-page documents.
- Tables, captions, and chemical annotations.
- Advanced reaction scheme layout.
- Verified reaction atom mapping integration.
- Plugin/adapter discovery for local specialist tools.
- Stable command and document APIs for embedders.

A plugin system is valuable only after the document model is stable. It must not be used to avoid defining core semantics.

## Materials Track — Separate Decision Gate

mikiwame, gugen, and kizashi operate on periodic structures, inorganic compositions, or materials-planning concepts that do not fit naturally into the current molecular drawing document.

They should not be inserted as menu items backed by lossy molecule conversions.

A materials integration may begin only after all of the following exist:

- a dedicated periodic crystal document model;
- unit-cell and fractional-coordinate editing;
- symmetry-aware import behavior;
- explicit CIF support boundaries;
- 3D periodic rendering;
- composition and structure identity contracts shared with the materials libraries;
- a product decision between a chematic-draw materials workspace and a separate sister application.

Until then:

- mikiwame remains a crystal-structure diagnostic library;
- gugen remains an inorganic synthesis/process planner;
- kizashi remains a candidate-generation engine;
- integration should use files or explicit adapters, not direct core dependencies.

## v1.0 Definition

Version 1.0 does not mean complete ChemDraw feature parity.

It means the documented product is dependable.

Required gates:

- One canonical desktop application.
- Stable, versioned document format.
- Stable command and integration APIs.
- Verified installers for Windows, macOS, and Linux.
- No known P0 scientific correctness defects.
- Supported format subsets documented and covered by round-trip fixtures.
- Deterministic validation and depiction for the supported domain.
- Undo/redo and crash recovery across all core editing operations.
- Publication-quality SVG/PNG/PDF output.
- Reproducible release process with checksums and dependency metadata.
- Truthful README, user guide, API documentation, and limitations.
- Backward-compatible migration policy for saved documents.
- Security policy and supported-version policy.

The project may describe itself as a production-ready open-source chemical structure editor only after these gates are met.

Claims such as drop-in replacement for ChemDraw require a separate, published compatibility study and must not be inferred from v1.0 alone.

## Explicitly Deferred

The following are intentionally deferred until the core editor and interoperability work are mature:

- Google Drive, OneDrive, or other cloud storage integration;
- real-time collaborative editing;
- accounts, authentication, roles, and multi-tenant hosting;
- comments, team workspaces, and shared project permissions;
- mobile native applications;
- AR/VR and haptic interfaces;
- Slack bots and browser extensions;
- custom machine-learning model training;
- generative molecular design;
- protein-ligand visualization;
- virtual screening;
- lab automation;
- automatic literature search;
- built-in NMR prediction;
- built-in ADMET, toxicity, yield, or binding-affinity prediction;
- a second retrosynthesis implementation inside chematic-draw;
- a second synthesizability scoring implementation inside chematic-draw.

These may be reconsidered only when there is a validated user need and they do not compete with core-editor quality work.

## Priority Order

When roadmap items compete, use this order:

- **P0** — Scientific correctness and data integrity
- **P1** — Core editing, undo/redo, validation, and depiction
- **P1** — File interoperability and publication output
- **P1** — CI, installers, release reproducibility, and documentation accuracy
- **P2** — Performance and accessibility
- **P2** — Optional local integration with yomitoki and RENKIN
- **P3** — Advanced document semantics
- **Deferred** — Cloud, collaboration, speculative prediction, and immersive interfaces

A lower-priority feature must not delay an unresolved higher-priority correctness or release-integrity issue.

## Version History

### v0.1.0

Initial prototype:

- basic 2D editing;
- native Rust UI foundation;
- initial SMILES and molecular file workflows.

### v0.2.0

Major breadth expansion:

- chematic 0.20.1 integration;
- Rust 2024 workspace;
- native, WASM, and Electron surfaces;
- 3D viewing and property panels;
- reaction-mechanism and stereoisomer-related workflows;
- expanded format and batch APIs;
- initial CI, test, benchmark, and release configuration.

v0.2.0 demonstrated technical range, but also exposed a mismatch between feature breadth and verification depth. The v0.2.1–v0.3.0 cycle is therefore a deliberate quality reset.

## Roadmap Governance

Each roadmap feature should have:

- a user problem;
- an explicit scientific scope;
- an owner library;
- acceptance tests;
- failure behavior;
- supported platforms;
- documentation changes;
- migration or compatibility impact.

A feature is not complete because a menu item exists. It is complete when the underlying behavior is correct, tested, documented, distributable, and honest about its limitations.

Last updated: August 2026
