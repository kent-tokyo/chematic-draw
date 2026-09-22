import { createChemSpiderProvider } from '../lib/chemspiderProvider.cjs';

describe('ChemSpider main-process provider boundary', () => {
  it('stays unavailable unless a host key and attribution acknowledgement are both present', () => {
    expect(createChemSpiderProvider({ apiKey: 'key', attributionAccepted: false }).status()).toMatchObject({ available: false });
    expect(createChemSpiderProvider({ apiKey: '', attributionAccepted: true }).status()).toMatchObject({ available: false });
  });

  it('uses the documented filter workflow, keeps the key out of results, and caches a name lookup', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ queryId: 'query-123' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [2157] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ commonName: 'Aspirin', formula: 'C9H8O4', nominalMass: 180, smiles: 'CC(=O)Oc1ccccc1C(=O)O' }) });
    const provider = createChemSpiderProvider({ apiKey: 'secret-never-exposed', attributionAccepted: true, fetchImpl, now: () => 100 });

    const results = await provider.searchByName('aspirin');
    expect(results).toEqual([expect.objectContaining({ molId: '2157', name: 'Aspirin', source: 'chemspider', smiles: 'CC(=O)Oc1ccccc1C(=O)O' })]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.rsc.org/compounds/v1/filter/name');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: expect.objectContaining({ apikey: 'secret-never-exposed', 'Content-Type': 'application/json' }) });
    expect(fetchImpl.mock.calls[0][1].body).toBe(JSON.stringify({ name: 'aspirin', orderBy: 'default', orderDirection: 'default' }));
    expect(fetchImpl.mock.calls[2][0]).toContain('/records/2157/details?fields=');
    expect(JSON.stringify(results)).not.toContain('secret-never-exposed');

    await expect(provider.searchByName('Aspirin')).resolves.toEqual(results);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('surfaces a rate-limit response without treating it as an empty search', async () => {
    const provider = createChemSpiderProvider({
      apiKey: 'key', attributionAccepted: true,
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 429 }),
    });
    await expect(provider.searchByName('aspirin')).rejects.toThrow('rate limit');
  });
});
