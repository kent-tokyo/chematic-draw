/**
 * Fixed, realistic-molecule fixtures for the real-WASM performance benchmark
 * suite (performanceBenchmark.bench.ts) and any test that needs a molecule
 * WASM can actually operate on end to end.
 *
 * These are NOT `wasm.parse_any(smiles)` output. parse_any -> chem_to_dto
 * currently populates AtomDto.element with a *depiction label* (e.g. "" for
 * a skeletal aromatic carbon, "CH3" for a terminal methyl) rather than a real
 * element symbol, which chem-wasm's dto_to_chem then rejects with
 * "Unknown element: <label>" for almost every downstream WASM call
 * (get_properties, to_canonical_smiles, get_fingerprint, generate_3d_coords,
 * find_mcs, standardize_molecule, run_reactants, to_svg, clean_layout,
 * to_mol_v2000 all reproduce this; validate_molecule is the sole exception,
 * since it never calls dto_to_chem). See internal_docs/ROADMAP.md.
 *
 * These fixtures sidestep that bug at the source: each was generated once
 * via a throwaway Rust example calling chematic::smiles::parse +
 * chematic::core::Element::symbol() directly (the real element, not a
 * depiction label) and chematic::depict::compute_layout for 2D coordinates,
 * then committed here as fixed data — not regenerated at test time, and not
 * derived from parse_any. Verified against the real WASM node build: every
 * fixture below round-trips cleanly through to_canonical_smiles,
 * get_properties (correct molecular formula), get_fingerprint, and
 * generate_3d_coords with no errors.
 */
import { MoleculeDto } from '../../store/types';

export interface NamedFixture {
  name: string;
  smiles: string;
  molecule: MoleculeDto;
}

export const ethanol: NamedFixture = {
  name: 'ethanol',
  smiles: "CCO",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 0.0, y: 0.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 40.0, y: 0.0, charge: 0, atom_map: 0 },
      { id: 2, element: "O", x: 74.641016, y: -20.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 3, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 4, from: 1, to: 2, order: 1, stereo: 0 },
    ],
  },
};

export const benzene: NamedFixture = {
  name: 'benzene',
  smiles: "c1ccccc1",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 34.641016, y: 40.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 69.282032, y: 20.0, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 69.282032, y: -20.0, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 34.641016, y: -40.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 0.0, y: -20.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 0.0, y: 20.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 6, from: 0, to: 1, order: 4, stereo: 0 },
      { id: 7, from: 1, to: 2, order: 4, stereo: 0 },
      { id: 8, from: 2, to: 3, order: 4, stereo: 0 },
      { id: 9, from: 3, to: 4, order: 4, stereo: 0 },
      { id: 10, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 11, from: 0, to: 5, order: 4, stereo: 0 },
    ],
  },
};

export const toluene: NamedFixture = {
  name: 'toluene',
  smiles: "Cc1ccccc1",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 34.641016, y: 80.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 34.641016, y: 40.0, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 69.282032, y: 20.0, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 69.282032, y: -20.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 34.641016, y: -40.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 0.0, y: -20.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 0.0, y: 20.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 7, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 8, from: 1, to: 2, order: 4, stereo: 0 },
      { id: 9, from: 2, to: 3, order: 4, stereo: 0 },
      { id: 10, from: 3, to: 4, order: 4, stereo: 0 },
      { id: 11, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 12, from: 5, to: 6, order: 4, stereo: 0 },
      { id: 13, from: 1, to: 6, order: 4, stereo: 0 },
    ],
  },
};

