import React from 'react';
import { BatchResultSummary, useUIStore } from '../../store/uiStore';

interface BatchResultPanelProps {
  results: BatchResultSummary[];
}

export function BatchResultPanel({ results }: BatchResultPanelProps) {
  const theme = useUIStore((s) => s.theme);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const successColor = '#4caf50';
  const errorColor = '#d94545';

  if (results.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: labelColor, fontSize: '12px' }}>
        No batch operations yet.
      </div>
    );
  }

  const latestResult = results[results.length - 1];

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: textColor }}>
        Last Operation: {latestResult.operation}
      </div>
      <div aria-label="Batch result hash" style={{ fontSize: '9px', color: labelColor, wordBreak: 'break-all' }}>
        Result hash: {latestResult.resultHash}
      </div>
      <div aria-label="Batch provenance" style={{ fontSize: '9px', color: labelColor }}>
        Engine: {latestResult.provenance.engine}
        {latestResult.provenance.inputFormat && `; Input: ${latestResult.provenance.inputFormat}`}
        {latestResult.provenance.outputFormat && `; Output: ${latestResult.provenance.outputFormat}`}
        {latestResult.provenance.filterOptions && `; MW: ${latestResult.provenance.filterOptions.minMW ?? '—'}–${latestResult.provenance.filterOptions.maxMW ?? '—'}`}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div
          style={{
            padding: '8px',
            backgroundColor: latestResult.processed > 0 ? successColor : borderColor,
            borderRadius: '4px',
            color: latestResult.processed > 0 ? 'white' : labelColor,
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{latestResult.processed}</div>
          <div style={{ fontSize: '9px' }}>Processed</div>
        </div>
        <div
          style={{
            padding: '8px',
            backgroundColor: latestResult.failed > 0 ? errorColor : borderColor,
            borderRadius: '4px',
            color: latestResult.failed > 0 ? 'white' : labelColor,
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{latestResult.failed}</div>
          <div style={{ fontSize: '9px' }}>Failed</div>
        </div>
        <div
          style={{
            padding: '8px',
            backgroundColor: latestResult.skipped > 0 ? '#d6a84f' : borderColor,
            borderRadius: '4px',
            color: latestResult.skipped > 0 ? 'white' : labelColor,
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold' }}>{latestResult.skipped}</div>
          <div style={{ fontSize: '9px' }}>Skipped</div>
        </div>
      </div>

      {/* Errors */}
      {latestResult.errors.length > 0 && (
        <div
          style={{
            padding: '8px',
            backgroundColor: theme === 'dark' ? '#3a2a2a' : '#ffe6e6',
            borderRadius: '4px',
            borderLeft: `3px solid ${errorColor}`,
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: errorColor, marginBottom: '4px' }}>
            Errors:
          </div>
          {latestResult.errors.slice(0, 3).map((err, idx) => (
            <div key={idx} style={{ fontSize: '9px', color: labelColor, marginBottom: '2px' }}>
              {err.length > 60 ? err.slice(0, 60) + '...' : err}
            </div>
          ))}
          {latestResult.errors.length > 3 && (
            <div style={{ fontSize: '9px', color: labelColor, marginTop: '4px' }}>
              +{latestResult.errors.length - 3} more errors
            </div>
          )}
        </div>
      )}

      {/* Per-item review */}
      {latestResult.items.length > 0 && (
        <div
          aria-label="Batch item review"
          style={{
            padding: '8px',
            backgroundColor: theme === 'dark' ? '#252d38' : '#f5f7fa',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>
            Item review{latestResult.cancelled ? ' (cancelled)' : ''}
          </div>
          {latestResult.items.map((item) => (
            <div key={item.index} style={{ fontSize: '9px', color: labelColor, marginBottom: '3px' }}>
              Item {item.index + 1}: <strong>{item.status}</strong>
              {item.error ? ` — ${item.error}` : ''}
              {item.warnings.length > 0 ? ` — ${item.warnings.join('; ')}` : ''}
              {item.properties && (
                <div aria-label={`Batch properties for item ${item.index + 1}`} style={{ marginLeft: '12px' }}>
                  Formula: {item.properties.formula}; MW: {item.properties.molecular_weight.toFixed(2)};
                  {' '}LogP: {item.properties.logp.toFixed(2)}; TPSA: {item.properties.tpsa.toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: '9px', color: labelColor, textAlign: 'right' }}>
        {new Date(latestResult.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
