# chematic-draw Documentation

Complete documentation for the chematic-draw Electron application with integrated chemistry tools.

## Table of Contents

1. **[Quick Start](./QUICK_START.md)** — Get up and running in 5 minutes
2. **[Build Guide](./BUILD.md)** — Development setup and build instructions
3. **[API Reference](./API.md)** — WASM bridge functions and TypeScript interfaces
4. **[User Tutorial](./TUTORIAL.md)** — Feature walkthroughs and workflows
5. **[Architecture](./ARCHITECTURE.md)** — System design and component structure
6. **[Troubleshooting](./TROUBLESHOOTING.md)** — Common issues and solutions

## Quick Links

- **Molecule Drawing** → [Basics](./TUTORIAL.md#drawing-molecules)
- **3D Viewer** → [3D Visualization](./TUTORIAL.md#3d-molecular-viewer)
- **Reactions** → [Reaction Mechanism](./TUTORIAL.md#reaction-mechanisms)
- **Properties** → [Property Prediction](./TUTORIAL.md#property-prediction)
- **Stereo** → [Stereochemistry](./TUTORIAL.md#stereochemistry)
- **Search** → [Database & MCS Search](./TUTORIAL.md#search-functionality)

## Features Overview

### Core Functionality
- **Molecule Drawing**: Canvas-based 2D structure editor with keyboard shortcuts
- **3D Visualization**: WebGL-free 3D molecular viewer with rotation, zoom, export
- **Reaction Mechanisms**: Step-by-step visualization with atom mapping and electron flow
- **Property Prediction**: Molecular descriptors, solubility, drug-likeness scores

### Advanced Features
- **Stereochemistry**: Enumeration of stereoisomers with configurable chiral centers
- **Database Search**: Similarity search, maximum common substructure (MCS) detection
- **Batch Operations**: Process multiple molecules with configurable parameters
- **File Export**: SVG, PNG, CSV, XYZ (3D), JSON formats

### Performance
- WebWorker-based Canvas optimization for smooth 3D rendering
- Lazy-loaded panels for responsive UI
- WASM-backed chemistry operations with memory profiling
- Benchmark suite for performance validation

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Desktop** | Electron | 33.x |
| **UI Framework** | React | 18.x |
| **State Management** | Zustand | 4.x |
| **Chemistry Engine** | chematic | 0.1.40 |
| **Canvas 3D** | Canvas 2D API + WebWorker | Native |
| **WASM** | wasm-bindgen | Latest |
| **Build** | Vite + wasm-pack | Latest |
| **Testing** | Jest + Playwright | Latest |

## Getting Started

### For Users
Download the latest release from GitHub and run:
```bash
chematic-draw-x.x.x.dmg  # macOS
chematic-draw-x.x.x.exe  # Windows
chematic-draw-x.x.x.zip  # Linux
```

### For Developers
```bash
git clone https://github.com/yourusername/chematic-draw
cd chematic-draw
npm install
npm start
```

See [Quick Start](./QUICK_START.md) for detailed instructions.

## Version Info

- **chematic**: 0.1.40+
- **chematic-draw**: 0.2.0
- **Node.js**: 18+
- **Rust**: 1.70+ (for building WASM)

## Support

- 📖 **Documentation**: See this directory
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: support@example.com

## License

MIT License - See LICENSE file in root directory
