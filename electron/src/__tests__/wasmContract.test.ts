/**
 * @jest-environment node
 *
 * Contract tests against the REAL built WASM binary — no mocks.
 *
 * Every other test in this suite mocks `../renderer/wasm/wasmBridge`, which is
 * necessary for fast, isolated UI tests but means a bug can be "fixed" in the pure
 * Rust core (verified by `cargo test`) while the actual wasm/JS boundary it crosses
 * in production is never exercised at all — exactly how the fingerprint, MCS,
 * reaction-execution, and smarts_search bugs fixed in this codebase's history were
 * able to hide behind a green test suite. These tests load the real compiled
 * `.wasm` binary (via a `--target nodejs` build, generated alongside the app's own
 * `--target web` build — see `package.json`'s `build:wasm:test` script) and call it
 * directly, the same way the Rust code actually executes when embedded in Electron.
 *
 * If `../renderer/wasm/pkg-node` doesn't exist, run `npm run build:wasm:test` first.
 *
 * `@jest-environment node` (not this project's default jsdom): the `--target nodejs`
 * wasm-bindgen output uses real Node globals (TextDecoder/TextEncoder) that jsdom's
 * simulated environment doesn't provide, and this file never touches the DOM anyway.
 */
// The `--target nodejs` wasm-pack output is a plain CommonJS module; requiring it
// (rather than `import`) sidesteps TypeScript module-resolution entirely, which
// this project has no tsconfig.json to configure for a generated, non-node_modules
// package directory. Real call signatures below are still exercised at runtime —
// that's the whole point of this file — just without static typing on `wasm` itself.
//
// The require() is deferred to `beforeAll` rather than done at module load time:
// loading the ~1.4MB wasm binary eagerly, while Jest is still collecting/compiling
// every test file up front, was observed to corrupt ts-jest's shared compilation
// state for sibling test files in the same run (they'd fail with spurious "cannot
// find name jest/expect" errors) — deferring it until this file's own tests
// actually start running avoids that entirely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasm: any;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  wasm = require('../renderer/wasm/pkg-node/chem_wasm');
});

const benzene = {
  atoms: [
    { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
    { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
    { id: 2, element: 'C', x: 1, y: 1, charge: 0, atom_map: 0 },
    { id: 3, element: 'C', x: 0, y: 1, charge: 0, atom_map: 0 },
    { id: 4, element: 'C', x: -1, y: 0, charge: 0, atom_map: 0 },
    { id: 5, element: 'C', x: -1, y: 1, charge: 0, atom_map: 0 },
  ],
  bonds: [
    { id: 0, from: 0, to: 1, order: 4, stereo: 0 },
    { id: 1, from: 1, to: 2, order: 4, stereo: 0 },
    { id: 2, from: 2, to: 3, order: 4, stereo: 0 },
    { id: 3, from: 3, to: 5, order: 4, stereo: 0 },
    { id: 4, from: 5, to: 4, order: 4, stereo: 0 },
    { id: 5, from: 4, to: 0, order: 4, stereo: 0 },
  ],
};

describe('WASM contract (real binary, not mocked)', () => {
  it('parses and writes real chemistry through the real boundary', () => {
    expect(wasm.to_canonical_smiles(benzene)).toBe('c1ccccc1');
  });

  it('fingerprint similarity is 1.0 for a molecule compared with itself, through the real boundary', () => {
    const fp = wasm.get_fingerprint(benzene);
    expect(fp).toHaveLength(512);
    expect(wasm.tanimoto_similarity(fp, fp)).toBe(1.0);
    expect(wasm.dice_similarity(fp, fp)).toBe(1.0);
  });

  it('malformed fingerprint hex throws a catchable JS exception, not a WASM trap', () => {
    // This is the exact scenario a raw `assert!`/`.expect()` in the Rust decoder
    // used to turn into an opaque "unreachable executed" trap instead of a
    // catchable, descriptive error.
    expect(() => wasm.tanimoto_similarity('not-valid-hex', 'also-not-valid')).toThrow();
    try {
      wasm.tanimoto_similarity('too-short', 'too-short');
      throw new Error('expected a throw');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('512');
    }
  });

  it('MCS reports a real search budget and real shared atoms, through the real boundary', () => {
    const ethanol = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 2, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 1, stereo: 0 },
      ],
    };
    const result = wasm.find_mcs(ethanol, ethanol) as {
      common_atoms: number[];
      common_bonds: number[];
      similarity: number;
      search_budget_ms: number;
    };
    expect(result.common_atoms).toHaveLength(3);
    expect(result.similarity).toBe(1.0);
    expect(result.search_budget_ms).toBeGreaterThan(0);
  });

  it('SMARTS search returns real target-molecule atom indices through the real boundary', () => {
    // Regression test for the .keys()-vs-.values() bug: a single-atom oxygen
    // query has its own (query-pattern) index 0; the real oxygen in this
    // 3-atom molecule is atom index 2.
    const ethanol = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 2, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 1, stereo: 0 },
      ],
    };
    const matches = Array.from(wasm.smarts_search(ethanol, '[#8]') as Uint32Array);
    expect(matches).toEqual([2]);
  });

  it('reaction execution: real product on match, through the real boundary', () => {
    const aceticAcid = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 1 },
        { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 0.5, y: 1, charge: 0, atom_map: 0 },
        { id: 3, element: 'O', x: 0.5, y: -1, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 2, stereo: 0 },
        { id: 2, from: 1, to: 3, order: 1, stereo: 0 },
      ],
    };
    const products = wasm.run_reactants(
      aceticAcid,
      '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]'
    ) as Array<{ atoms: Array<{ element: string }> }>;
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].atoms.some((a) => a.element.includes('N'))).toBe(true);
  });

  it('reaction execution: invalid SMIRKS throws a catchable JS exception, not a crash', () => {
    const ethanol = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 2, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 1, stereo: 0 },
      ],
    };
    expect(() => wasm.run_reactants(ethanol, 'not a valid smirks pattern')).toThrow();
  });

  it('reaction execution: no match on a non-matching molecule returns empty, not the unchanged input', () => {
    const ethanol = {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 2, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 1, stereo: 0 },
      ],
    };
    const products = wasm.run_reactants(
      ethanol,
      '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]'
    ) as unknown[];
    expect(products).toEqual([]);
  });
});
