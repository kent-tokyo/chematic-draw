import { exportRxn, exportRxnViaDocumentAdapter, importRxn, importRxnViaDocumentAdapter, rxnV2000Losses, MAX_RXN_MOLECULES, MAX_RXN_TEXT_LENGTH } from '../renderer/lib/rxnExport';
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

  it('routes the loss-free single-step subset through the upstream document adapter', () => {
    let upstream: any;
    const rxn = exportRxnViaDocumentAdapter({ reactants: [molecule('C')], products: [molecule('O')] }, (source) => source.atoms[0].element, (document) => {
      upstream = document;
      return 'encoded-rxn';
    });
    expect(rxn).toBe('encoded-rxn');
    expect(upstream.steps[0].components.map((component: any) => component.role)).toEqual(['reactant', 'product']);
    expect(importRxnViaDocumentAdapter('encoded-rxn', () => upstream, (smiles) => molecule(smiles))).toEqual({
      reactants: [molecule('C')],
      products: [molecule('O')],
    });
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

  it('reports v2 semantics that cannot be represented by RXN V2000', () => {
    expect(rxnV2000Losses({ reactants: [molecule('C')], products: [molecule('O')], agents: [molecule('N')], reactantCoefficients: [2], productCoefficients: [1] })).toEqual([
      expect.objectContaining({ code: 'agents' }),
      expect.objectContaining({ code: 'coefficients' }),
    ]);
    expect(rxnV2000Losses({ reactants: [molecule('C')], products: [molecule('O')], reactantCoefficients: [1], productCoefficients: [1] })).toEqual([]);
  });

  it('reports fractional coefficients as a semantic loss', () => {
    expect(rxnV2000Losses({
      reactants: [molecule('C')], products: [molecule('O')],
      reactantCoefficients: [0.5], productCoefficients: [1.25],
    })).toEqual([expect.objectContaining({ code: 'coefficients' })]);
  });
});
