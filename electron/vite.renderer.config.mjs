import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [topLevelAwait(), wasm()],
  build: {
    // vite-plugin-top-level-await's esbuild transform falls back to a stale
    // default target (chrome87/edge88/es2020/firefox78/safari14) when
    // build.target isn't set explicitly, rather than Vite 7's own newer
    // default — and can't downlevel-transform some destructuring syntax to
    // that old a target at all. Electron 44's renderer runs on Chromium 152,
    // so there's no need to transform for old browsers; naming the real
    // runtime is more precise than a generic 'esnext'.
    target: 'chrome152',
  },
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
