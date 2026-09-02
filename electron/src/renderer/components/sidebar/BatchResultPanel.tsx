import React, { useState } from 'react';
import { BatchResultSummary, useUIStore } from '../../store/uiStore';

interface BatchResultPanelProps {
  results: BatchResultSummary[];
  onRetry?: (result: BatchResultSummary) => Promise<void> | void;
}

export function BatchResultPanel({ results, onRetry }: BatchResultPanelProps) {
  const theme = useUIStore((s) => s.theme);
  const [selectedResult, setSelectedResult] = useState<BatchResultSummary | null>(null);
  const [itemFilter, setItemFilter] = useState<'all' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'>('all');
  const [retrying, setRetrying] = useState(false);

  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#ffffff';
  const successColor = '#4caf50';
  const errorColor = '#d94545';

  if (results.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: labelColor, fontSize: '12px' }}>
        No batch operations yet.
      </div>
    );
  }

  const selectedIndex = selectedResult === null ? -1 : results.indexOf(selectedResult);
  const resultIndex = selectedIndex >= 0 ? selectedIndex : results.length - 1;
  const latestResult = results[resultIndex];
  const visibleItems = latestResult.items.filter((item) => itemFilter === 'all' || item.status === itemFilter);

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {results.length > 1 && (
        <div aria-label="Batch history" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor }}>Batch history</div>
          {results.map((result, index) => (
            <button
              key={`${result.timestamp}-${index}`}
              aria-label={`Batch history item ${index + 1}: ${result.operation}`}
              onClick={() => setSelectedResult(result)}
              style={{
                padding: '5px 7px',
                border: `1px solid ${borderColor}`,
                borderRadius: '3px',
                backgroundColor: index === resultIndex ? (theme === 'dark' ? '#3a4a57' : '#e4e9f1') : 'transparent',
                color: textColor,
                textAlign: 'left',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              {index + 1}. {result.operation} — {result.processed} processed, {result.failed} failed
            </button>
          ))}
        </div>
      )}
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
        {latestResult.provenance.filterOptions && `; MW: ${latestResult.provenance.filterOptions.minMW ?? '—'}–${latestResult.provenance.filterOptions.maxMW ?? '—'}; LogP: ${latestResult.provenance.filterOptions.minLogP ?? '—'}–${latestResult.provenance.filterOptions.maxLogP ?? '—'}`}
        {latestResult.provenance.smartsPattern && `; SMARTS: ${latestResult.provenance.smartsPattern}`}
      </div>
      {latestResult.failed > 0 && latestResult.retry && onRetry && (
        <button
          type="button"
          aria-label="Retry failed batch items"
          disabled={retrying}
          aria-busy={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await onRetry(latestResult);
            } finally {
              setRetrying(false);
            }
          }}
          style={{ alignSelf: 'flex-start', padding: '6px 10px', border: `1px solid ${borderColor}`, borderRadius: '3px', backgroundColor: inputBg, color: textColor, cursor: retrying ? 'wait' : 'pointer', fontSize: '10px' }}
        >
          {retrying ? 'Retrying...' : `Retry failed (${latestResult.failed})`}
        </button>
      )}

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
            <span>Item review{latestResult.cancelled ? ' (cancelled)' : ''}</span>
            <select
              aria-label="Batch item status filter"
              value={itemFilter}
              onChange={(event) => setItemFilter(event.target.value as typeof itemFilter)}
              style={{ marginLeft: '8px', fontSize: '9px', color: textColor, backgroundColor: inputBg, border: `1px solid ${borderColor}` }}
            >
              <option value="all">All</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {visibleItems.length === 0 && (
            <div style={{ fontSize: '9px', color: labelColor }}>No items match this status.</div>
          )}
          {visibleItems.map((item) => (
            <div key={item.index} style={{ fontSize: '9px', color: labelColor, marginBottom: '3px' }}>
              Item {item.index + 1}: <strong>{item.status}</strong>
              {item.error ? ` — ${item.error}` : ''}
              {item.warnings.length > 0 ? ` — ${item.warnings.join('; ')}` : ''}
              {item.inputAtomCount !== undefined && item.inputBondCount !== undefined && item.outputAtomCount !== undefined && item.outputBondCount !== undefined && (
                <div aria-label={`Batch structure comparison for item ${item.index + 1}`} style={{ marginLeft: '12px' }}>
                  Structure: {item.inputAtomCount} atoms / {item.inputBondCount} bonds → {item.outputAtomCount} atoms / {item.outputBondCount} bonds
                </div>
              )}
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
