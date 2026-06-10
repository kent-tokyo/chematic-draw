import * as wasmBridge from '../renderer/wasm/wasmBridge';
import * as wasmModule from '../renderer/wasm/pkg';

jest.mock('../renderer/wasm/pkg');

describe('wasmBridge', () => {
  const mockMolecule = {
    atoms: [
      { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
      { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0 },
    ],
    bonds: [{ id: 0, from: 0, to: 1, order: 1, stereo: 0 }],
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('3D Coordinate Generation', () => {
    it('should generate 3D coordinates', () => {
      const mockCoords = {
        atoms: [
          { id: 0, element: 'C', x: 0.5, y: 0.5, z: 0 },
          { id: 1, element: 'C', x: 1.5, y: 0.5, z: 0 },
        ],
      };
      (wasmModule.generate_3d_coords as jest.Mock).mockReturnValue(mockCoords);

      const result = wasmBridge.generate3dCoords(mockMolecule);

      expect(result).toEqual(mockCoords);
      expect(result.atoms).toHaveLength(2);
      expect(result.atoms[0].z).toBeDefined();
    });

    it('should minimize 3D coordinates with UFF', () => {
      const mockInputCoords = {
        atoms: [
          { id: 0, element: 'C', x: 0, y: 0, z: 0 },
          { id: 1, element: 'C', x: 1, y: 0, z: 0 },
        ],
      };

      const mockOptimized = {
        atoms: [
          { id: 0, element: 'C', x: 0.4, y: 0.3, z: 0.1 },
          { id: 1, element: 'C', x: 1.4, y: 0.3, z: 0.1 },
        ],
      };

      (wasmModule.minimize_3d_uff as jest.Mock).mockReturnValue(mockOptimized);

      const result = wasmBridge.minimize3d(mockMolecule, mockInputCoords);

      expect(result).toEqual(mockOptimized);
      expect(wasmModule.minimize_3d_uff).toHaveBeenCalledWith(mockMolecule, mockInputCoords);
    });
  });

  describe('Fingerprint & Similarity', () => {
    it('should generate ECFP4 fingerprint', () => {
      const mockFp = 'ecfp4_C2H2';
      (wasmModule.get_fingerprint as jest.Mock).mockReturnValue(mockFp);

      const result = wasmBridge.getFingerprint(mockMolecule);

      expect(result).toBe(mockFp);
      expect(wasmModule.get_fingerprint).toHaveBeenCalledWith(mockMolecule);
    });

    it('should calculate Tanimoto similarity', () => {
      const fp1 = 'ecfp4_C2H2';
      const fp2 = 'ecfp4_C3H4';
      (wasmModule.tanimoto_similarity as jest.Mock).mockReturnValue(0.75);

      const result = wasmBridge.tanimotoSimilarity(fp1, fp2);

      expect(result).toBe(0.75);
      expect(wasmModule.tanimoto_similarity).toHaveBeenCalledWith(fp1, fp2);
    });

    it('should calculate Dice similarity', () => {
      const fp1 = 'ecfp4_C2H2';
      const fp2 = 'ecfp4_C3H4';
      (wasmModule.dice_similarity as jest.Mock).mockReturnValue(0.8);

      const result = wasmBridge.diceSimilarity(fp1, fp2);

      expect(result).toBe(0.8);
      expect(wasmModule.dice_similarity).toHaveBeenCalledWith(fp1, fp2);
    });
  });

  describe('MCS Search', () => {
    it('should find maximum common substructure', () => {
      const mol1 = mockMolecule;
      const mol2 = {
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

      const mockMcs = {
        common_atoms: [0, 1],
        common_bonds: [0],
        similarity: 0.67,
      };

      (wasmModule.find_mcs as jest.Mock).mockReturnValue(mockMcs);

      const result = wasmBridge.findMcs(mol1, mol2);

      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(wasmModule.find_mcs).toHaveBeenCalledWith(mol1, mol2);
    });
  });

  describe('Reaction Execution', () => {
    it('should execute SMIRKS reaction', () => {
      const smirks = '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]';
      const mockProducts = [
        {
          atoms: [
            { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
          ],
          bonds: [],
        },
      ];

      (wasmModule.run_reactants as jest.Mock).mockReturnValue(mockProducts);

      const result = wasmBridge.runReactants(mockMolecule, smirks);

      expect(result).toHaveLength(1);
      expect(wasmModule.run_reactants).toHaveBeenCalledWith(mockMolecule, smirks);
    });
  });
});
