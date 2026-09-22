import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import type { MoleculeDto } from '../../store/types';
import { DATABASE_PROVIDERS, type DatabaseSource, searchDatabase, type DatabaseResult } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';
import { runAnalysisInWorker } from '../../lib/analysisWorkerClient';
import { getElectronApi, type ElectronChemSpiderStatus } from '../../electronApi';

const DEFAULT_CHEMSPIDER_STATUS: ElectronChemSpiderStatus = {
  available: false,
  reason: DATABASE_PROVIDERS.chemspider.unavailableReason,
};

function providerReason(provider: { available: boolean; reason?: string; unavailableReason?: string }): string {
  return provider.reason ?? provider.unavailableReason ?? 'ChemSpider is unavailable.';
}

export function DatabaseSearchPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setStatus = useUIStore((s) => s.setStatus);

  const [results, setResults] = useState<DatabaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<DatabaseSource>('pubchem');
  const [chemSpiderStatus, setChemSpiderStatus] = useState<ElectronChemSpiderStatus>(DEFAULT_CHEMSPIDER_STATUS);
  const [chemSpiderQuery, setChemSpiderQuery] = useState('');
  const [comparisonSmiles, setComparisonSmiles] = useState('');
  const [mcsResult, setMcsResult] = useState<wasmBridge.McsResultDto | null>(null);
  const [similarityResult, setSimilarityResult] = useState<number | null>(null);
  const [mcsError, setMcsError] = useState('');
  const searchRunRef = useRef(0);
  const searchControllerRef = useRef<AbortController | null>(null);
  const mcsControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    searchRunRef.current += 1;
    searchControllerRef.current?.abort();
    mcsControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    const api = getElectronApi();
    if (!api) return;
    let active = true;
    void api.getChemSpiderStatus().then((status) => {
      if (active && status && typeof status.available === 'boolean') setChemSpiderStatus(status);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const handleSearch = async () => {
    const provider = source === 'chemspider' ? chemSpiderStatus : DATABASE_PROVIDERS.pubchem;
    if (!provider.available) {
      setStatus(language === 'ja'
        ? `ChemSpiderは未設定です: ${providerReason(provider)}`
        : `ChemSpider is unavailable: ${providerReason(provider)}`);
      return;
    }
    const searchRun = ++searchRunRef.current;
    const moleculeAtStart = molecule;
    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;
    try {
      setLoading(true);
      setStatus(language === 'ja' ? `${source}で完全一致構造を検索中…` : `Searching ${source} for an exact structure match...`);

      const searchResults = source === 'chemspider'
        ? await (async () => {
          const api = getElectronApi();
          if (!api) throw new Error(DEFAULT_CHEMSPIDER_STATUS.reason);
          const result = await api.searchChemSpiderByName(chemSpiderQuery.trim());
          if (!result.success) throw new Error(result.error ?? 'ChemSpider search failed.');
          return result.results ?? [];
        })()
        : await searchDatabase(molecule, source, controller.signal);
      if (!mountedRef.current || searchRun !== searchRunRef.current) return;
      // A search result is only valid for the molecule and source that
      // produced it. Discard late responses after either changes.
      if (moleculeAtStart !== useMoleculeStore.getState().molecule) return;
      setResults(searchResults);

      setStatus(language === 'ja' ? `完全一致する化合物が${searchResults.length}件見つかりました` : `Found ${searchResults.length} exact compound match(es)`);
    } catch (err) {
      if (!mountedRef.current || searchRun !== searchRunRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setStatus(language === 'ja' ? `データベース検索に失敗しました: ${(err as Error).message}` : `Database search failed: ${(err as Error).message}`);
      console.error('Search error:', err);
    } finally {
      if (mountedRef.current && searchRun === searchRunRef.current) setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.9) return '#4caf50';
    if (similarity >= 0.7) return '#8bc34a';
    if (similarity >= 0.5) return '#ff9800';
    return '#f44336';
  };

  const handleImportResult = async (result: DatabaseResult) => {
    if (!result.smiles) return;
    try {
      const imported = await runAnalysisInWorker('parse', undefined, undefined, undefined, result.smiles) as MoleculeDto;
      pushUndo();
      setMolecule(imported);
      setStatus(language === 'ja' ? `${result.name}の構造を読み込みました` : `Loaded the structure for ${result.name}`);
    } catch (error) {
      setStatus(language === 'ja' ? `構造の読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}` : `Could not load the provider structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleMcsSearch = async () => {
    const controller = new AbortController();
    mcsControllerRef.current?.abort();
    mcsControllerRef.current = controller;
    setMcsResult(null);
    setSimilarityResult(null);
    setMcsError('');
    if (!comparisonSmiles.trim()) return;

    try {
      const comparisonMolecule = await runAnalysisInWorker('parse', undefined, controller.signal, undefined, comparisonSmiles.trim()) as MoleculeDto;
      const [result, similarity] = await Promise.all([
        runAnalysisInWorker('mcs', molecule, controller.signal, comparisonMolecule) as Promise<wasmBridge.McsResultDto>,
        runAnalysisInWorker('similarity', molecule, controller.signal, comparisonMolecule) as Promise<number>,
      ]);
      if (!controller.signal.aborted && molecule === useMoleculeStore.getState().molecule) {
        setMcsResult(result);
        setSimilarityResult(similarity);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setMcsError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '10px', color: labelColor }}>{language === 'ja' ? 'データベース' : 'Database source'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(Object.keys(DATABASE_PROVIDERS) as DatabaseSource[]).map((src) => {
            const provider = src === 'chemspider' ? chemSpiderStatus : DATABASE_PROVIDERS.pubchem;
            const unavailable = !provider.available;
            return (
            <button
              key={src}
              type="button"
              disabled={unavailable}
              title={unavailable ? providerReason(provider) : undefined}
              aria-label={src === 'pubchem'
                ? 'PubChem'
                : unavailable
                  ? (language === 'ja' ? 'ChemSpider（未設定）' : 'ChemSpider (unavailable)')
                  : 'ChemSpider'}
              onClick={() => {
                if (unavailable) return;
                searchRunRef.current += 1;
                searchControllerRef.current?.abort();
                setLoading(false);
                setSource(src);
              }}
              style={{
                padding: '6px',
                backgroundColor: source === src && !unavailable ? accentColor : inputBg,
                color: source === src && !unavailable ? 'white' : textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '3px',
                cursor: unavailable ? 'not-allowed' : 'pointer',
                fontSize: '10px',
                fontWeight: source === src && !unavailable ? 'bold' : 'normal',
                opacity: unavailable ? 0.55 : 1,
              }}
            >
              {src === 'pubchem' ? 'PubChem' : unavailable
                ? (language === 'ja' ? 'ChemSpider（未設定）' : 'ChemSpider (unavailable)')
                : 'ChemSpider'}
            </button>
            );
          })}
        </div>
        {source === 'chemspider' && chemSpiderStatus.available && (
          <input
            aria-label={language === 'ja' ? 'ChemSpider化合物名' : 'ChemSpider compound name'}
            type="text"
            value={chemSpiderQuery}
            maxLength={256}
            onChange={(event) => setChemSpiderQuery(event.target.value)}
            placeholder={language === 'ja' ? '化合物名で検索' : 'Search by compound name'}
            style={{ padding: '6px', backgroundColor: inputBg, color: textColor, border: `1px solid ${borderColor}`, borderRadius: '3px', fontSize: '10px' }}
          />
        )}
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || (source === 'chemspider' ? !chemSpiderQuery.trim() : molecule.atoms.length === 0)}
        style={{
          padding: '8px',
          backgroundColor: accentColor,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: loading || (source === 'chemspider' ? !chemSpiderQuery.trim() : molecule.atoms.length === 0) ? 0.5 : 1,
        }}
      >
        {loading ? 'Searching...' : 'Search Compounds'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ padding: '8px', backgroundColor: inputBg, borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>
              {results.length} Result{results.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {results.map((result, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px',
                  borderBottom: idx < results.length - 1 ? `1px solid ${borderColor}` : 'none',
                }}
              >
                {/* Result Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>{result.name}</div>
                    <div style={{ fontSize: '9px', color: labelColor }}>{result.source.toUpperCase()}</div>
                  </div>
                  <div
                    style={{
                      padding: '3px 6px',
                      backgroundColor: getSimilarityColor(result.similarity),
                      color: 'white',
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      minWidth: '40px',
                    }}
                  >
                    {(result.similarity * 100).toFixed(0)}%
                  </div>
                </div>

                {/* Properties */}
                {Object.keys(result.properties).length > 0 && (
                  <div style={{ fontSize: '9px', color: labelColor, marginTop: '4px' }}>
                    {Object.entries(result.properties)
                      .slice(0, 3)
                      .map(([key, value], pidx) => (
                        <div key={pidx}>
                          {key}: {String(value).slice(0, 30)}
                        </div>
                      ))}
                    {Object.keys(result.properties).length > 3 && (
                      <div>+{Object.keys(result.properties).length - 3} more properties</div>
                    )}
                  </div>
                )}

                {/* Link */}
                <div style={{ marginTop: '4px' }}>
                  {result.smiles && <button type="button" onClick={() => void handleImportResult(result)} style={{ marginRight: 8, padding: '3px 6px', border: `1px solid ${borderColor}`, borderRadius: 3, backgroundColor: 'transparent', color: accentColor, cursor: 'pointer', fontSize: 9 }}>
                    {language === 'ja' ? '構造を読み込む' : 'Load structure'}
                  </button>}
                  <a
                    href={`https://${result.source === 'pubchem' ? 'pubchem.ncbi.nlm.nih.gov/compound' : 'www.chemspider.com/Chemical-Structure'}/${result.molId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '9px',
                      color: accentColor,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    View on {result.source === 'pubchem' ? 'PubChem' : 'ChemSpider'} →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <div style={{ fontSize: '11px', color: labelColor, textAlign: 'center', padding: '16px' }}>
          No searches performed yet. Click "Search Compounds" to find similar structures.
        </div>
      )}

      {/* Info */}
      <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
          {language === 'ja' ? 'PubChemは現在の構造の完全一致を検索します。ChemSpiderは、ElectronホストでAPIキーと帰属確認を設定した場合のみ、化合物名検索を行います。外部照会は利用者の操作時にのみ実行されます。' : 'PubChem searches the current structure for an exact match. ChemSpider performs a name lookup only when the Electron host has configured an API key and attribution acknowledgement. External lookups run only after a user action.'}
      </div>

      {/* Offline MCS comparison */}
      <div
        data-testid="mcs-search"
        style={{ borderTop: `1px solid ${borderColor}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>{language === 'ja' ? '最大共通部分構造' : 'Maximum common substructure'}</div>
        <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
          Compare the current molecule with another SMILES locally. No network request is made.
        </div>
        <input
          aria-label="MCS comparison SMILES"
          type="text"
          value={comparisonSmiles}
          onChange={(e) => setComparisonSmiles(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleMcsSearch()}
          placeholder="e.g. Cc1ccccc1"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '7px',
            border: `1px solid ${borderColor}`,
            borderRadius: '3px',
            backgroundColor: inputBg,
            color: textColor,
            fontSize: '10px',
          }}
        />
        <button
          data-testid="mcs-search-button"
          onClick={handleMcsSearch}
          disabled={molecule.atoms.length === 0 || !comparisonSmiles.trim()}
          style={{
            padding: '7px',
            backgroundColor: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: molecule.atoms.length === 0 || !comparisonSmiles.trim() ? 'default' : 'pointer',
            fontSize: '10px',
            fontWeight: 'bold',
            opacity: molecule.atoms.length === 0 || !comparisonSmiles.trim() ? 0.5 : 1,
          }}
        >
          Find MCS
        </button>
        {mcsError && (
          <div role="alert" style={{ fontSize: '10px', color: '#f26d6d' }}>
            MCS search failed: {mcsError}
          </div>
        )}
        {mcsResult && (
          <div
            data-testid="mcs-result"
            style={{ padding: '8px', backgroundColor: inputBg, border: `1px solid ${borderColor}`, borderRadius: '4px', color: textColor, fontSize: '10px', lineHeight: '1.6' }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>{language === 'ja' ? 'MCS結果' : 'MCS result'}</div>
            <div>Similarity: {(mcsResult.similarity * 100).toFixed(1)}%</div>
            {similarityResult !== null && <div>Tanimoto (ECFP4): {(similarityResult * 100).toFixed(1)}%</div>}
            <div>Common atoms: {mcsResult.common_atoms.length}</div>
            <div>Common bonds: {mcsResult.common_bonds.length}</div>
            <div style={{ color: labelColor }}>Search budget: {mcsResult.search_budget_ms} ms</div>
          </div>
        )}
      </div>
    </div>
  );
}
