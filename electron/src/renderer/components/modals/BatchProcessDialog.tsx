import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export interface BatchDialogProps {
  onProcess: (config: BatchConfig) => Promise<void> | void;
  onCancel: () => void;
}

export interface BatchConfig {
  operation: 'convert' | 'standardize' | 'filter';
  inputFormat?: string;
  outputFormat?: string;
  filterMinMW?: number;
  filterMaxMW?: number;
  filterSmarts?: string;
}

export function BatchProcessDialog({ onProcess, onCancel }: BatchDialogProps) {
  const theme = useUIStore((s) => s.theme);
  const [operation, setOperation] = useState<'convert' | 'standardize' | 'filter'>('standardize');
  const [config, setConfig] = useState<BatchConfig>({ operation: 'standardize' });
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const dialogRef = useFocusTrap(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';

  const handleProcess = async () => {
    setProcessing(true);
    setProgress(0);
    try {
      const promise = onProcess({ ...config, operation });
      if (promise instanceof Promise) {
        await promise;
      }
      setProgress(100);
    } catch (err) {
      console.error('Batch process failed:', err);
      setProgress(0);
    }
    setProcessing(false);
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-process-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          width: '500px',
          padding: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <h2 id="batch-process-title" style={{ margin: '0 0 20px', color: textColor }}>Batch Process Molecules</h2>

        {/* Operation Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: labelColor, display: 'block', marginBottom: '8px' }}>
            Operation
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['standardize', 'convert', 'filter'] as const).map((op) => (
              <button
                key={op}
                onClick={() => {
                  setOperation(op);
                  setConfig({ ...config, operation: op });
                }}
                aria-pressed={operation === op}
                style={{
                  padding: '10px',
                  backgroundColor: operation === op ? '#4d8dff' : inputBg,
                  color: operation === op ? 'white' : textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: operation === op ? 'bold' : 'normal',
                }}
              >
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Operation-specific options */}
        {operation === 'filter' && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: inputBg, borderRadius: '4px' }}>
            <label style={{ fontSize: '11px', color: labelColor }}>MW Range</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <input
                type="number"
                placeholder="Min MW"
                value={config.filterMinMW || ''}
                onChange={(e) => setConfig({ ...config, filterMinMW: e.target.value ? parseInt(e.target.value) : undefined })}
                style={{
                  padding: '6px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '3px',
                  backgroundColor: theme === 'dark' ? '#1e2530' : '#ffffff',
                  color: textColor,
                  fontSize: '11px',
                }}
              />
              <input
                type="number"
                placeholder="Max MW"
                value={config.filterMaxMW || ''}
                onChange={(e) => setConfig({ ...config, filterMaxMW: e.target.value ? parseInt(e.target.value) : undefined })}
                style={{
                  padding: '6px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '3px',
                  backgroundColor: theme === 'dark' ? '#1e2530' : '#ffffff',
                  color: textColor,
                  fontSize: '11px',
                }}
              />
            </div>
          </div>
        )}

        {/* Progress */}
        {processing && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: labelColor, marginBottom: '8px' }}>
              Processing... {progress}%
            </div>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: borderColor,
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  backgroundColor: '#4d8dff',
                  transition: 'width 0.2s',
                }}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={processing}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: textColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              opacity: processing ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={processing}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4d8dff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              opacity: processing ? 0.7 : 1,
            }}
          >
            {processing ? 'Processing...' : 'Process'}
          </button>
        </div>
      </div>
    </div>
  );
}
