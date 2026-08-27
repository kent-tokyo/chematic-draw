#!/bin/bash

# Setup script for chematic-draw development environment
# Usage: ./scripts/setup.sh

set -e

echo "🚀 Setting up chematic-draw development environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on macOS, Linux, or Windows (Git Bash)
OS="$(uname -s)"
case "$OS" in
  Darwin*)
    OS_TYPE="macOS"
    ;;
  Linux*)
    OS_TYPE="Linux"
    ;;
  MINGW*|MSYS*)
    OS_TYPE="Windows"
    ;;
  *)
    OS_TYPE="Unknown"
    ;;
esac

echo -e "${BLUE}Detected OS: $OS_TYPE${NC}"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $1${NC}"
  else
    echo -e "${RED}✗ $1${NC}"
    exit 1
  fi
}

# 1. Check Node.js
echo -e "\n${BLUE}1. Checking Node.js...${NC}"
if command_exists node; then
  NODE_VERSION=$(node --version)
  echo "Node.js $NODE_VERSION"
  if [ "$(node --version | cut -d'.' -f1 | sed 's/v//')" -lt 18 ]; then
    echo -e "${RED}✗ Node.js 18+ required${NC}"
    exit 1
  fi
  print_status "Node.js check"
else
  echo -e "${RED}✗ Node.js not found${NC}"
  echo "Install from https://nodejs.org (version 18+)"
  exit 1
fi

# 2. Check npm
echo -e "\n${BLUE}2. Checking npm...${NC}"
if command_exists npm; then
  NPM_VERSION=$(npm --version)
  echo "npm $NPM_VERSION"
  print_status "npm check"
else
  echo -e "${RED}✗ npm not found${NC}"
  exit 1
fi

# 3. Check Git
echo -e "\n${BLUE}3. Checking Git...${NC}"
if command_exists git; then
  GIT_VERSION=$(git --version)
  echo "$GIT_VERSION"
  print_status "Git check"
else
  echo -e "${RED}✗ Git not found${NC}"
  exit 1
fi

# 4. Check Rust
echo -e "\n${BLUE}4. Checking Rust...${NC}"
if command_exists rustc; then
  RUST_VERSION=$(rustc --version)
  echo "$RUST_VERSION"
  RUST_MINOR=$(rustc --version | awk '{print $2}' | cut -d'.' -f2)
  if [ "$RUST_MINOR" -lt 70 ]; then
    echo "Installing Rust toolchain..."
    if command_exists rustup; then
      rustup update stable
      print_status "Rust toolchain update"
    fi
  else
    print_status "Rust check"
  fi
else
  echo "Installing Rust..."
  if [ "$OS_TYPE" = "Windows" ]; then
    echo "Please download from https://rustup.rs and run the installer"
    exit 1
  else
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    source "$HOME/.cargo/env"
    print_status "Rust installation"
  fi
fi

# 5. Install WASM target
echo -e "\n${BLUE}5. Installing WASM target...${NC}"
rustup target add wasm32-unknown-unknown
print_status "WASM target"

# 6. Install wasm-pack
echo -e "\n${BLUE}6. Installing wasm-pack...${NC}"
if command_exists wasm-pack; then
  echo "wasm-pack already installed"
  print_status "wasm-pack check"
else
  echo "Installing wasm-pack..."
  cargo install wasm-pack --locked
  print_status "wasm-pack installation"
fi

# 7. Clone/update submodules (if any)
echo -e "\n${BLUE}7. Updating submodules...${NC}"
git submodule update --init --recursive || true

# 8. Install Node dependencies
# The only package.json is in electron/ — there is none at the repo root.
echo -e "\n${BLUE}8. Installing Node.js dependencies...${NC}"
(cd electron && npm install)
print_status "Node.js dependencies"

# 9. Build WASM module
# wasm-pack resolves --out-dir relative to the crate path argument, not the
# shell's cwd, so this must be run from the repo root with an explicit
# --out-dir — see electron/package.json's build:wasm script, used here so the
# path only needs to be correct in one place.
echo -e "\n${BLUE}9. Building WASM module...${NC}"
(cd electron && npm run build:wasm)
print_status "WASM build"

# 10. Verify setup
echo -e "\n${BLUE}10. Verifying setup...${NC}"

# Check WASM output (the app imports from electron/src/renderer/wasm/pkg,
# and wasm-bindgen names the compiled binary chem_wasm_bg.wasm, not chem_wasm.wasm)
if [ -f "electron/src/renderer/wasm/pkg/chem_wasm_bg.wasm" ]; then
  print_status "WASM module generated"
else
  echo -e "${RED}✗ WASM module not found${NC}"
  exit 1
fi

# Check node_modules
if [ -d "electron/node_modules" ]; then
  print_status "Node modules installed"
else
  echo -e "${RED}✗ Node modules not installed${NC}"
  exit 1
fi

# 11. Platform-specific setup
echo -e "\n${BLUE}11. Platform-specific setup...${NC}"

case "$OS_TYPE" in
  macOS)
    echo "macOS detected"
    # Check for Xcode command line tools
    if ! command_exists xcode-select; then
      echo "Installing Xcode Command Line Tools..."
      xcode-select --install
      print_status "Xcode Command Line Tools"
    else
      print_status "Xcode Command Line Tools found"
    fi
    ;;
  Linux)
    echo "Linux detected"
    # Check for build essentials
    if command_exists gcc; then
      print_status "Build tools found"
    else
      echo "Installing build tools... (requires sudo)"
      sudo apt-get update
      sudo apt-get install -y build-essential
      print_status "Build tools installation"
    fi
    ;;
  Windows)
    echo "Windows detected"
    echo "Verify Visual Studio Build Tools are installed"
    print_status "Windows setup"
    ;;
esac

# 12. Summary
echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

echo -e "\n${BLUE}Next steps (all from the electron/ directory):${NC}"
echo "1. Start development server:"
echo "   ${GREEN}cd electron && npm start${NC}"
echo ""
echo "2. Run tests:"
echo "   ${GREEN}cd electron && npm test${NC}"
echo ""
echo "3. Build for distribution:"
echo "   ${GREEN}cd electron && npm run make${NC}"
echo ""
echo "4. Read documentation:"
echo "   ${GREEN}cat docs/README.md${NC}"

echo -e "\n${BLUE}Useful commands (run from electron/):${NC}"
echo "npm start          - Start dev server with hot reload"
echo "npm test           - Run unit tests"
echo "npm run test:e2e   - Run E2E tests"
echo "npm run test:perf  - Run performance benchmarks"
echo "npm run lint       - TypeScript type checking"
echo "npm run package    - Package the app (no installer)"
echo "npm run make       - Package for distribution"

echo -e "\n${BLUE}Documentation:${NC}"
echo "Quick Start:        docs/QUICK_START.md"
echo "Full Tutorial:      docs/TUTORIAL.md"
echo "API Reference:      docs/API.md"
echo "Build Guide:        docs/BUILD.md"
echo "Architecture:       docs/ARCHITECTURE.md"
echo "Contributing:       CONTRIBUTING.md"

echo -e "\n${GREEN}Happy chemistry! 🧪${NC}\n"
