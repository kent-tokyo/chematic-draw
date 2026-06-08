import React, { useState, useMemo } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { predictProperties, PropertyPrediction } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';

export function PropertyPredictionPanel() {
  const theme = useUIStore((s) => s.theme);
  const molecule = useMoleculeStore((s) => s.molecule);

  const [predictions, setPredictions] = useState<PropertyPrediction[]>([]);
  const [molecularProps, setMolecularProps] = useState<Record<string, any> | null>(null);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  useMemo(() => {
    try {
      const props = wasmBridge.getProperties(molecule);
      setMolecularProps(props);
      const preds = predictProperties(molecule);
      setPredictions(preds);
    } catch (err) {
      console.error('Property prediction failed:', err);
    }
  }, [molecule]);

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              Spectroscopic Predictions
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
                  Confidence: {(pred.confidence * 100).toFixed(0)}% • {pred.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
        Calculated from molecular structure using chematic engine. Predictions based on available models.
      </div>
    </div>
  );
}
