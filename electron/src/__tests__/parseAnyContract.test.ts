/**
 * @jest-environment node
 *
 * The parse_any -> MoleculeDto -> downstream-WASM-API round-trip contract.
 *
 * Until this round, chem_to_dto (used by parse_any and every format parser)
 * filled AtomDto.element with a DEPICTION LABEL ("CH3", "OH", "" for a
 * skeletal carbon) instead of a real element symbol, while dto_to_chem
 * (used by nearly every function taking a MoleculeDto as input) required a
 * real symbol — so almost any molecule obtained via parse_any() threw
 * "Unknown element: <label>" the moment it was passed to another WASM call.
 * This is a live, not latent, bug: the app loads its default molecule via
 * parse_any on every startup, and several panels auto-compute on it.
 *
 * These tests exercise the REAL path a user's action actually takes —
 * input text -> parse_any -> downstream API — not hand-built DTOs (that's
 * wasmContract.test.ts's job, testing the downstream APIs' own chemistry
 * independent of the parse step). A hand-built DTO with correct symbols
 * passing does not prove parse_any's output is usable; only this does.
 *
 * See internal_docs/ROADMAP.md for the full root-cause writeup.
 */
// No top-level import otherwise in this file — without one, TS treats it as
// a global script rather than a module, so `let wasm` below would leak into
// the shared global scope and collide with sibling test files doing the
// same (e.g. wasmContract.test.ts). This export makes it a real module.
export {};

let wasm: any;
let formatFixtures: Record<string, string>;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  wasm = require('../renderer/wasm/pkg-node/chem_wasm');

  // Item 6: one rich fixture per format (carbon skeleton, aromatic ring,
  // halogen, heteroatom, formal charge) — generated from a single
  // hand-verified molecule via chem-wasm's own writers rather than hand-typed
  // across 6 formats, since the format axis only proves parser wiring into
  // the same chem_to_dto that a representative molecule per format already
  // demonstrates. Aromaticity, stereo bonds, isolated atoms, and
  // terminal-implicit-H atoms are covered via the SMILES corpus elsewhere in
  // this file, wasmContract.test.ts, and benchmarkMolecules.ts.
  const chlorobenzoate = {
    atoms: [
      { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }, // ring C1 (ipso, bears COO-)
      { id: 1, element: 'C', x: 40, y: 0, charge: 0, atom_map: 0 }, // ring C2
      { id: 2, element: 'C', x: 60, y: -35, charge: 0, atom_map: 0 }, // ring C3
      { id: 3, element: 'C', x: 40, y: -70, charge: 0, atom_map: 0 }, // ring C4 (bears Cl)
      { id: 4, element: 'C', x: 0, y: -70, charge: 0, atom_map: 0 }, // ring C5
      { id: 5, element: 'C', x: -20, y: -35, charge: 0, atom_map: 0 }, // ring C6
      { id: 6, element: 'Cl', x: 60, y: -105, charge: 0, atom_map: 0 },
      { id: 7, element: 'C', x: -20, y: 35, charge: 0, atom_map: 0 }, // carboxylate C
      { id: 8, element: 'O', x: -55, y: 35, charge: -1, atom_map: 0 },
      { id: 9, element: 'O', x: 0, y: 65, charge: 0, atom_map: 0 },
    ],
    bonds: [
      { id: 10, from: 0, to: 1, order: 4, stereo: 0 },
      { id: 11, from: 1, to: 2, order: 4, stereo: 0 },
      { id: 12, from: 2, to: 3, order: 4, stereo: 0 },
      { id: 13, from: 3, to: 4, order: 4, stereo: 0 },
      { id: 14, from: 4, to: 5, order: 4, stereo: 0 },
      { id: 15, from: 5, to: 0, order: 4, stereo: 0 },
      { id: 16, from: 3, to: 6, order: 1, stereo: 0 },
      { id: 17, from: 0, to: 7, order: 1, stereo: 0 },
      { id: 18, from: 7, to: 8, order: 1, stereo: 0 },
      { id: 19, from: 7, to: 9, order: 2, stereo: 0 },
    ],
  };

  formatFixtures = {
    mol_v2000: wasm.to_mol_v2000(chlorobenzoate),
    mol_v3000: wasm.to_mol_v3000(chlorobenzoate),
    sdf: wasm.to_sdf(chlorobenzoate),
    cml: wasm.to_cml(chlorobenzoate),
    // No to_cdxml writer exists in this bridge (CDXML is read-only, per
    // internal_docs/ROADMAP.md) — hand-crafted using chematic-mol's own
    // documented CDXML atom/bond syntax (Element by atomic number: 6=C,
    // 8=O, 17=Cl; Charge as a plain integer attribute).
    cdxml: `<?xml version="1.0" encoding="UTF-8"?>
<CDXML>
<fragment>
<n id="1" p="0 0" Element="6"/>
<n id="2" p="40 0" Element="6"/>
<n id="3" p="60 -35" Element="6"/>
<n id="4" p="40 -70" Element="6"/>
<n id="5" p="0 -70" Element="6"/>
<n id="6" p="-20 -35" Element="6"/>
<n id="7" p="60 -105" Element="17"/>
<n id="8" p="-20 35" Element="6"/>
<n id="9" p="-55 35" Element="8" Charge="-1"/>
<n id="10" p="0 65" Element="8"/>
<b B="1" E="2" Order="2"/>
<b B="2" E="3" Order="1"/>
<b B="3" E="4" Order="2"/>
<b B="4" E="5" Order="1"/>
<b B="5" E="6" Order="2"/>
<b B="6" E="1" Order="1"/>
<b B="4" E="7" Order="1"/>
<b B="1" E="8" Order="1"/>
<b B="8" E="9" Order="1"/>
<b B="8" E="10" Order="2"/>
</fragment>
</CDXML>`,
  };
});

