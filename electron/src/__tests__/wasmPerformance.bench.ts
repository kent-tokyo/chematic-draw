/**
 * @jest-environment node
 *
 * Real-WASM performance benchmarks (Round 2, items 2-3). Every operation
 * here calls the actual compiled `--target nodejs` WASM binary against
 * fixed, realistic molecule fixtures (electron/src/renderer/wasm/__fixtures__)
 * — never a mocked wasmBridge and never a JS stand-in. This replaces the old
 * `performance.bench.ts`, which measured array copies, Math.random(), and
 * trigonometry as a proxy for "rendering" and never touched WASM at all; it
 * has been renamed to javascript-overhead.smoke.ts and moved into the
 * regular Unit Tests run, since it isn't a chemistry benchmark.
 *
 * Two-layer gate, both enforced by this same file:
 *
 * 1. BLOCKING smoke assertions (the only `expect()` calls below): fail only
 *    when WASM fails to initialize, a call throws, a result is missing or
 *    structurally invalid, a generous time ceiling is exceeded, or a
 *    time-budgeted operation (MCS) ignores its budget. No tight millisecond
 *    thresholds.
 * 2. NON-BLOCKING report: median/p90 timings, input sizes, Node version,
 *    WASM binary size, and commit SHA are written to perf-report.json (a CI
 *    artifact) and logged, but never asserted on — there is no prior-run
 *    baseline yet to regress against.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_FIXTURES,
  ethanol,
  caffeine,
  MCS_SIMILAR_PAIR,
  MCS_DISSIMILAR_PAIR,
  NamedFixture,
} from '../renderer/wasm/__fixtures__/benchmarkMolecules';

// See wasmContract.test.ts for why this require is deferred to beforeAll
// (eager load-time require of the ~1.4MB wasm binary was observed to
// corrupt ts-jest's shared compilation state for sibling test files).
let wasm: any;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  wasm = require('../renderer/wasm/pkg-node/chem_wasm');
});

const WARMUP_ITERATIONS = 3;
const MEASURED_ITERATIONS = 7;
// Generous: only meant to catch a WASM call hanging or a severe accidental
// regression (e.g. an accidental exponential blowup), not to pin real timing.
const GENEROUS_CEILING_MS = 2000;
const MCS_SEARCH_BUDGET_MS = 5000;
// Wall-clock overhead allowance on top of the search budget: the budget is
// an internal search cutoff, not a hard deadline on the whole FFI call
// (JSON (de)serialization, JS<->WASM marshaling, and scheduler jitter all
// add on top of it).
const MCS_BUDGET_OVERHEAD_MS = 3000;

interface OperationReport {
  operation: string;
  input: string;
  atomCount?: number;
  bondCount?: number;
  warmupIterations: number;
  measuredIterations: number;
  medianMs: number;
  p90Ms: number;
  maxMs: number;
}

const report: OperationReport[] = [];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function p90(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
}

/** Runs `fn` with warm-up + repeated timing, records a report row, and returns the last result. */
function measure<T>(
  operation: string,
  fixture: Pick<NamedFixture, 'name'> & { molecule?: { atoms: unknown[]; bonds: unknown[] } },
  fn: () => T
): T {
  for (let i = 0; i < WARMUP_ITERATIONS; i++) fn();

  const samples: number[] = [];
  let result: T;
  for (let i = 0; i < MEASURED_ITERATIONS; i++) {
    const start = performance.now();
    result = fn();
    samples.push(performance.now() - start);
  }

  report.push({
    operation,
    input: fixture.name,
    atomCount: fixture.molecule?.atoms.length,
    bondCount: fixture.molecule?.bonds.length,
    warmupIterations: WARMUP_ITERATIONS,
    measuredIterations: MEASURED_ITERATIONS,
    medianMs: Number(median(samples).toFixed(4)),
    p90Ms: Number(p90(samples).toFixed(4)),
    maxMs: Number(Math.max(...samples).toFixed(4)),
  });

  return result!;
}

