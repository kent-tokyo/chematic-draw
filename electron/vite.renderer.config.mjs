import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [topLevelAwait(), wasm()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.tsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    exclude: ['chem_wasm'],
    esbuildOptions: {
      loader: {
        '.ts': 'tsx',
        '.tsx': 'tsx',
      },
    },
  },
  server: {
    // Fixed, not Vite's auto-increment-on-conflict default: playwright.config.ts's
    // webServer.url/baseURL hardcode this port, so a silent drift to 5174+ would
    // reproduce the exact "E2E tests time out waiting for the wrong port" bug
    // this comment is next to the fix for.
    port: 5173,
    strictPort: true,
    fs: {
      allow: ['../..'],
    },
  },
});
