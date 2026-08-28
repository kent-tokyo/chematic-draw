import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { predictProperties, PropertyPrediction } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';

type PredictionState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; molecularProps: Record<string, any>; predictions: PropertyPrediction[] }
  | { status: 'error'; message: string };

export function PropertyPredictionPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);

  const [state, setState] = useState<PredictionState>({ status: 'idle' });

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';
  const errorColor = '#d94545';

  // Switch to 'loading' (clearing any prior success/error) before
  // computing, so switching from a working molecule to a failing one can't
  // leave the previous molecule's numbers rendered as if they were current.
  useEffect(() => {
    setState({ status: 'loading' });
    try {
      const molecularProps = wasmBridge.getProperties(molecule);
      const predictions = predictProperties(molecule);
      setState({ status: 'success', molecularProps, predictions });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [molecule]);

  const molecularProps = state.status === 'success' ? state.molecularProps : null;
  const predictions = state.status === 'success' ? state.predictions : [];

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {state.status === 'error' && (
        <div
          style={{
            padding: '12px',
            backgroundColor: errorColor,
            color: 'white',
            borderRadius: '4px',
            fontSize: '11px',
          }}
        >
          プロパティを計算できませんでした
          <div style={{ fontSize: '9px', marginTop: '4px', opacity: 0.85 }}>{state.message}</div>
        </div>
      )}

      {/* Molecular Properties */}
      {molecularProps && (
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ padding: '8px', backgroundColor: inputBg, borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>Molecular Properties</div>
          </div>

          <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { label: 'MW', value: molecularProps.mw?.toFixed(2) },
              { label: 'LogP', value: molecularProps.logp?.toFixed(2) },
              { label: 'HBA', value: molecularProps.hba },
              { label: 'HBD', value: molecularProps.hbd },
              { label: 'RotBonds', value: molecularProps.rotatable_bonds },
              { label: 'Atoms', value: molecule.atoms.length },
              { label: 'Bonds', value: molecule.bonds.length },
              { label: 'Rings', value: molecularProps.ring_count },
            ].map((prop, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px',
                  backgroundColor: bgColor,
                  borderRadius: '3px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: '9px', color: labelColor }}>{prop.label}</div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginTop: '2px' }}>
                  {prop.value ?? 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predicted Properties */}
      {predictions.length > 0 && (
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ padding: '8px', backgroundColor: inputBg, borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>
              Calculated Properties
            </div>
          </div>

          <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {predictions.map((pred, idx) => (
              <div key={idx} style={{ padding: '8px', backgroundColor: inputBg, borderRadius: '3px' }}>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor }}>{pred.property}</div>
                <div style={{ fontSize: '11px', color: accentColor, marginTop: '4px', fontFamily: 'monospace' }}>
                  {pred.predictedValue}
                </div>
                <div style={{ fontSize: '9px', color: labelColor, marginTop: '4px' }}>
                  {pred.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
        Calculated directly from molecular structure using the chematic engine (deterministic descriptors, not statistical predictions).
      </div>
    </div>
  );
}
