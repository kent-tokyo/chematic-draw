import '@testing-library/jest-dom';

// Mock WASM module
jest.mock('../renderer/wasm/pkg', () => ({
  parse_any: jest.fn(),
  to_smiles: jest.fn(),
  to_canonical_smiles: jest.fn(),
  get_properties: jest.fn(),
  generate_3d_coords: jest.fn(),
  minimize_3d_uff: jest.fn(),
  get_fingerprint: jest.fn(),
  tanimoto_similarity: jest.fn(),
  dice_similarity: jest.fn(),
  find_mcs: jest.fn(),
  run_reactants: jest.fn(),
}));

// Mock Zustand stores
jest.mock('../renderer/store/moleculeStore', () => ({
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

jest.mock('../renderer/store/uiStore', () => ({
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
