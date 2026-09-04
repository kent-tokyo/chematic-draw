import * as wasmBridge from '../renderer/wasm/wasmBridge';
import {
  clearAnalysisCache,
  getExtendedPropertiesCached,
  getIdentifiersCached,
  getPropertiesCached,
} from '../renderer/lib/analysisCache';

const molecule = {
  atoms: [{ id: 1, element: 'C', x: 0, y: 0, charge: 0, atom_map: 0 }],
  bonds: [],
};

describe('shared WASM analysis cache', () => {
  afterEach(() => {
    clearAnalysisCache();
    jest.restoreAllMocks();
  });

  it('shares properties across coordinate and selection-only copies', () => {
    const result = {
      formula: 'C', atom_count: 1, bond_count: 0, molecular_weight: 12,
      logp: 0, tpsa: 0, hba: 0, hbd: 0, rotatable_bonds: 0,
      lipinski_pass: true, valence_errors: [], ring_count: 0,
    };
    const spy = jest.spyOn(wasmBridge, 'getProperties').mockReturnValue(result);

    expect(getPropertiesCached(molecule)).toBe(result);
    expect(getPropertiesCached({
      ...molecule,
      atoms: [{ ...molecule.atoms[0], x: 20, selected: true }],
    })).toBe(result);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('invalidates on chemistry changes and does not cache failures', () => {
    const spy = jest.spyOn(wasmBridge, 'getProperties')
      .mockImplementationOnce(() => { throw new Error('temporary WASM failure'); })
      .mockReturnValue({
        formula: 'N', atom_count: 1, bond_count: 0, molecular_weight: 14,
        logp: 0, tpsa: 0, hba: 1, hbd: 1, rotatable_bonds: 0,
        lipinski_pass: true, valence_errors: [], ring_count: 0,
      });

    expect(() => getPropertiesCached(molecule)).toThrow('temporary WASM failure');
    const nitrogen = { ...molecule, atoms: [{ ...molecule.atoms[0], element: 'N' }] };
    expect(getPropertiesCached(nitrogen).formula).toBe('N');
    expect(getPropertiesCached({ ...nitrogen, atoms: [{ ...nitrogen.atoms[0], x: 4 }] })).toBe(getPropertiesCached(nitrogen));
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('shares extended properties and identifiers independently', () => {
    const extended = {
      sa_score: 1, esol_solubility: 0, fsp3: 0, pains_violations: false,
      num_stereocenters: 0, num_unspecified_stereocenters: 0,
    };
    const extendedSpy = jest.spyOn(wasmBridge, 'getExtendedProperties').mockReturnValue(extended);
    const inchiSpy = jest.spyOn(wasmBridge, 'molToInchi').mockReturnValue('InChI=1S/CH4/h1H4');
    const keySpy = jest.spyOn(wasmBridge, 'inchiToInchikey').mockReturnValue('VNWKTOKETHGBQD-UHFFFAOYSA-N');

    expect(getExtendedPropertiesCached(molecule)).toBe(extended);
    expect(getExtendedPropertiesCached(molecule)).toBe(extended);
    expect(getIdentifiersCached(molecule)).toEqual({
      inchi: 'InChI=1S/CH4/h1H4', inchikey: 'VNWKTOKETHGBQD-UHFFFAOYSA-N',
    });
    expect(getIdentifiersCached({ ...molecule, atoms: [{ ...molecule.atoms[0], x: 3 }] })).toEqual({
      inchi: 'InChI=1S/CH4/h1H4', inchikey: 'VNWKTOKETHGBQD-UHFFFAOYSA-N',
    });
    expect(extendedSpy).toHaveBeenCalledTimes(1);
    expect(inchiSpy).toHaveBeenCalledTimes(1);
    expect(keySpy).toHaveBeenCalledTimes(1);
  });
});