export const caffeine: NamedFixture = {
  name: 'caffeine',
  smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 177.377712, y: 62.168655, charge: 0, atom_map: 0 },
      { id: 1, element: "N", x: 157.377712, y: 27.527638, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 169.738392, y: -10.514622, charge: 0, atom_map: 0 },
      { id: 3, element: "N", x: 137.377712, y: -34.026032, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 105.017032, y: -10.514622, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 117.377712, y: 27.527638, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 90.612488, y: 57.253431, charge: 0, atom_map: 0 },
      { id: 7, element: "O", x: 102.973168, y: 95.295692, charge: 0, atom_map: 0 },
      { id: 8, element: "N", x: 51.486584, y: 48.936964, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 39.125904, y: 10.894703, charge: 0, atom_map: 0 },
      { id: 10, element: "O", x: 0.0, y: 2.578236, charge: 0, atom_map: 0 },
      { id: 11, element: "N", x: 65.891128, y: -18.83109, charge: 0, atom_map: 0 },
      { id: 12, element: "C", x: 53.530449, y: -56.873351, charge: 0, atom_map: 0 },
      { id: 13, element: "C", x: 24.72136, y: 78.662757, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 14, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 15, from: 1, to: 2, order: 1, stereo: 0 },
      { id: 16, from: 2, to: 3, order: 2, stereo: 0 },
      { id: 17, from: 3, to: 4, order: 1, stereo: 0 },
      { id: 18, from: 4, to: 5, order: 2, stereo: 0 },
      { id: 19, from: 1, to: 5, order: 1, stereo: 0 },
      { id: 20, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 21, from: 6, to: 7, order: 2, stereo: 0 },
      { id: 22, from: 6, to: 8, order: 1, stereo: 0 },
      { id: 23, from: 8, to: 9, order: 1, stereo: 0 },
      { id: 24, from: 9, to: 10, order: 2, stereo: 0 },
      { id: 25, from: 9, to: 11, order: 1, stereo: 0 },
      { id: 26, from: 4, to: 11, order: 1, stereo: 0 },
      { id: 27, from: 11, to: 12, order: 1, stereo: 0 },
      { id: 28, from: 8, to: 13, order: 1, stereo: 0 },
    ],
  },
};

export const aspirin: NamedFixture = {
  name: 'aspirin',
  smiles: "CC(=O)OC1=CC=CC=C1C(=O)O",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 163.923048, y: 134.641016, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 129.282032, y: 114.641016, charge: 0, atom_map: 0 },
      { id: 2, element: "O", x: 129.282032, y: 154.641016, charge: 0, atom_map: 0 },
      { id: 3, element: "O", x: 109.282032, y: 80.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 109.282032, y: 40.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 143.923048, y: 20.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 143.923048, y: -20.0, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 109.282032, y: -40.0, charge: 0, atom_map: 0 },
      { id: 8, element: "C", x: 74.641016, y: -20.0, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 74.641016, y: 20.0, charge: 0, atom_map: 0 },
      { id: 10, element: "C", x: 40.0, y: 40.0, charge: 0, atom_map: 0 },
      { id: 11, element: "O", x: 20.0, y: 74.641016, charge: 0, atom_map: 0 },
      { id: 12, element: "O", x: 0.0, y: 40.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 13, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 14, from: 1, to: 2, order: 2, stereo: 0 },
      { id: 15, from: 1, to: 3, order: 1, stereo: 0 },
      { id: 16, from: 3, to: 4, order: 1, stereo: 0 },
      { id: 17, from: 4, to: 5, order: 2, stereo: 0 },
      { id: 18, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 19, from: 6, to: 7, order: 2, stereo: 0 },
      { id: 20, from: 7, to: 8, order: 1, stereo: 0 },
      { id: 21, from: 8, to: 9, order: 2, stereo: 0 },
      { id: 22, from: 4, to: 9, order: 1, stereo: 0 },
      { id: 23, from: 9, to: 10, order: 1, stereo: 0 },
      { id: 24, from: 10, to: 11, order: 2, stereo: 0 },
      { id: 25, from: 10, to: 12, order: 1, stereo: 0 },
    ],
  },
};

