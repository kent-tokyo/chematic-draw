import React, { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { checkLipinski } from '../../lib/advancedFeatures';
import { getPropertiesCached } from '../../lib/analysisCache';
import { moleculeStructureKey } from '../../lib/moleculeKey';

type LipinskiRule = { rule: string; value: number; limit: number; violated: boolean };
type LipinskiState = { sourceKey: string } & (
  | { status: 'idle' | 'loading' }
  | { status: 'success'; violations: LipinskiRule[] }
  | { status: 'error'; message: string }
);

export function LipinskiPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);

  const [state, setState] = useState<LipinskiState>({ status: 'idle', sourceKey: '' });
  const moleculeKey = useMemo(() => moleculeStructureKey(molecule), [molecule]);
  const visibleState: LipinskiState = state.sourceKey === moleculeKey ? state : { status: 'loading', sourceKey: moleculeKey };

  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const violationColor = '#d94545';
  const passColor = '#4caf50';

  // The visible state is derived as loading until this keyed result arrives.
  useEffect(() => {
    const currentMolecule = useMoleculeStore.getState().molecule;
    try {
      const props = getPropertiesCached(currentMolecule);
      const results = checkLipinski(props);
      // This is the asynchronous boundary where the keyed WASM result enters React state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'success', violations: results, sourceKey: moleculeKey });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err), sourceKey: moleculeKey });
    }
  }, [moleculeKey]);

  const violations = visibleState.status === 'success' ? visibleState.violations : null;
  const violationCount = violations?.filter((v) => v.violated).length ?? 0;
  const isPassed = visibleState.status === 'success' && violationCount === 0;

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Lipinski Status */}
      {visibleState.status === 'error' ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: violationColor,
            color: 'white',
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          Lipinski判定を実行できませんでした
          <div style={{ fontSize: '9px', fontWeight: 'normal', marginTop: '4px', opacity: 0.85 }}>{visibleState.message}</div>
        </div>
      ) : visibleState.status === 'loading' || visibleState.status === 'idle' ? (
        <div
          style={{
            padding: '12px',
            backgroundColor: inputBg,
            color: labelColor,
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '12px',
          }}
        >
          Calculating...
        </div>
      ) : (
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
      )}

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
