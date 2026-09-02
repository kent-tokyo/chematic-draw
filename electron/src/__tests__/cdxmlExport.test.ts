/** @jest-environment node */
import { exportCdxml } from '../renderer/lib/cdxmlExport';
import type { MoleculeDto } from '../renderer/store/types';

const molecule: MoleculeDto = {
  atoms: [
    { id: 10, element: 'C', x: 0, y: 12, charge: 0, atom_map: 0 },
    { id: 20, element: 'O', x: 40, y: 12, charge: -1, atom_map: 0, isotope: 18 },
  ],
  bonds: [{ id: 99, from: 10, to: 20, order: 2, stereo: 0 }],
};

describe('CDXML writer', () => {
  it('round-trips the supported corpus through the real CDXML parser', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wasm = require('../renderer/wasm/pkg-node/chem_wasm') as { parse_any: (text: string) => MoleculeDto };
    for (const fixture of [molecule, {
      atoms: [
        { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 },
        { id: 1, element: 'C', x: 40, y: 0, charge: 0, atom_map: 0 },
        { id: 2, element: 'O', x: 80, y: 0, charge: 0, atom_map: 0 },
      ],
      bonds: [
        { id: 0, from: 0, to: 1, order: 1, stereo: 0 },
        { id: 1, from: 1, to: 2, order: 2, stereo: 0 },
      ],
    } satisfies MoleculeDto]) {
      const parsed = wasm.parse_any(exportCdxml(fixture));
      expect(parsed.atoms).toHaveLength(fixture.atoms.length);
      expect(parsed.bonds).toHaveLength(fixture.bonds.length);
      expect(parsed.atoms.map((atom) => atom.element).sort()).toEqual(fixture.atoms.map((atom) => atom.element).sort());
      expect(parsed.bonds.map((bond) => bond.order).sort()).toEqual(fixture.bonds.map((bond) => bond.order).sort());
    }
  });

  it('writes the supported node and bond subset with stable local ids', () => {
    const xml = exportCdxml(molecule);
    expect(xml).toContain('<CDXML>');
    expect(xml).toContain('<fragment id="1" Name="chematic-draw">');
    expect(xml).toContain('<n id="1" p="0 -12" Element="6"/>');
    expect(xml).toContain('<n id="2" p="40 -12" Element="8" Charge="-1" Isotope="18"/>');
    expect(xml).toContain('<b B="1" E="2" Order="2"/>');
  });

  it('rejects elements outside the supported CDXML mapping', () => {
    expect(() => exportCdxml({ ...molecule, atoms: [{ ...molecule.atoms[0], element: 'Xx' }] }))
      .toThrow('CDXML does not support element: Xx');
  });
});
