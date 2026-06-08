import React, { useState, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { checkLipinski } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';

export function LipinskiPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);

  const [violations, setViolations] = useState<Array<{ rule: string; value: number; limit: number; violated: boolean }> | null>(null);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const violationColor = '#d94545';
  const passColor = '#4caf50';

  useMemo(() => {
    try {
      const props = wasmBridge.getProperties(molecule);
      const results = checkLipinski(props);
      setViolations(results);
    } catch (err) {
      console.error('Lipinski check failed:', err);
    }
  }, [molecule]);

  const violationCount = violations?.filter((v) => v.violated).length || 0;
  const isPassed = violationCount === 0;

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Lipinski Status */}
      <div
        style={{
          padding: '12px',
          backgroundColor: isPassed ? passColor : violationColor,
          color: 'white',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        {isPassed ? '✓ Lipinski Compliant' : `⚠ ${violationCount} Violation${violationCount !== 1 ? 's' : ''}`}
      </div>

      {/* Rules List */}
      {violations && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {violations.map((rule, idx) => (
            <div key={idx} style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
              {/* Rule Header */}
              <div
                style={{
                  padding: '8px',
                  backgroundColor: rule.violated ? '#3a2a2a' : inputBg,
                  borderLeft: `3px solid ${rule.violated ? violationColor : passColor}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>{rule.rule}</div>
                <div
                  style={{
                    fontSize: '10px',
                    color: rule.violated ? violationColor : passColor,
                    fontWeight: 'bold',
                  }}
                >
                  {rule.violated ? '✗' : '✓'}
                </div>
              </div>

              {/* Rule Details */}
              <div style={{ padding: '8px', fontSize: '10px', color: labelColor }}>
                <div>Value: {rule.value.toFixed(2)}</div>
                <div>Limit: {rule.limit}</div>
                <div style={{ marginTop: '4px', color: rule.violated ? violationColor : passColor }}>
                  {rule.violated ? 'Exceeds limit' : 'Within limit'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
        <strong>Lipinski's Rule of Five:</strong> Predicts drug-likeness. A compound violates if it has:
        <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
          <li>MW &gt; 500 Da</li>
          <li>LogP &gt; 5</li>
          <li>HBA &gt; 10</li>
          <li>HBD &gt; 5</li>
        </ul>
      </div>
    </div>
  );
}
