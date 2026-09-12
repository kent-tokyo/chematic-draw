// Use the same React editor shell as the desktop renderer. The renderer only
// enables Electron menu/file services when window.electronAPI exists; the
// browser host currently gets the full local drawing and analysis workspace.
import '../../electron/src/renderer.tsx';