export const ibuprofen: NamedFixture = {
  name: 'ibuprofen',
  smiles: "CC(C)Cc1ccc(cc1)C(C)C(=O)O",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 89.282032, y: 134.641016, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 54.641016, y: 114.641016, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 54.641016, y: 154.641016, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 34.641016, y: 80.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 34.641016, y: 40.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 69.282032, y: 20.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 69.282032, y: -20.0, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 34.641016, y: -40.0, charge: 0, atom_map: 0 },
      { id: 8, element: "C", x: 0.0, y: -20.0, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 0.0, y: 20.0, charge: 0, atom_map: 0 },
      { id: 10, element: "C", x: 34.641016, y: -80.0, charge: 0, atom_map: 0 },
      { id: 11, element: "C", x: 14.641016, y: -114.641016, charge: 0, atom_map: 0 },
      { id: 12, element: "C", x: 54.641016, y: -114.641016, charge: 0, atom_map: 0 },
      { id: 13, element: "O", x: 54.641016, y: -154.641016, charge: 0, atom_map: 0 },
      { id: 14, element: "O", x: 89.282032, y: -134.641016, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 15, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 16, from: 1, to: 2, order: 1, stereo: 0 },
      { id: 17, from: 1, to: 3, order: 1, stereo: 0 },
      { id: 18, from: 3, to: 4, order: 1, stereo: 0 },
      { id: 19, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 20, from: 5, to: 6, order: 4, stereo: 0 },
      { id: 21, from: 6, to: 7, order: 4, stereo: 0 },
      { id: 22, from: 7, to: 8, order: 4, stereo: 0 },
      { id: 23, from: 8, to: 9, order: 4, stereo: 0 },
      { id: 24, from: 4, to: 9, order: 4, stereo: 0 },
      { id: 25, from: 7, to: 10, order: 1, stereo: 0 },
      { id: 26, from: 10, to: 11, order: 1, stereo: 0 },
      { id: 27, from: 10, to: 12, order: 1, stereo: 0 },
      { id: 28, from: 12, to: 13, order: 2, stereo: 0 },
      { id: 29, from: 12, to: 14, order: 1, stereo: 0 },
    ],
  },
};

