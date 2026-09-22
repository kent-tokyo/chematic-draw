const DEFAULT_BASE_URL = 'https://api.rsc.org/compounds/v1';
const MAX_QUERY_LENGTH = 256;
const MAX_RESULTS = 10;
const CACHE_TTL_MS = 5 * 60 * 1000;

function errorForResponse(action, response) {
  if (response.status === 401 || response.status === 403) return new Error(`ChemSpider ${action} was not authorized. Check the host API configuration.`);
  if (response.status === 429) return new Error('ChemSpider rate limit reached. Wait before trying again.');
  return new Error(`ChemSpider ${action} failed (${response.status}).`);
}

function boundedText(value, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 1_000) || fallback : fallback;
}

function responseIds(payload) {
  const values = Array.isArray(payload) ? payload : payload?.results;
  if (!Array.isArray(values)) throw new Error('ChemSpider returned an invalid result list.');
  return values
    .filter((value) => (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) || (typeof value === 'string' && /^\d{1,12}$/.test(value)))
    .slice(0, MAX_RESULTS)
    .map(String);
}

function databaseResult(id, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error(`ChemSpider returned an invalid record for ${id}.`);
  const properties = {};
  const formula = boundedText(payload.formula ?? payload.Formula);
  const nominalMass = payload.nominalMass ?? payload.NominalMass;
  if (formula) properties['Molecular formula'] = formula;
  if (typeof nominalMass === 'number' && Number.isFinite(nominalMass)) properties['Nominal mass'] = nominalMass;
  const smiles = boundedText(payload.smiles ?? payload.SMILES);
  return {
    molId: id,
    name: boundedText(payload.commonName ?? payload.CommonName ?? payload.name, `ChemSpider record ${id}`),
    source: 'chemspider',
    similarity: 1,
    ...(smiles ? { smiles } : {}),
    properties,
  };
}

/**
 * An authenticated, main-process-only ChemSpider adapter. The API key is read
 * from the host environment and is intentionally never persisted, returned,
 * logged, or exposed through preload. Opt-in attribution acknowledgement keeps
 * a distributable build from silently enabling a third-party service.
 */
function createChemSpiderProvider({
  apiKey = process.env.CHEMSPIDER_API_KEY,
  attributionAccepted = process.env.CHEMSPIDER_ATTRIBUTION_ACCEPTED === 'true',
  fetchImpl = globalThis.fetch,
  baseUrl = DEFAULT_BASE_URL,
  now = () => Date.now(),
} = {}) {
  const cache = new Map();
  const configured = typeof apiKey === 'string' && apiKey.trim().length > 0 && attributionAccepted;
  const status = () => configured
    ? { available: true }
    : { available: false, reason: 'ChemSpider needs a host API key and explicit attribution acknowledgement.' };

  const request = async (path, options, signal) => {
    if (!configured) throw new Error(status().reason);
    if (typeof fetchImpl !== 'function') throw new Error('ChemSpider is unavailable because this host has no fetch implementation.');
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...options,
      signal,
      headers: { Accept: 'application/json', apikey: apiKey, ...(options.headers ?? {}) },
    });
    if (!response.ok) throw errorForResponse(path, response);
    return response.json();
  };

  const searchByName = async (query, signal) => {
    const name = boundedText(query);
    if (!name || name.length > MAX_QUERY_LENGTH) throw new Error(`ChemSpider name queries must contain 1-${MAX_QUERY_LENGTH} characters.`);
    const cached = cache.get(name.toLowerCase());
    if (cached && now() - cached.createdAt < CACHE_TTL_MS) return cached.results;

    const filter = await request('/filter/name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, orderBy: 'default', orderDirection: 'default' }),
    }, signal);
    const queryId = boundedText(filter?.queryId);
    if (!/^[A-Za-z0-9-]{1,128}$/.test(queryId)) throw new Error('ChemSpider returned an invalid filter identifier.');
    const ids = responseIds(await request(`/filter/${encodeURIComponent(queryId)}/results`, { method: 'GET' }, signal));
    const results = await Promise.all(ids.map(async (id) => databaseResult(id, await request(
      `/records/${encodeURIComponent(id)}/details?fields=nominalMass,CommonName,formula,InChI,InChIkey,smiles`,
      { method: 'GET' },
      signal,
    ))));
    cache.set(name.toLowerCase(), { createdAt: now(), results });
    return results;
  };

  return { status, searchByName };
}

module.exports = { createChemSpiderProvider };
