import React from 'react';
import { useUIStore } from '../../store/uiStore';

export interface BatchResult {
  operation: string;
  processed: number;
  failed: number;
  errors: string[];
  timestamp: number;
}

interface BatchResultPanelProps {
  results: BatchResult[];
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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

      {/* Timestamp */}
      <div style={{ fontSize: '9px', color: labelColor, textAlign: 'right' }}>
        {new Date(latestResult.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
