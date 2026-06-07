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
    fs: {
      allow: ['../..'],
    },
  },
});