export const cholesterol: NamedFixture = {
  name: 'cholesterol',
  smiles: "CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 438.678473, y: 191.450687, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 404.037456, y: 171.450687, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 404.037456, y: 211.450687, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 384.037456, y: 136.809671, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 349.39644, y: 116.809671, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 329.39644, y: 82.168655, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 294.755424, y: 62.168655, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 294.755424, y: 102.168655, charge: 0, atom_map: 0 },
      { id: 8, element: "C", x: 274.755424, y: 27.527638, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 287.116104, y: -10.514622, charge: 0, atom_map: 0 },
      { id: 10, element: "C", x: 254.755424, y: -34.026032, charge: 0, atom_map: 0 },
      { id: 11, element: "C", x: 222.394744, y: -10.514622, charge: 0, atom_map: 0 },
      { id: 12, element: "C", x: 234.755424, y: 27.527638, charge: 0, atom_map: 0 },
      { id: 13, element: "C", x: 207.9902, y: 57.253431, charge: 0, atom_map: 0 },
      { id: 14, element: "C", x: 168.864296, y: 48.936964, charge: 0, atom_map: 0 },
      { id: 15, element: "C", x: 156.503616, y: 10.894703, charge: 0, atom_map: 0 },
      { id: 16, element: "C", x: 183.26884, y: -18.83109, charge: 0, atom_map: 0 },
      { id: 17, element: "C", x: 170.908161, y: -56.873351, charge: 0, atom_map: 0 },
      { id: 18, element: "C", x: 131.782257, y: -65.189818, charge: 0, atom_map: 0 },
      { id: 19, element: "C", x: 105.017032, y: -35.464025, charge: 0, atom_map: 0 },
      { id: 20, element: "C", x: 117.377712, y: 2.578236, charge: 0, atom_map: 0 },
      { id: 21, element: "C", x: 90.612488, y: 32.304029, charge: 0, atom_map: 0 },
      { id: 22, element: "C", x: 51.486584, y: 23.987561, charge: 0, atom_map: 0 },
      { id: 23, element: "C", x: 39.125904, y: -14.0547, charge: 0, atom_map: 0 },
      { id: 24, element: "C", x: 65.891128, y: -43.780493, charge: 0, atom_map: 0 },
      { id: 25, element: "O", x: 0.0, y: -22.371167, charge: 0, atom_map: 0 },
      { id: 26, element: "C", x: 129.738392, y: 40.620496, charge: 0, atom_map: 0 },
      { id: 27, element: "C", x: 247.116104, y: 65.569899, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 28, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 29, from: 1, to: 2, order: 1, stereo: 0 },
      { id: 30, from: 1, to: 3, order: 1, stereo: 0 },
      { id: 31, from: 3, to: 4, order: 1, stereo: 0 },
      { id: 32, from: 4, to: 5, order: 1, stereo: 0 },
      { id: 33, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 34, from: 6, to: 7, order: 1, stereo: 0 },
      { id: 35, from: 6, to: 8, order: 1, stereo: 0 },
      { id: 36, from: 8, to: 9, order: 1, stereo: 0 },
      { id: 37, from: 9, to: 10, order: 1, stereo: 0 },
      { id: 38, from: 10, to: 11, order: 1, stereo: 0 },
      { id: 39, from: 11, to: 12, order: 1, stereo: 0 },
      { id: 40, from: 8, to: 12, order: 1, stereo: 0 },
      { id: 41, from: 12, to: 13, order: 1, stereo: 0 },
      { id: 42, from: 13, to: 14, order: 1, stereo: 0 },
      { id: 43, from: 14, to: 15, order: 1, stereo: 0 },
      { id: 44, from: 15, to: 16, order: 1, stereo: 0 },
      { id: 45, from: 11, to: 16, order: 1, stereo: 0 },
      { id: 46, from: 16, to: 17, order: 1, stereo: 0 },
      { id: 47, from: 17, to: 18, order: 1, stereo: 0 },
      { id: 48, from: 18, to: 19, order: 2, stereo: 0 },
      { id: 49, from: 19, to: 20, order: 1, stereo: 0 },
      { id: 50, from: 15, to: 20, order: 1, stereo: 0 },
      { id: 51, from: 20, to: 21, order: 1, stereo: 0 },
      { id: 52, from: 21, to: 22, order: 1, stereo: 0 },
      { id: 53, from: 22, to: 23, order: 1, stereo: 0 },
      { id: 54, from: 23, to: 24, order: 1, stereo: 0 },
      { id: 55, from: 19, to: 24, order: 1, stereo: 0 },
      { id: 56, from: 23, to: 25, order: 1, stereo: 0 },
      { id: 57, from: 20, to: 26, order: 1, stereo: 0 },
      { id: 58, from: 12, to: 27, order: 1, stereo: 0 },
    ],
  },
};

