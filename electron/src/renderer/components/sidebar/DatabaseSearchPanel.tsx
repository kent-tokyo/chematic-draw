import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { searchDatabase, DatabaseResult } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';

export function DatabaseSearchPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setStatus = useUIStore((s) => s.setStatus);

  const [results, setResults] = useState<DatabaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'pubchem' | 'chemspider'>('pubchem');
  const [comparisonSmiles, setComparisonSmiles] = useState('');
  const [mcsResult, setMcsResult] = useState<wasmBridge.McsResultDto | null>(null);
  const [mcsError, setMcsError] = useState('');

  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const handleSearch = async () => {
    try {
      setLoading(true);
      setStatus(language === 'ja' ? `${source}で類似構造を検索中…` : `Searching ${source} for similar structures...`);

      const searchResults = await searchDatabase(molecule, source);
      setResults(searchResults);

      setStatus(language === 'ja' ? `類似化合物が${searchResults.length}件見つかりました` : `Found ${searchResults.length} similar compound(s)`);
    } catch (err) {
      setStatus(language === 'ja' ? `データベース検索に失敗しました: ${(err as Error).message}` : `Database search failed: ${(err as Error).message}`);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.9) return '#4caf50';
    if (similarity >= 0.7) return '#8bc34a';
    if (similarity >= 0.5) return '#ff9800';
    return '#f44336';
  };

  const handleMcsSearch = () => {
    setMcsResult(null);
    setMcsError('');
    if (!comparisonSmiles.trim()) return;

    try {
      const comparisonMolecule = wasmBridge.parseMolecule(comparisonSmiles.trim());
      const result = wasmBridge.findMcs(molecule, comparisonMolecule);
      setMcsResult(result);
    } catch (err) {
      setMcsError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '10px', color: labelColor }}>{language === 'ja' ? 'データベース' : 'Database source'}</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(['pubchem', 'chemspider'] as const).map((src) => (
            <button
              key={src}
              onClick={() => setSource(src)}
              style={{
                padding: '6px',
                backgroundColor: source === src ? accentColor : inputBg,
                color: source === src ? 'white' : textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: source === src ? 'bold' : 'normal',
              }}
            >
              {src === 'pubchem' ? 'PubChem' : 'ChemSpider'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || molecule.atoms.length === 0}
        style={{
          padding: '8px',
          backgroundColor: accentColor,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: loading || molecule.atoms.length === 0 ? 0.5 : 1,
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
        Search PubChem or ChemSpider for compounds with similar structures. Results show similarity score (0-100%).
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
            <div>Common atoms: {mcsResult.common_atoms.length}</div>
            <div>Common bonds: {mcsResult.common_bonds.length}</div>
            <div style={{ color: labelColor }}>Search budget: {mcsResult.search_budget_ms} ms</div>
          </div>
        )}
      </div>
    </div>
  );
}