afterAll(() => {
  const wasmPath = path.join(__dirname, '../renderer/wasm/pkg-node/chem_wasm_bg.wasm');
  const wasmBinarySize = fs.existsSync(wasmPath) ? fs.statSync(wasmPath).size : null;

  const payload = {
    generatedAt: new Date().toISOString(),
    nodeVersion: process.version,
    commitSha: process.env.GITHUB_SHA ?? null,
    wasmBinarySizeBytes: wasmBinarySize,
    operations: report,
  };

  const outPath = path.join(__dirname, '../../perf-report.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Performance report written to ${outPath} (${report.length} operations measured)`);
});

describe('Real WASM performance (smoke gate + report)', () => {
  it('SMILES parse: succeeds and produces the expected atom/bond counts, within the generous ceiling', () => {
    for (const fixture of ALL_FIXTURES) {
      const parsed = measure('parse_any', fixture, () => wasm.parse_any(fixture.smiles));
      expect(parsed.atoms.length).toBe(fixture.molecule.atoms.length);
      expect(parsed.bonds.length).toBe(fixture.molecule.bonds.length);
    }
    expect(Math.max(...report.filter((r) => r.operation === 'parse_any').map((r) => r.maxMs))).toBeLessThan(
      GENEROUS_CEILING_MS
    );
  });

  it('canonical SMILES generation: succeeds and returns a non-empty string, within the generous ceiling', () => {
    for (const fixture of ALL_FIXTURES) {
      const smiles = measure('to_canonical_smiles', fixture, () => wasm.to_canonical_smiles(fixture.molecule));
      expect(typeof smiles).toBe('string');
      expect(smiles.length).toBeGreaterThan(0);
    }
    expect(
      Math.max(...report.filter((r) => r.operation === 'to_canonical_smiles').map((r) => r.maxMs))
    ).toBeLessThan(GENEROUS_CEILING_MS);
  });

  it('ECFP4 fingerprint generation: succeeds and returns a well-formed hex digest, within the generous ceiling', () => {
    for (const fixture of ALL_FIXTURES) {
      const fp = measure('get_fingerprint', fixture, () => wasm.get_fingerprint(fixture.molecule));
      expect(typeof fp).toBe('string');
      expect(fp).toHaveLength(512);
    }
    expect(Math.max(...report.filter((r) => r.operation === 'get_fingerprint').map((r) => r.maxMs))).toBeLessThan(
      GENEROUS_CEILING_MS
    );
  });

  it('Tanimoto / Dice similarity: succeed and return values in [0, 1]', () => {
    const fpA = wasm.get_fingerprint(caffeine.molecule);
    const fpB = wasm.get_fingerprint(ethanol.molecule);

    const tanimoto = measure('tanimoto_similarity', caffeine, () => wasm.tanimoto_similarity(fpA, fpB));
    const dice = measure('dice_similarity', caffeine, () => wasm.dice_similarity(fpA, fpB));

    for (const value of [tanimoto, dice]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    // A molecule compared with itself must report perfect similarity —
    // the one deterministic value in this suite worth asserting exactly.
    const fpSelf = wasm.get_fingerprint(caffeine.molecule);
    expect(wasm.tanimoto_similarity(fpSelf, fpSelf)).toBe(1.0);
  });

  it('MCS: succeeds and respects its search time budget, for both a similar and a dissimilar pair', () => {
    for (const [a, b] of [MCS_SIMILAR_PAIR, MCS_DISSIMILAR_PAIR]) {
      const label = `${a.name}_vs_${b.name}`;
      const result = measure('find_mcs', { name: label }, () => wasm.find_mcs(a.molecule, b.molecule));
      expect(result.search_budget_ms).toBe(MCS_SEARCH_BUDGET_MS);
      expect(Array.isArray(result.common_atoms)).toBe(true);
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    }
    const mcsRows = report.filter((r) => r.operation === 'find_mcs');
    for (const row of mcsRows) {
      expect(row.maxMs).toBeLessThan(MCS_SEARCH_BUDGET_MS + MCS_BUDGET_OVERHEAD_MS);
    }
    // The similar pair (benzylic-chain scaffold shared) must find a
    // strictly larger common substructure than the dissimilar pair
    // (ethanol vs. naphthalene) — a real chemistry sanity check, not just
    // "didn't throw".
    const similar = wasm.find_mcs(MCS_SIMILAR_PAIR[0].molecule, MCS_SIMILAR_PAIR[1].molecule);
    const dissimilar = wasm.find_mcs(MCS_DISSIMILAR_PAIR[0].molecule, MCS_DISSIMILAR_PAIR[1].molecule);
    expect(similar.common_atoms.length).toBeGreaterThan(dissimilar.common_atoms.length);
  });

  it('2D clean layout: succeeds and preserves topology while producing finite coordinates', () => {
    for (const fixture of ALL_FIXTURES) {
      const relaid = measure('clean_layout', fixture, () => wasm.clean_layout(fixture.molecule));
      expect(relaid.atoms.length).toBe(fixture.molecule.atoms.length);
      expect(relaid.bonds.length).toBe(fixture.molecule.bonds.length);
      for (const atom of relaid.atoms) {
        expect(Number.isFinite(atom.x)).toBe(true);
        expect(Number.isFinite(atom.y)).toBe(true);
      }
    }
    expect(Math.max(...report.filter((r) => r.operation === 'clean_layout').map((r) => r.maxMs))).toBeLessThan(
      GENEROUS_CEILING_MS
    );
  });

  it('molecule validation: succeeds and returns a real, well-formed result (not a Map)', () => {
    for (const fixture of ALL_FIXTURES) {
      const result = measure('validate_molecule', fixture, () => wasm.validate_molecule(fixture.molecule));
      expect(result instanceof Map).toBe(false);
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.valid).toBe(true);
    }
  });

  it('3D coordinate generation: succeeds and returns one finite (x, y, z) per atom, within the generous ceiling', () => {
    for (const fixture of ALL_FIXTURES) {
      const coords3d = measure('generate_3d_coords', fixture, () => wasm.generate_3d_coords(fixture.molecule));
      expect(coords3d.atoms.length).toBe(fixture.molecule.atoms.length);
      for (const atom of coords3d.atoms) {
        expect(Number.isFinite(atom.x)).toBe(true);
        expect(Number.isFinite(atom.y)).toBe(true);
        expect(Number.isFinite(atom.z)).toBe(true);
      }
    }
    expect(
      Math.max(...report.filter((r) => r.operation === 'generate_3d_coords').map((r) => r.maxMs))
    ).toBeLessThan(GENEROUS_CEILING_MS);
  });
});
