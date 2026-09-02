# @chematic/contract

Dependency-free, Electron-free TypeScript data contracts for molecules and
queries. The package is independently type-checked and has HTML-, React-, and
Worker-shaped consumer fixtures. Chemistry computation remains in the WASM
bridge; UI adapters remain in `electron/`.

The `.` export in `package.json` is the public entrypoint. Consumers should
import contract types from `@chematic/contract`; the checked-in conformance
fixture covers UI state, geometry state, query documents, session bundles, and
batch summaries without importing Electron or Zustand.

The contract is the source of truth for query document types, including typed
Markush and polymer metadata. The renderer provides immutable editing,
allowed-substituent selection, and deterministic two-attachment repeat-unit
expansion; unsupported upstream semantics are rejected rather than silently
approximated.
