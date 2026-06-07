import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import * as wasmBridge from '../../wasm/wasmBridge';

interface Properties {
  mw?: number;
  logp?: number;
  tpsa?: number;
  hba?: number;
  hbd?: number;
  rotatable_bonds?: number;
}

export function ResearchPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);
  const [properties, setProperties] = useState<Properties | null>(null);
  const [iupacName, setIupacName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    try {
      const props = wasmBridge.getProperties(molecule);
      setProperties(props);
      try {
        const name = wasmBridge.getIupacName(molecule);
        setIupacName(name);
      } catch (err) {
        setIupacName('(unavailable)');
      }
    } catch (err) {
      setProperties(null);
    }
    setLoading(false);
  }, [molecule]);

  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const bgColor = theme === 'dark' ? '#2f3a47' : '#f3f5f8';

  const lipinski = {
    mw: (properties?.mw ?? 0) <= 500,
    logp: (properties?.logp ?? 0) <= 5,
    hba: (properties?.hba ?? 0) <= 10,
    hbd: (properties?.hbd ?? 0) <= 5,
  };

  const lipinskiPassed = Object.values(lipinski).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {loading && <div style={{ color: labelColor, fontSize: '12px' }}>Loading...</div>}

      {!loading && properties && (
        <>
          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>IUPAC Name</label>
            <div
              style={{
                marginTop: '4px',
                fontSize: '10px',
                color: textColor,
                padding: '8px',
                backgroundColor: bgColor,
                borderRadius: '3px',
                wordWrap: 'break-word',
                minHeight: '32px',
              }}
            >
              {iupacName}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>MW</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.mw?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>LogP</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.logp?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>TPSA</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.tpsa?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>HBA/HBD</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.hba ?? 0} / {properties.hbd ?? 0}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>Lipinski's Rule of 5</label>
            <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: lipinski.mw ? '#58c97a' : '#f26d6d' }}>
                ✓ MW ≤ 500 ({properties.mw?.toFixed(0)})
              </div>
              <div style={{ color: lipinski.logp ? '#58c97a' : '#f26d6d' }}>
                ✓ LogP ≤ 5 ({properties.logp?.toFixed(1)})
              </div>
              <div style={{ color: lipinski.hba ? '#58c97a' : '#f26d6d' }}>
                ✓ HBA ≤ 10 ({properties.hba})
              </div>
              <div style={{ color: lipinski.hbd ? '#58c97a' : '#f26d6d' }}>
                ✓ HBD ≤ 5 ({properties.hbd})
              </div>
              <div style={{ marginTop: '4px', fontWeight: 'bold', color: textColor }}>
                Passed: {lipinskiPassed}/4 rules
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && !properties && (
        <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          No molecule loaded
        </div>
      )}
    </div>
  );
}