// ─────────────────────────────────────────────────────────────────────────
// Every major WASM API, called on real parse_any() output (item 5 / item 10)
// ─────────────────────────────────────────────────────────────────────────

describe('every major WASM API accepts real parse_any() output', () => {
  // Ester functional group so run_reactants has something to match, plus
  // enough structure (ring + heteroatom) to meaningfully exercise
  // formula/fingerprint/3D/MCS rather than trivially.
  const smiles = 'COC(=O)c1ccccc1';
  let mol: unknown;

  beforeAll(() => {
    mol = wasm.parse_any(smiles);
  });

  it('parse_any itself succeeds and produces real element symbols', () => {
    const m = mol as { atoms: Array<{ element: string }> };
    expect(m.atoms.length).toBeGreaterThan(0);
    for (const atom of m.atoms) {
      // Never a depiction label ("", "CH3", "OH", ...) and never an
      // R-group token — always a real periodic-table symbol.
      expect(atom.element).toMatch(/^[A-Z][a-z]?$/);
    }
  });

  it.each([
    ['to_smiles', () => wasm.to_smiles(mol)],
    ['to_canonical_smiles', () => wasm.to_canonical_smiles(mol)],
    ['to_mol_v2000', () => wasm.to_mol_v2000(mol)],
    ['to_mol_v3000', () => wasm.to_mol_v3000(mol)],
    ['to_sdf', () => wasm.to_sdf(mol)],
    ['to_cml', () => wasm.to_cml(mol)],
    ['clean_layout', () => wasm.clean_layout(mol)],
    ['get_properties', () => wasm.get_properties(mol)],
    ['get_extended_properties', () => wasm.get_extended_properties(mol)],
    ['get_fingerprint', () => wasm.get_fingerprint(mol)],
    ['validate_molecule', () => wasm.validate_molecule(mol)],
    ['identify_functional_groups_wasm', () => wasm.identify_functional_groups_wasm(mol)],
    ['generate_3d_coords', () => wasm.generate_3d_coords(mol)],
    ['find_mcs (against itself)', () => wasm.find_mcs(mol, mol)],
    ['run_reactants', () => wasm.run_reactants(mol, '[C:1](=[O])O[CH3]>>[C:1](=[O])O')],
  ])('%s succeeds on parse_any() output', (_name, fn) => {
    expect(() => fn()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Item 9's specific required regression tests
// ─────────────────────────────────────────────────────────────────────────

describe('required regressions (item 9)', () => {
  it('parse_any("CCO") atoms are exactly C, C, O — not depiction labels', () => {
    const mol = wasm.parse_any('CCO');
    expect(mol.atoms.map((a: { element: string }) => a.element)).toEqual(['C', 'C', 'O']);
  });

  it("an interior (skeletal) carbon's element is never an empty string", () => {
    // Benzene: every atom is an interior aromatic carbon with no label.
    const mol = wasm.parse_any('c1ccccc1');
    for (const atom of mol.atoms as Array<{ element: string }>) {
      expect(atom.element).not.toBe('');
      expect(atom.element).toBe('C');
    }
    // The depiction label IS legitimately empty for these atoms — that's
    // what display_label is for, distinct from element.
    for (const atom of mol.atoms as Array<{ display_label?: string }>) {
      expect(atom.display_label).toBe('');
    }
  });

  it('parse_any("CCO") -> get_properties succeeds', () => {
    const mol = wasm.parse_any('CCO');
    expect(() => wasm.get_properties(mol)).not.toThrow();
  });

  it('parse_any("CCO") -> get_fingerprint succeeds', () => {
    const mol = wasm.parse_any('CCO');
    const fp = wasm.get_fingerprint(mol);
    expect(fp).toHaveLength(512);
  });

  it('parse_any("c1ccccc1") -> to_canonical_smiles succeeds', () => {
    const mol = wasm.parse_any('c1ccccc1');
    expect(wasm.to_canonical_smiles(mol)).toBe('c1ccccc1');
  });

  it('parse_any("O") -> generate_3d_coords succeeds', () => {
    const mol = wasm.parse_any('O');
    const coords = wasm.generate_3d_coords(mol);
    expect(coords.atoms).toHaveLength(1);
    expect(Number.isFinite(coords.atoms[0].x)).toBe(true);
  });

  it('molecules parsed from MOL V2000/V3000, SDF, CML, and CDXML can be passed back into WASM computation', () => {
    for (const [, text] of Object.entries(formatFixtures)) {
      const mol = wasm.parse_any(text);
      expect(() => wasm.get_properties(mol)).not.toThrow();
      const atoms = mol.atoms as Array<{ element: string }>;
      expect(atoms.length).toBeGreaterThan(0);
      for (const atom of atoms) {
        expect(atom.element).toMatch(/^[A-Z][a-z]?$/);
      }
      expect(atoms.map((a) => a.element)).toContain('Cl');
      expect(atoms.map((a) => a.element)).toContain('O');
    }
  });

  it('display_label (cosmetic) is never used as chemistry input — dto_to_chem ignores it entirely', () => {
    const mol = wasm.parse_any('c1ccccc1');
    const withGarbageLabels = {
      ...mol,
      atoms: mol.atoms.map((a: Record<string, unknown>) => ({ ...a, display_label: 'not a real element' })),
    };
    // Must still succeed — element (not display_label) is what's consumed.
    expect(() => wasm.get_properties(withGarbageLabels)).not.toThrow();
  });

  it('validate_molecule reports a real, well-formed result — not a Map a caller\'s Lipinski-style check could silently misread as "compliant"', () => {
    const mol = wasm.parse_any('CCO');
    const result = wasm.validate_molecule(mol);
    expect(result instanceof Map).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('properties must not report fake zero values for a real molecule (caffeine has real HBA/HBD/MW/ring count)', () => {
    const mol = wasm.parse_any('CN1C=NC2=C1C(=O)N(C(=O)N2C)C'); // caffeine
    const props = wasm.get_properties(mol);
    expect(props.molecular_weight).toBeGreaterThan(100);
    expect(props.hba).toBeGreaterThan(0);
    expect(props.formula).toBe('C8H10N4O2');
    // Caffeine's fused imidazole + pyrimidinedione rings — was previously
    // undefined on every molecule (no such field on the DTO at all), which
    // rendered as a permanent "N/A" in PropertyPredictionPanel.
    expect(props.ring_count).toBe(2);
  });

  it('ring_count is 0 for an acyclic molecule, not undefined', () => {
    const mol = wasm.parse_any('CCO');
    const props = wasm.get_properties(mol);
    expect(props.ring_count).toBe(0);
  });

  it('a fresh parse_any() result for one molecule is structurally independent of a previous one (no leaked state)', () => {
    const first = wasm.parse_any('c1ccccc1');
    const second = wasm.parse_any('CCO');
    expect(second.atoms).toHaveLength(3);
    expect(second.atoms.map((a: { element: string }) => a.element)).toEqual(['C', 'C', 'O']);
    // Re-checking the first result is still what it was — no shared mutable state.
    expect(first.atoms).toHaveLength(6);
  });

  it('a wildcard/R-group atom round-trips via the explicit wildcard flag, not by guessing from the element string', () => {
    const mol = wasm.parse_any('[*]CC');
    const wildcardAtom = mol.atoms.find((a: { wildcard?: boolean }) => a.wildcard);
    expect(wildcardAtom).toBeDefined();
    expect(() => wasm.to_canonical_smiles(mol)).not.toThrow();
    expect(wasm.to_canonical_smiles(mol)).toContain('*');
  });

  it('an aromatic heteroatom bearing an explicit H (pyrrole-type N) round-trips with the correct formula, not a lost hydrogen', () => {
    // A second, distinct bug found while fixing the element-symbol contract:
    // dto_to_chem re-derived aromaticity via a perception pass that only
    // works on a Kekulized structure, not on bonds already BondOrder::Aromatic
    // — so it silently left every atom's `aromatic` flag false, which broke
    // implicit-H inference specifically for ring nitrogens whose H-bearing
    // status can't be inferred from topology alone (pyrrole- vs.
    // pyridine-type N). Fixed by setting `aromatic` from bond membership at
    // atom-construction time and carrying an explicit hydrogen_count on the
    // DTO instead of re-deriving it.
    const mol = wasm.parse_any('c1cc[nH]c1');
    const props = wasm.get_properties(mol);
    expect(props.formula).toBe('C4H5N');
    expect(wasm.to_canonical_smiles(mol)).toBe('c1[nH]ccc1');
  });

  it('an isotope-labeled atom (e.g. 13C) round-trips through canonical SMILES', () => {
    const mol = wasm.parse_any('[13CH4]');
    expect(mol.atoms[0].isotope).toBe(13);
    const smiles = wasm.to_canonical_smiles(mol);
    expect(smiles).toContain('13C');
    const reparsed = wasm.parse_any(smiles);
    expect(reparsed.atoms[0].isotope).toBe(13);
  });
});
