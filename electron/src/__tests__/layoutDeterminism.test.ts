/**
 * @jest-environment node
 *
 * v0.3 reliability round: deterministic layout + golden SVG regression
 * tests. chematic-depict itself already guarantees compute_layout is
 * deterministic across repeated calls (a real bug it once had — HashMap/
 * HashSet iteration order shuffling coordinates across calls with
 * IDENTICAL input, fixed upstream, with its own regression test). What
 * that doesn't cover is this application's own pipeline end to end
 * (chem_to_dto's coordinate handling, SVG rendering/serialization) and
 * whether a future code change silently alters the actual rendered output
 * — that's what the golden-file comparison below is for.
 */
import * as fs from 'fs';
import * as path from 'path';
import { ALL_FIXTURES } from '../renderer/wasm/__fixtures__/benchmarkMolecules';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasm: any;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  wasm = require('../renderer/wasm/pkg-node/chem_wasm');
});

describe('determinism: repeated calls on identical input produce identical output', () => {
  it.each(ALL_FIXTURES.map((f) => [f.name, f.molecule] as const))(
    'to_svg(%s) is byte-identical across repeated calls',
    (_name, molecule) => {
      const first = wasm.to_svg(molecule);
      for (let i = 0; i < 10; i++) {
        expect(wasm.to_svg(molecule)).toBe(first);
      }
    }
  );

  it.each(ALL_FIXTURES.map((f) => [f.name, f.molecule] as const))(
    'clean_layout(%s) produces identical coordinates across repeated calls',
    (_name, molecule) => {
      const first = wasm.clean_layout(molecule);
      for (let i = 0; i < 10; i++) {
        expect(wasm.clean_layout(molecule)).toEqual(first);
      }
    }
  );

  it.each(ALL_FIXTURES.map((f) => [f.name, f.molecule] as const))(
    'generate_3d_coords(%s) produces identical coordinates across repeated calls',
    (_name, molecule) => {
      const first = wasm.generate_3d_coords(molecule);
      for (let i = 0; i < 10; i++) {
        expect(wasm.generate_3d_coords(molecule)).toEqual(first);
      }
    }
  );
});

// Committed reference SVGs (src/renderer/wasm/__fixtures__/golden-svg/) —
// a byte-for-byte diff against these catches an accidental layout or
// rendering regression that determinism alone can't (determinism only
// proves "same as itself right now," not "same as before"). To regenerate
// after a deliberate rendering/layout change, review the diff, then run:
//   node -e "
//     const wasm = require('./src/renderer/wasm/pkg-node/chem_wasm');
//     const fs = require('fs');
//     const cases = { benzene: 'c1ccccc1', caffeine: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', 'ring-chain-ring': 'c1ccccc1CCCCCc1ccccc1' };
//     for (const [name, smiles] of Object.entries(cases)) {
//       fs.writeFileSync(`src/renderer/wasm/__fixtures__/golden-svg/${name}.svg`, wasm.to_svg(wasm.parse_any(smiles)));
//     }"
describe('golden SVG: rendered output matches the committed reference', () => {
  const goldenDir = path.join(__dirname, '../renderer/wasm/__fixtures__/golden-svg');
  const cases: Record<string, string> = {
    benzene: 'c1ccccc1',
    caffeine: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
    'ring-chain-ring': 'c1ccccc1CCCCCc1ccccc1',
  };

  it.each(Object.entries(cases))('to_svg(%s) matches golden-svg/%s.svg', (name, smiles) => {
    const golden = fs.readFileSync(path.join(goldenDir, `${name}.svg`), 'utf-8');
    const actual = wasm.to_svg(wasm.parse_any(smiles));
    expect(actual).toBe(golden);
  });
});
