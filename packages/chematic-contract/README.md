# @chematic/contract

Dependency-free, Electron-free TypeScript data contracts for molecules and
queries. The package is independently type-checked and has HTML-, React-, and
Worker-shaped consumer fixtures. Chemistry computation remains in the WASM
bridge; UI adapters remain in `electron/`.

The contract is the source of truth for query document types, including typed
Markush and polymer metadata. The renderer provides immutable editing,
allowed-substituent selection, and deterministic two-attachment repeat-unit
expansion; unsupported upstream semantics are rejected rather than silently
approximated.