export const testosterone: NamedFixture = {
  name: 'testosterone',
  smiles: "CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 46.765224, y: 62.168655, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 66.765224, y: 27.527638, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 93.530449, y: 57.253431, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 132.656353, y: 48.936964, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 145.017032, y: 10.894703, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 118.251808, y: -18.83109, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 79.125904, y: -10.514622, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 46.765224, y: -34.026032, charge: 0, atom_map: 0 },
      { id: 8, element: "C", x: 14.404544, y: -10.514622, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 26.765224, y: 27.527638, charge: 0, atom_map: 0 },
      { id: 10, element: "O", x: 0.0, y: 57.253431, charge: 0, atom_map: 0 },
      { id: 11, element: "C", x: 130.612488, y: -56.873351, charge: 0, atom_map: 0 },
      { id: 12, element: "C", x: 169.738392, y: -65.189818, charge: 0, atom_map: 0 },
      { id: 13, element: "C", x: 196.503616, y: -35.464025, charge: 0, atom_map: 0 },
      { id: 14, element: "C", x: 81.40624, y: 20.0, charge: 0, atom_map: 0 },
      { id: 15, element: "C", x: 81.40624, y: -20.0, charge: 0, atom_map: 0 },
      { id: 16, element: "O", x: 116.047257, y: -40.0, charge: 0, atom_map: 0 },
      { id: 17, element: "C", x: 46.765224, y: -40.0, charge: 0, atom_map: 0 },
      { id: 18, element: "C", x: 12.124208, y: -20.0, charge: 0, atom_map: 0 },
      { id: 19, element: "C", x: 184.142936, y: 2.578236, charge: 0, atom_map: 0 },
      { id: 20, element: "C", x: 210.908161, y: 32.304029, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 21, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 22, from: 1, to: 2, order: 1, stereo: 0 },
      { id: 23, from: 2, to: 3, order: 1, stereo: 0 },
      { id: 24, from: 3, to: 4, order: 1, stereo: 0 },
      { id: 25, from: 4, to: 5, order: 1, stereo: 0 },
      { id: 26, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 27, from: 1, to: 6, order: 1, stereo: 0 },
      { id: 28, from: 6, to: 7, order: 1, stereo: 0 },
      { id: 29, from: 7, to: 8, order: 1, stereo: 0 },
      { id: 30, from: 8, to: 9, order: 1, stereo: 0 },
      { id: 31, from: 1, to: 9, order: 1, stereo: 0 },
      { id: 32, from: 9, to: 10, order: 1, stereo: 0 },
      { id: 33, from: 5, to: 11, order: 1, stereo: 0 },
      { id: 34, from: 11, to: 12, order: 1, stereo: 0 },
      { id: 35, from: 12, to: 13, order: 1, stereo: 0 },
      { id: 36, from: 13, to: 14, order: 2, stereo: 0 },
      { id: 37, from: 14, to: 15, order: 1, stereo: 0 },
      { id: 38, from: 15, to: 16, order: 2, stereo: 0 },
      { id: 39, from: 15, to: 17, order: 1, stereo: 0 },
      { id: 40, from: 17, to: 18, order: 1, stereo: 0 },
      { id: 41, from: 18, to: 19, order: 1, stereo: 0 },
      { id: 42, from: 4, to: 19, order: 1, stereo: 0 },
      { id: 43, from: 13, to: 19, order: 1, stereo: 0 },
      { id: 44, from: 19, to: 20, order: 1, stereo: 0 },
    ],
  },
};

