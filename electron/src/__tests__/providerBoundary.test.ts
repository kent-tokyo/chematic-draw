import { searchDatabase } from '../renderer/lib/advancedFeatures';

jest.mock('../renderer/lib/analysisWorkerClient', () => ({
  runAnalysisInWorker: jest.fn().mockResolvedValue({ inchi: 'InChI=1S/CH4/h1H4', inchikey: 'VNWKTOKETHGBQD-UHFFFAOYSA-N' }),
}));

test('rejects direct ChemSpider lookup so credentials remain in the configured Electron host provider', async () => {
  await expect(searchDatabase({ atoms: [], bonds: [] }, 'chemspider')).rejects.toThrow('configured Electron host provider');
});

test('returns no PubChem result only for a missing exact structure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' } as Response);
  try {
    await expect(searchDatabase({ atoms: [], bonds: [] }, 'pubchem')).resolves.toEqual([]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('surfaces PubChem service failures instead of reporting an empty result', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' } as Response);
  try {
    await expect(searchDatabase({ atoms: [], bonds: [] }, 'pubchem')).rejects.toThrow('PubChem API error: Service Unavailable');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('retains PubChem canonical SMILES for an explicit structure import action', async () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ PC_Compounds: [{ id: { id: { cid: 2244 } } }] }) } as Response)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ PropertyTable: { Properties: [{ CID: 2244, IUPACName: 'ethanol', CanonicalSMILES: 'CCO', MolecularFormula: 'C2H6O', MolecularWeight: 46.07 }] } }) } as Response);
  globalThis.fetch = fetchMock;
  try {
    await expect(searchDatabase({ atoms: [], bonds: [] }, 'pubchem')).resolves.toEqual([expect.objectContaining({ molId: '2244', name: 'ethanol', smiles: 'CCO', properties: { 'Molecular formula': 'C2H6O', 'Molecular weight': 46.07 } })]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
