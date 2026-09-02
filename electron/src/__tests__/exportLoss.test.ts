import { exportLossMessage, exportLosses, formatForFilePath } from '../renderer/lib/exportLoss';
import { MoleculeDto } from '../renderer/store/types';

const molecule: MoleculeDto = {
  atoms: [
    { id: 0, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0, wildcard: true },
    { id: 1, element: 'C', x: 1, y: 0, charge: 0, atom_map: 0, isotope: 13 },
  ],
  bonds: [{ id: 0, from: 0, to: 1, order: 1, stereo: 0 }],
};

describe('export loss analysis', () => {
  it('maps file extensions to the format actually written', () => {
    expect(formatForFilePath('/tmp/sample.smi')).toBe('smiles');
    expect(formatForFilePath('/tmp/sample.CML')).toBe('cml');
    expect(formatForFilePath('/tmp/sample.unknown')).toBe('mol-v2000');
  });

  it('reports the known wildcard and isotope losses for MOL V2000', () => {
    expect(exportLosses(molecule, 'mol-v2000')).toEqual([
      expect.objectContaining({ code: 'wildcard' }),
      expect.objectContaining({ code: 'isotope' }),
    ]);
  });

  it('applies the same loss warnings to RXN V2000 molecule blocks', () => {
    expect(exportLosses(molecule, 'rxn-v2000')).toEqual([
      { code: 'wildcard', message: '1 wildcard atom will be written as ordinary carbon by this format.' },
      { code: 'isotope', message: '1 isotope label will be dropped by this format.' },
    ]);
  });

  it('does not report losses for SMILES or CML for this corpus', () => {
    expect(exportLosses(molecule, 'smiles')).toEqual([]);
    expect(exportLosses(molecule, 'cml')).toEqual([
      expect.objectContaining({ code: 'wildcard' }),
    ]);
  });

  it('warns before writing wildcard atoms to CDXML', () => {
    expect(exportLosses(molecule, 'cdxml')).toEqual([
      expect.objectContaining({ code: 'wildcard' }),
    ]);
  });

  it('builds an actionable confirmation message', () => {
    const losses = exportLosses(molecule, 'mol-v2000');
    expect(exportLossMessage('sample.mol', losses)).toContain('Continue anyway?');
    expect(exportLossMessage('sample.mol', losses)).toContain('wildcard atom');
  });
});
