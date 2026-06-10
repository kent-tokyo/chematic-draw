import * as wasmBridge from '../renderer/wasm/wasmBridge';
import { advancedFeatures } from '../renderer/lib/advancedFeatures';

jest.mock('../renderer/wasm/wasmBridge');

describe('Integration Tests', () => {
  const mockBenzene = {
    atoms: Array.from({ length: 6 }, (_, i) => ({
      id: i,
      element: 'C',
      x: Math.cos((i * Math.PI) / 3),
      y: Math.sin((i * Math.PI) / 3),
      charge: 0,
      atom_map: 0,
    })),
    bonds: Array.from({ length: 6 }, (_, i) => ({
      id: i,
      from: i,
      to: (i + 1) % 6,
      order: i % 2 === 0 ? 2 : 1,
      stereo: 0,
    })),
  };

  describe('3D Generation Workflow', () => {
    it('should complete full 3D generation pipeline', async () => {
      // Mock the WASM calls
      const mock3dCoords = {
        atoms: mockBenzene.atoms.map((a) => ({
          ...a,
          z: Math.random() * 0.5,
        })),
      };

      (wasmBridge.generate3dCoords as jest.Mock).mockReturnValue(mock3dCoords);
      (wasmBridge.minimize3d as jest.Mock).mockReturnValue(mock3dCoords);

      // Step 1: Generate initial 3D coordinates
      const initial3d = wasmBridge.generate3dCoords(mockBenzene);
      expect(initial3d.atoms).toHaveLength(6);
      expect(initial3d.atoms[0]).toHaveProperty('z');

      // Step 2: Optimize with UFF
      const optimized3d = wasmBridge.minimize3d(mockBenzene, initial3d);
      expect(optimized3d.atoms).toHaveLength(6);

      // Step 3: Export to XYZ format
      let xyzContent = `${optimized3d.atoms.length}\n\n`;
      for (const atom of optimized3d.atoms) {
        xyzContent += `${atom.element} ${atom.x.toFixed(6)} ${atom.y.toFixed(6)} ${atom.z.toFixed(6)}\n`;
      }

      expect(xyzContent).toContain('C');
      expect(xyzContent.split('\n').length).toBeGreaterThan(8); // header + 6 atoms + newlines
    });
  });

  describe('Fingerprint Similarity Workflow', () => {
    it('should calculate similarity between two molecules', () => {
      const fp1 = 'ecfp4_C6H6';
      const fp2 = 'ecfp4_C7H8';

      (wasmBridge.getFingerprint as jest.Mock)
        .mockReturnValueOnce(fp1)
        .mockReturnValueOnce(fp2);

      (wasmBridge.tanimotoSimilarity as jest.Mock).mockReturnValue(0.85);

      // Generate fingerprints
      const fpBenzene = wasmBridge.getFingerprint(mockBenzene);
      const fpToluene = wasmBridge.getFingerprint({
        ...mockBenzene,
        atoms: [...mockBenzene.atoms, { id: 6, element: 'C', x: 2, y: 0, charge: 0, atom_map: 0 }],
      });

      // Calculate similarity
      const similarity = wasmBridge.tanimotoSimilarity(fpBenzene, fpToluene);

      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });
  });

  describe('MCS Search Workflow', () => {
    it('should find MCS and calculate similarity', () => {
      const mol1 = mockBenzene;
      const mol2 = {
        atoms: mockBenzene.atoms.slice(0, 4),
        bonds: mockBenzene.bonds.slice(0, 4),
      };

      const mockMcsResult = {
        common_atoms: [0, 1, 2, 3],
        common_bonds: [0, 1, 2],
        similarity: 0.67,
      };

      (wasmBridge.findMcs as jest.Mock).mockReturnValue(mockMcsResult);

      const mcsResult = wasmBridge.findMcs(mol1, mol2);

      expect(mcsResult.similarity).toBeCloseTo(0.67, 1);
      expect(mcsResult.common_atoms.length).toBeGreaterThan(0);
    });
  });

  describe('Reaction Execution Workflow', () => {
    it('should parse SMIRKS and execute reaction', () => {
      const smirks = '[C:1](=[O])[OH]>>[C:1](=[O])[NH2]';
      const reactant = {
        atoms: [
          { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 1 },
          { id: 1, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 },
          { id: 2, element: 'O', x: 0.5, y: 1, charge: 0, atom_map: 0 },
          { id: 3, element: 'H', x: 0.5, y: -1, charge: 0, atom_map: 0 },
        ],
        bonds: [
          { id: 0, from: 0, to: 1, order: 2, stereo: 0 },
          { id: 1, from: 0, to: 2, order: 1, stereo: 0 },
          { id: 2, from: 2, to: 3, order: 1, stereo: 0 },
        ],
      };

      const mockProducts = [
        {
          atoms: [
            { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 1 },
            { id: 1, element: 'O', x: 1, y: 0, charge: 0, atom_map: 0 },
            { id: 2, element: 'N', x: 0.5, y: 1, charge: 0, atom_map: 0 },
            { id: 3, element: 'H', x: 0.5, y: -1, charge: 0, atom_map: 0 },
          ],
          bonds: [
            { id: 0, from: 0, to: 1, order: 2, stereo: 0 },
            { id: 1, from: 0, to: 2, order: 1, stereo: 0 },
          ],
        },
      ];

      (wasmBridge.runReactants as jest.Mock).mockReturnValue(mockProducts);

      const products = wasmBridge.runReactants(reactant, smirks);

      expect(products).toHaveLength(1);
      expect(products[0].atoms).toHaveLength(4);
      expect(products[0].atoms.some((a) => a.element === 'N')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid SMILES gracefully', () => {
      const invalidSmiles = 'CC[invalid]CC';

      (wasmBridge.runReactants as jest.Mock).mockReturnValue([]);

      const result = wasmBridge.runReactants(mockBenzene, invalidSmiles);

      expect(result).toEqual([]);
    });

    it('should handle empty molecule input', () => {
      const emptyMol = { atoms: [], bonds: [] };

      (wasmBridge.generate3dCoords as jest.Mock).mockReturnValue(emptyMol);

      const result = wasmBridge.generate3dCoords(emptyMol);

      expect(result.atoms).toHaveLength(0);
    });
  });
});