export const sertraline: NamedFixture = {
  name: 'sertraline',
  smiles: "CNC1CCC(c2ccc(Cl)c(Cl)c2)c2ccccc21",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 123.923048, y: 114.641016, charge: 0, atom_map: 0 },
      { id: 1, element: "N", x: 103.923048, y: 80.0, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 103.923048, y: 40.0, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 138.564065, y: 20.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 138.564065, y: -20.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 103.923048, y: -40.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 103.923048, y: -80.0, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 69.282032, y: -100.0, charge: 0, atom_map: 0 },
      { id: 8, element: "C", x: 69.282032, y: -140.0, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 103.923048, y: -160.0, charge: 0, atom_map: 0 },
      { id: 10, element: "Cl", x: 103.923048, y: -200.0, charge: 0, atom_map: 0 },
      { id: 11, element: "C", x: 138.564065, y: -140.0, charge: 0, atom_map: 0 },
      { id: 12, element: "Cl", x: 173.205081, y: -160.0, charge: 0, atom_map: 0 },
      { id: 13, element: "C", x: 138.564065, y: -100.0, charge: 0, atom_map: 0 },
      { id: 14, element: "C", x: 69.282032, y: -20.0, charge: 0, atom_map: 0 },
      { id: 15, element: "C", x: 34.641016, y: -40.0, charge: 0, atom_map: 0 },
      { id: 16, element: "C", x: 0.0, y: -20.0, charge: 0, atom_map: 0 },
      { id: 17, element: "C", x: 0.0, y: 20.0, charge: 0, atom_map: 0 },
      { id: 18, element: "C", x: 34.641016, y: 40.0, charge: 0, atom_map: 0 },
      { id: 19, element: "C", x: 69.282032, y: 20.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 20, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 21, from: 1, to: 2, order: 1, stereo: 0 },
      { id: 22, from: 2, to: 3, order: 1, stereo: 0 },
      { id: 23, from: 3, to: 4, order: 1, stereo: 0 },
      { id: 24, from: 4, to: 5, order: 1, stereo: 0 },
      { id: 25, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 26, from: 6, to: 7, order: 4, stereo: 0 },
      { id: 27, from: 7, to: 8, order: 4, stereo: 0 },
      { id: 28, from: 8, to: 9, order: 4, stereo: 0 },
      { id: 29, from: 9, to: 10, order: 1, stereo: 0 },
      { id: 30, from: 9, to: 11, order: 4, stereo: 0 },
      { id: 31, from: 11, to: 12, order: 1, stereo: 0 },
      { id: 32, from: 11, to: 13, order: 4, stereo: 0 },
      { id: 33, from: 6, to: 13, order: 4, stereo: 0 },
      { id: 34, from: 5, to: 14, order: 1, stereo: 0 },
      { id: 35, from: 14, to: 15, order: 4, stereo: 0 },
      { id: 36, from: 15, to: 16, order: 4, stereo: 0 },
      { id: 37, from: 16, to: 17, order: 4, stereo: 0 },
      { id: 38, from: 17, to: 18, order: 4, stereo: 0 },
      { id: 39, from: 18, to: 19, order: 4, stereo: 0 },
      { id: 40, from: 14, to: 19, order: 4, stereo: 0 },
      { id: 41, from: 2, to: 19, order: 1, stereo: 0 },
    ],
  },
};

export const mcsSimilarA: NamedFixture = {
  name: 'mcs_similar_a',
  smiles: "c1ccccc1CCO",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 123.923048, y: 40.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 158.564065, y: 20.0, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 158.564065, y: -20.0, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 123.923048, y: -40.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 89.282032, y: -20.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 89.282032, y: 20.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 54.641016, y: 40.0, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 34.641016, y: 74.641016, charge: 0, atom_map: 0 },
      { id: 8, element: "O", x: 0.0, y: 94.641016, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 9, from: 0, to: 1, order: 4, stereo: 0 },
      { id: 10, from: 1, to: 2, order: 4, stereo: 0 },
      { id: 11, from: 2, to: 3, order: 4, stereo: 0 },
      { id: 12, from: 3, to: 4, order: 4, stereo: 0 },
      { id: 13, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 14, from: 0, to: 5, order: 4, stereo: 0 },
      { id: 15, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 16, from: 6, to: 7, order: 1, stereo: 0 },
      { id: 17, from: 7, to: 8, order: 1, stereo: 0 },
    ],
  },
};

export const mcsSimilarB: NamedFixture = {
  name: 'mcs_similar_b',
  smiles: "c1ccccc1CCN",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 123.923048, y: 40.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 158.564065, y: 20.0, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 158.564065, y: -20.0, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 123.923048, y: -40.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 89.282032, y: -20.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 89.282032, y: 20.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 54.641016, y: 40.0, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 34.641016, y: 74.641016, charge: 0, atom_map: 0 },
      { id: 8, element: "N", x: 0.0, y: 94.641016, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 9, from: 0, to: 1, order: 4, stereo: 0 },
      { id: 10, from: 1, to: 2, order: 4, stereo: 0 },
      { id: 11, from: 2, to: 3, order: 4, stereo: 0 },
      { id: 12, from: 3, to: 4, order: 4, stereo: 0 },
      { id: 13, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 14, from: 0, to: 5, order: 4, stereo: 0 },
      { id: 15, from: 5, to: 6, order: 1, stereo: 0 },
      { id: 16, from: 6, to: 7, order: 1, stereo: 0 },
      { id: 17, from: 7, to: 8, order: 1, stereo: 0 },
    ],
  },
};

