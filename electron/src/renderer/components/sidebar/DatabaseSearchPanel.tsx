import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { searchDatabase, DatabaseResult } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';

export function DatabaseSearchPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setStatus = useUIStore((s) => s.setStatus);

  const [results, setResults] = useState<DatabaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'pubchem' | 'chemspider'>('pubchem');

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const handleSearch = async () => {
    try {
      setLoading(true);
      setStatus(`Searching ${source} for similar structures...`);

      const searchResults = await searchDatabase(molecule, source);
      setResults(searchResults);

      setStatus(`Found ${searchResults.length} similar compound(s)`);
    } catch (err) {
      setStatus(`Database search failed: ${(err as Error).message}`);
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

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '10px', color: labelColor }}>Database Source</label>
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
    </div>
  );
}
