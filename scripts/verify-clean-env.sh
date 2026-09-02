#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
command -v node >/dev/null || { echo "node is required" >&2; exit 1; }
command -v npm >/dev/null || { echo "npm is required" >&2; exit 1; }
command -v cargo >/dev/null || { echo "cargo is required" >&2; exit 1; }
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)" || { echo "Node 24+ is required" >&2; exit 1; }
rm -rf electron/node_modules electron/src/renderer/wasm/pkg electron/src/renderer/wasm/pkg-node
npm ci --prefix electron
npm run build:wasm --prefix electron
npm run typecheck --prefix electron
npm test --prefix electron -- --runInBand
echo "clean-environment verification passed"
