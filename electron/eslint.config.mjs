import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.vite/**',
      'out/**',
      'src/renderer/wasm/pkg/**',
      'src/renderer/wasm/pkg-node/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  tseslint.configs.recommended,
  {
    // Applies to every linted file, including main.js/preload.js (plain JS,
    // no React) — kept separate from the React-specific block below so
    // those two files get the same no-unused-vars/no-explicit-any tuning
    // without pulling in react-hooks rules that can't apply to them.
    files: ['src/**/*.{js,ts,tsx}'],
    rules: {
      // Matches this codebase's existing loose style (no strict tsconfig,
      // widespread deliberate `any` at WASM/DTO boundaries) — a full
      // no-explicit-any pass is a separate, much larger decision.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // This codebase's panels deliberately call setState({status:'loading'})
      // synchronously at the top of an effect before an async WASM call, so a
      // failure on a newly-selected molecule can't be mistaken for stale
      // success/error state from the previous one (see ResearchPanel.tsx,
      // Viewer3DPanel.tsx, LipinskiPanel.tsx, PropertyPredictionPanel.tsx —
      // this exact pattern fixed several real bugs earlier this session).
      // Downgraded to warn rather than off: still visible for genuinely new
      // cases, just not a blocking error for an established, correct pattern.
      'react-hooks/set-state-in-effect': 'warn',
    },
  }
);
