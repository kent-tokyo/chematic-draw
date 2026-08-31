import { exportRxn, importRxn, MAX_RXN_MOLECULES, MAX_RXN_TEXT_LENGTH } from '../renderer/lib/rxnExport';
import { MoleculeDto } from '../renderer/store/types';

const molecule = (element: string): MoleculeDto => ({
  atoms: [{ id: 0, element, x: 0, y: 0, charge: 0, atom_map: 0 }],
  bonds: [],
});

describe('RXN V2000 exchange', () => {
  it('writes authored reactants/products and reads them back', () => {
    const rxn = exportRxn({ reactants: [molecule('C')], products: [molecule('O')] }, (mol) => `mol-${mol.atoms[0].element}\n`);
    expect(rxn).toContain('$RXN');
    expect(rxn).toContain('  1  1');
    const parsed = importRxn(rxn, (text) => molecule(text.match(/mol-(\w+)/)?.[1] ?? '?'));
    expect(parsed.reactants[0].atoms[0].element).toBe('C');
    expect(parsed.products[0].atoms[0].element).toBe('O');
  });

  it('rejects missing or extra molecule blocks', () => {
    expect(() => importRxn('$RXN\n\nchematic\n\n  1  1\n$MOL\n', () => molecule('C'))).toThrow(/expected 2/);
  });

  it('rejects RXN input above the text budget before parsing', () => {
    expect(() => importRxn('x'.repeat(MAX_RXN_TEXT_LENGTH + 1), () => molecule('C'))).toThrow(/character limit/);
  });

  it('rejects RXN input above the molecule budget before parsing blocks', () => {
    const rxn = `$RXN\n\nchematic\n\n ${MAX_RXN_MOLECULES}  1\n`;
    expect(() => importRxn(rxn, () => molecule('C'))).toThrow(/maximum/);
  });
});