export const mcsDissimilarA: NamedFixture = {
  name: 'mcs_dissimilar_a',
  smiles: "CCO",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 0.0, y: 0.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 40.0, y: 0.0, charge: 0, atom_map: 0 },
      { id: 2, element: "O", x: 74.641016, y: -20.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 3, from: 0, to: 1, order: 1, stereo: 0 },
      { id: 4, from: 1, to: 2, order: 1, stereo: 0 },
    ],
  },
};

export const mcsDissimilarB: NamedFixture = {
  name: 'mcs_dissimilar_b',
  smiles: "c1ccc2ccccc2c1",
  molecule: {
    atoms: [
      { id: 0, element: "C", x: 69.282032, y: 40.0, charge: 0, atom_map: 0 },
      { id: 1, element: "C", x: 103.923048, y: 20.0, charge: 0, atom_map: 0 },
      { id: 2, element: "C", x: 103.923048, y: -20.0, charge: 0, atom_map: 0 },
      { id: 3, element: "C", x: 69.282032, y: -40.0, charge: 0, atom_map: 0 },
      { id: 4, element: "C", x: 69.282032, y: -80.0, charge: 0, atom_map: 0 },
      { id: 5, element: "C", x: 34.641016, y: -100.0, charge: 0, atom_map: 0 },
      { id: 6, element: "C", x: 0.0, y: -80.0, charge: 0, atom_map: 0 },
      { id: 7, element: "C", x: 0.0, y: -40.0, charge: 0, atom_map: 0 },
      { id: 8, element: "C", x: 34.641016, y: -20.0, charge: 0, atom_map: 0 },
      { id: 9, element: "C", x: 34.641016, y: 20.0, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 10, from: 0, to: 1, order: 4, stereo: 0 },
      { id: 11, from: 1, to: 2, order: 4, stereo: 0 },
      { id: 12, from: 2, to: 3, order: 4, stereo: 0 },
      { id: 13, from: 3, to: 4, order: 4, stereo: 0 },
      { id: 14, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 15, from: 5, to: 6, order: 4, stereo: 0 },
      { id: 16, from: 6, to: 7, order: 4, stereo: 0 },
      { id: 17, from: 7, to: 8, order: 4, stereo: 0 },
      { id: 18, from: 3, to: 8, order: 4, stereo: 0 },
      { id: 19, from: 8, to: 9, order: 4, stereo: 0 },
      { id: 20, from: 0, to: 9, order: 4, stereo: 0 },
    ],
  },
};

/** All fixtures, for suites that want to iterate every molecule uniformly. */
export const ALL_FIXTURES: NamedFixture[] = [
  ethanol,
  benzene,
  toluene,
  caffeine,
  aspirin,
  ibuprofen,
  cholesterol,
  testosterone,
  sertraline,
  mcsSimilarA,
  mcsSimilarB,
  mcsDissimilarA,
  mcsDissimilarB,
];

/** A same-scaffold pair (benzylic chain, O vs N substituent) expected to share substantial common substructure. */
export const MCS_SIMILAR_PAIR: [NamedFixture, NamedFixture] = [mcsSimilarA, mcsSimilarB];

/** A minimal, structurally unrelated pair (acyclic vs. fused bicyclic aromatic) expected to share little to no common substructure. */
export const MCS_DISSIMILAR_PAIR: [NamedFixture, NamedFixture] = [mcsDissimilarA, mcsDissimilarB];
