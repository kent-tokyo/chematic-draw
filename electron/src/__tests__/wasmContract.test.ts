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
// No top-level import/export otherwise in this file — without one, TS treats
// it as a global script rather than a module, so `let wasm` below leaks into
// the shared global scope and collides with any sibling test file doing the
// same (e.g. parseAnyContract.test.ts). This export makes it a real module.
export {};

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

  it('fingerprint metadata reports real ECFP4 parameters, not a guess from the name', () => {
    const withMeta = wasm.get_fingerprint_with_metadata(benzene) as {
      hex: string;
      kind: string;
      radius: number;
      bit_length: number;
      mode: string;
    };
    expect(withMeta.kind).toBe('ECFP4');
    expect(withMeta.radius).toBe(2);
    expect(withMeta.bit_length).toBe(2048);
    expect(withMeta.mode).toBe('bit');
    expect(withMeta.hex).toHaveLength(512);
    // Must be the same bits the hex-only accessor produces.
    expect(withMeta.hex).toBe(wasm.get_fingerprint(benzene));
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
    const outcome = wasm.run_reactants(
      aceticAcid,
      '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]'
    ) as { status: string; products?: Array<{ atoms: Array<{ element: string }> }> };
    expect(outcome.status).toBe('applied');
    expect(outcome.products!.length).toBeGreaterThan(0);
    expect(outcome.products![0].atoms.some((a) => a.element.includes('N'))).toBe(true);
  });

  it('reaction execution: invalid SMIRKS is a tagged invalid_reaction outcome, not an exception', () => {
    // Domain-level outcomes (including an unparseable SMIRKS) are real Ok
    // values through the wasm boundary now — Err/throw is reserved for
    // FFI-level failures (e.g. malformed input JSON), which don't apply here.
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
    const outcome = wasm.run_reactants(ethanol, 'not a valid smirks pattern') as {
      status: string;
      message?: string;
    };
    expect(outcome.status).toBe('invalid_reaction');
    expect(outcome.message).toBeTruthy();
  });

  it('reaction execution: reactant-count mismatch is a distinct unsupported_chemistry outcome, not misreported as invalid_reaction', () => {
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
    // Syntactically valid SMIRKS written for two reactants; chematic-draw
    // always supplies one.
    const outcome = wasm.run_reactants(ethanol, '[C:1].[N:2]>>[C:1][N:2]') as {
      status: string;
      message?: string;
    };
    expect(outcome.status).toBe('unsupported_chemistry');
    expect(outcome.message).toBeTruthy();
  });

  it('reaction execution: no match on a non-matching molecule is a tagged no_match, not the unchanged input', () => {
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
    const outcome = wasm.run_reactants(
      ethanol,
      '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]'
    ) as { status: string };
    expect(outcome.status).toBe('no_match');
  });

  // Formerly blocked: chem_to_dto (used by parse_any) used to fill
  // AtomDto.element with a depiction label ("" for a skeletal aromatic
  // carbon) instead of a real element symbol, which dto_to_chem (used by
  // get_fingerprint and almost every other DTO-consuming function) rejected
  // with "Unknown element: <label>". Fixed — element is now always a real
  // symbol, and depiction labels moved to their own display_label field.
  // See internal_docs/ROADMAP.md and parseAnyContract.test.ts for the full
  // round-trip contract this fix restored.
  it('real WASM parse -> fingerprint -> similarity succeeds', () => {
    const parsed = wasm.parse_any('c1ccccc1');
    const fp = wasm.get_fingerprint(parsed);
    expect(fp).toHaveLength(512);
    expect(wasm.tanimoto_similarity(fp, fp)).toBe(1.0);
  });

  // v0.3 reliability round: validate_molecule extended from JSON-shape-only
  // checks to real chemistry (chematic-core's validate_valence,
  // Molecule::is_connected/fragments, chematic-perception's
  // assign_aromaticity) - see chem-wasm's validate_molecule for why
  // "unspecified stereocenter" detection is deliberately NOT included
  // (chematic's num_unspecified_stereocenters has no substituent-uniqueness
  // check and false-positives on nearly every sp3 carbon; confirmed
  // ethanol, with zero real stereocenters, reports 2).
  describe('validate_molecule: real chemistry, not just JSON shape', () => {
    it('a structurally sound molecule has no errors or warnings', () => {
      const result = wasm.validate_molecule(wasm.parse_any('CCO'));
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('an over-valenced atom is a real, specific error (not just bond-reference sanity)', () => {
      // A carbon with 5 single bonds - chemically impossible, not just a
      // malformed-JSON case the old bond-reference-only check would miss.
      const overvalent = {
        atoms: [0, 1, 2, 3, 4, 5].map((i) => ({ id: i, element: 'C', x: i * 10, y: 0, charge: 0, atom_map: 0 })),
        bonds: [1, 2, 3, 4, 5].map((to, i) => ({ id: 6 + i, from: 0, to, order: 1, stereo: 0 })),
      };
      const result = wasm.validate_molecule(overvalent);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('valence 5');
    });

    it('a multi-fragment molecule is a warning, not an error, with the real fragment count', () => {
      const result = wasm.validate_molecule(wasm.parse_any('CCO.c1ccccc1'));
      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual(['Disconnected structure: 2 separate fragments']);
    });

    it('a real antiaromatic ring (cyclobutadiene) is flagged as a warning', () => {
      const result = wasm.validate_molecule(wasm.parse_any('C1=CC=C1'));
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w: string) => w.includes('antiaromatic'))).toBe(true);
    });

    it('an unrecognized element symbol is a validation error, not a thrown exception', () => {
      // validate_molecule's whole purpose is reporting on validity - a
      // dto_to_chem failure must become a finding in the result, not an
      // unhandled throw that leaves the caller with nothing.
      const badElement = {
        atoms: [{ id: 0, element: 'Xx', x: 0, y: 0, charge: 0, atom_map: 0 }],
        bonds: [],
      };
      expect(() => wasm.validate_molecule(badElement)).not.toThrow();
      const result = wasm.validate_molecule(badElement);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown element');
    });
  });

  // BLOCKED, not merely unwritten: see docs/INTEROP.md's "Known lossy
  // conversions" table. Confirmed empirically that a wildcard atom
  // silently degrades to a plain carbon (wildcard: false, element: "C")
  // when written to and re-parsed from any of these formats, with no error
  // or warning. Deliberately not asserted as either passing or throwing
  // (see this file's other it.skip above for why), so a future fix isn't
  // accidentally hidden by a stale "expected to fail" assertion. Un-skip
  // once chem_to_dto/dto_to_chem or the underlying chematic-mol writers
  // preserve the wildcard flag through these formats.
  it.skip.each(['to_mol_v2000', 'to_mol_v3000', 'to_sdf', 'to_cml'])(
    'a wildcard atom survives a round-trip through %s (blocked: currently degrades to plain carbon)',
    (writerName) => {
      const mol = wasm.parse_any('[*]CC');
      const text = wasm[writerName](mol);
      const reparsed = wasm.parse_any(text);
      const wildcardAtom = reparsed.atoms.find((a: { wildcard?: boolean }) => a.wildcard);
      expect(wildcardAtom).toBeDefined();
    }
  );

  // BLOCKED, same shape as the wildcard case above: confirmed empirically
  // that an isotope-labeled atom (e.g. 13C) silently loses its isotope
  // (comes back `undefined`) when written to and re-parsed from MOL V2000
  // or SDF — these are chematic-mol's own writers, not something this
  // bridge encodes, so there's no dto_to_chem/chem_to_dto fix available
  // here. CML and canonical SMILES both preserve it correctly (see
  // parseAnyContract.test.ts). See docs/INTEROP.md's "Known lossy
  // conversions" table. Un-skip once chematic-mol's V2000/SDF writers
  // encode the isotope (mass-difference) field.
  it.skip.each(['to_mol_v2000', 'to_sdf'])(
    'an isotope-labeled atom survives a round-trip through %s (blocked: isotope dropped)',
    (writerName) => {
      const mol = wasm.parse_any('[13CH4]');
      const text = wasm[writerName](mol);
      const reparsed = wasm.parse_any(text);
      expect(reparsed.atoms[0].isotope).toBe(13);
    }
  );
});
