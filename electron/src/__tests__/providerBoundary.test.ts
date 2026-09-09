import { searchDatabase } from '../renderer/lib/advancedFeatures';

jest.mock('../renderer/lib/analysisWorkerClient', () => ({
  runAnalysisInWorker: jest.fn().mockResolvedValue({ inchi: 'InChI=1S/CH4/h1H4', inchikey: 'VNWKTOKETHGBQD-UHFFFAOYSA-N' }),
}));

test('rejects the unavailable ChemSpider provider without making a network request', async () => {
  await expect(searchDatabase({ atoms: [], bonds: [] }, 'chemspider')).rejects.toThrow('ChemSpider search not yet implemented');
});
