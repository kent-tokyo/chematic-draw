import '@testing-library/jest-dom';

// jsdom doesn't implement canvas rendering (it logs "Not implemented:
// HTMLCanvasElement.prototype.getContext" and returns undefined) — this is a
// minimal stub covering the 2D context calls components under unit test
// actually make, just enough that they don't crash on a null/missing ctx.
// It does not verify anything gets drawn correctly; that's what the
// Playwright renderer E2E suite is for.
const mockContext2D = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  setLineDash: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  globalAlpha: 1,
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
};

// Guarded: wasmContract.test.ts opts into the `node` test environment (real
// Node globals for the nodejs-target wasm-bindgen output), which has no DOM
// at all — this file's setupFilesAfterEnv still runs there, so this must not
// assume HTMLCanvasElement exists.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext2D) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}

// Mock WASM module. `{ virtual: true }` because this setup file runs before
// EVERY test file (setupFilesAfterEach), including .bench.ts real-WASM
// suites that never import wasmBridge and run in jobs (e.g. CI's
// Performance job) that only build the nodejs-target pkg-node/ output, not
// this web-target pkg/ — without `virtual: true`, jest.mock still tries to
// resolve './renderer/wasm/pkg' on disk to register the mock (even though
// it's never required by those files) and fails outright if pkg/ doesn't
// exist, per https://jestjs.io/docs/jest-object#jestmockmodulename-factory-options.
jest.mock(
  './renderer/wasm/pkg',
  () => ({
    parse_any: jest.fn(),
    to_smiles: jest.fn(),
    to_canonical_smiles: jest.fn(),
    get_properties: jest.fn(),
    generate_3d_coords: jest.fn(),
    minimize_3d_uff: jest.fn(),
    get_fingerprint: jest.fn(),
    get_fingerprint_with_metadata: jest.fn(),
    tanimoto_similarity: jest.fn(),
    dice_similarity: jest.fn(),
    find_mcs: jest.fn(),
    run_reactants: jest.fn(),
  }),
  { virtual: true }
);

// Mock Zustand stores
jest.mock('./renderer/store/moleculeStore', () => ({
  useMoleculeStore: jest.fn((selector) => {
    const mockState = {
      molecule: {
        atoms: [
          { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
          { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
        ],
        bonds: [{ id: 0, from: 0, to: 1, order: 1, stereo: 0 }],
      },
      setMolecule: jest.fn(),
    };
    return selector(mockState);
  }),
}));

jest.mock('./renderer/store/uiStore', () => ({
  useUIStore: jest.fn((selector) => {
    const mockState = {
      theme: 'dark',
      language: 'en',
      statusMessage: '',
      setStatus: jest.fn(),
    };
    return selector(mockState);
  }),
}));
