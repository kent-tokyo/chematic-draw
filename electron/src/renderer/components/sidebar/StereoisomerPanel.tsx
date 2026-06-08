import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { enumerateStereoisomers, StereoisomerResult } from '../../lib/advancedFeatures';

export function StereoisomerPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const setStatus = useUIStore((s) => s.setStatus);

  const [results, setResults] = useState<StereoisomerResult | null>(null);
  const [loading, setLoading] = useState(false);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const handleEnumerate = async () => {
    try {
      setLoading(true);
      const result = enumerateStereoisomers(molecule);
      setResults(result);
      setStatus(`Found ${result.count} stereoisomer(s)`);
    } catch (err) {
      setStatus(`Enumeration failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: labelColor }}>
        Enumerate all possible stereoisomers for this molecule.
      </div>

      <button
        onClick={handleEnumerate}
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
        {loading ? 'Enumerating...' : 'Enumerate Stereoisomers'}
      </button>

      {results && (
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '8px', backgroundColor: inputBg, borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>
              Found {results.count} Isomer{results.count !== 1 ? 's' : ''}
            </div>
          </div>

          {/* List */}
          <div style={{ padding: '8px' }}>
            {results.stereoisomers.map((iso, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px',
                  marginBottom: '4px',
                  backgroundColor: inputBg,
                  borderRadius: '3px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '10px', color: textColor }}>Isomer {idx + 1}</div>
                <button
                  onClick={() => setMolecule(iso)}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: accentColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px',
                  }}
                >
                  View
                </button>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ padding: '8px', borderTop: `1px solid ${borderColor}`, fontSize: '9px', color: labelColor }}>
            {results.description}
          </div>
        </div>
      )}
    </div>
  );
}
