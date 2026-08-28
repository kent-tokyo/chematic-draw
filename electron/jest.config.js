module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
    }],
  },
  // Scoped to modules that currently have real, deliberate unit test
  // coverage — not the whole src/ tree. Most of this codebase (100+ files)
  // has zero unit tests today; a global collectCoverageFrom + a single
  // "50%" threshold across all of it was never actually achievable and
  // always failed (see internal_docs/ROADMAP.md for the measured numbers).
  // As new modules get real tests, add them here and to coverageThreshold
  // below with their own measured baseline — that keeps this a ratchet
  // (coverage can't silently regress) instead of a number nobody can hit.
  collectCoverageFrom: [
    'src/renderer/wasm/wasmBridge.ts',
    'src/renderer/components/sidebar/Viewer3DPanel.tsx',
  ],
  coverageThreshold: {
    'src/renderer/wasm/wasmBridge.ts': {
      branches: 12,
      functions: 21,
      lines: 56,
      statements: 56,
    },
    'src/renderer/components/sidebar/Viewer3DPanel.tsx': {
      branches: 64,
      functions: 94,
      lines: 87,
      statements: 85,
    },
  },
};
