// Keep the browser entrypoint separate from Electron while sharing the
// Electron-free-compatible playground implementation until the web package is
// extracted into its own published consumer.
import '../../electron/src/playground';
