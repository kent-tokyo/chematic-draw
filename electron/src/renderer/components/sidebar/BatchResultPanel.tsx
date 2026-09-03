import React, { useState } from 'react';
import { BatchResultSummary, useUIStore } from '../../store/uiStore';

interface BatchResultPanelProps {
  results: BatchResultSummary[];
  onRetry?: (result: BatchResultSummary) => Promise<void> | void;
}

export function BatchResultPanel({ results, onRetry }: BatchResultPanelProps) {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const [selectedResult, setSelectedResult] = useState<BatchResultSummary | null>(null);
  const [itemFilter, setItemFilter] = useState<'all' | 'succeeded' | 'failed' | 'skipped' | 'cancelled'>('all');
  const [retrying, setRetrying] = useState(false);

  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#ffffff';
  const successColor = '#4caf50';
  const errorColor = '#d94545';
  const isJapanese = language === 'ja';

  if (results.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: labelColor, fontSize: '12px' }}>
        {isJapanese ? '一括処理はまだありません。' : 'No batch operations yet.'}
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
        <div aria-label={isJapanese ? '一括処理の履歴' : 'Batch history'} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor }}>{isJapanese ? '一括処理の履歴' : 'Batch history'}</div>
          {results.map((result, index) => (
            <button
              key={`${result.timestamp}-${index}`}
              aria-label={isJapanese ? `一括処理履歴 ${index + 1}: ${result.operation}` : `Batch history item ${index + 1}: ${result.operation}`}
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
              {index + 1}. {result.operation} — {result.processed} {isJapanese ? '件処理済み' : 'processed'}, {result.failed} {isJapanese ? '件失敗' : 'failed'}
            </button>
          ))}
        </div>
      )}
      <div style={{ fontSize: '12px', fontWeight: 'bold', color: textColor }}>
        {isJapanese ? '直近の操作' : 'Last Operation'}: {latestResult.operation}
      </div>
      <div aria-label={isJapanese ? '一括処理結果ハッシュ' : 'Batch result hash'} style={{ fontSize: '9px', color: labelColor, wordBreak: 'break-all' }}>
        {isJapanese ? '結果ハッシュ' : 'Result hash'}: {latestResult.resultHash}
      </div>
      <div aria-label={isJapanese ? '一括処理の出典情報' : 'Batch provenance'} style={{ fontSize: '9px', color: labelColor }}>
        {isJapanese ? 'エンジン' : 'Engine'}: {latestResult.provenance.engine}
        {latestResult.provenance.inputFormat && `; ${isJapanese ? '入力' : 'Input'}: ${latestResult.provenance.inputFormat}`}
        {latestResult.provenance.outputFormat && `; ${isJapanese ? '出力' : 'Output'}: ${latestResult.provenance.outputFormat}`}
        {latestResult.provenance.filterOptions && `; MW: ${latestResult.provenance.filterOptions.minMW ?? '—'}–${latestResult.provenance.filterOptions.maxMW ?? '—'}; LogP: ${latestResult.provenance.filterOptions.minLogP ?? '—'}–${latestResult.provenance.filterOptions.maxLogP ?? '—'}`}
        {latestResult.provenance.smartsPattern && `; SMARTS: ${latestResult.provenance.smartsPattern}`}
      </div>
      {latestResult.failed > 0 && latestResult.retry && onRetry && (
        <button
          type="button"
          aria-label={isJapanese ? '失敗した一括処理項目を再試行' : 'Retry failed batch items'}
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
          {retrying ? (isJapanese ? '再試行中…' : 'Retrying...') : (isJapanese ? `失敗分を再試行（${latestResult.failed}件）` : `Retry failed (${latestResult.failed})`)}
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
          <div style={{ fontSize: '9px' }}>{isJapanese ? '処理済み' : 'Processed'}</div>
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
          <div style={{ fontSize: '9px' }}>{isJapanese ? '失敗' : 'Failed'}</div>
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
          <div style={{ fontSize: '9px' }}>{isJapanese ? 'スキップ' : 'Skipped'}</div>
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
            {isJapanese ? 'エラー：' : 'Errors:'}
          </div>
          {latestResult.errors.slice(0, 3).map((err, idx) => (
            <div key={idx} style={{ fontSize: '9px', color: labelColor, marginBottom: '2px' }}>
              {err.length > 60 ? err.slice(0, 60) + '...' : err}
            </div>
          ))}
          {latestResult.errors.length > 3 && (
            <div style={{ fontSize: '9px', color: labelColor, marginTop: '4px' }}>
              +{latestResult.errors.length - 3} {isJapanese ? '件のエラー' : 'more errors'}
            </div>
          )}
        </div>
      )}

      {/* Per-item review */}
      {latestResult.items.length > 0 && (
        <div
          aria-label={isJapanese ? '一括処理項目の確認' : 'Batch item review'}
          style={{
            padding: '8px',
            backgroundColor: theme === 'dark' ? '#252d38' : '#f5f7fa',
            borderRadius: '4px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: textColor, marginBottom: '5px' }}>
            <span>{isJapanese ? '項目の確認' : 'Item review'}{latestResult.cancelled ? (isJapanese ? '（キャンセル済み）' : ' (cancelled)') : ''}</span>
            <select
              aria-label={isJapanese ? '一括処理項目の状態フィルター' : 'Batch item status filter'}
              value={itemFilter}
              onChange={(event) => setItemFilter(event.target.value as typeof itemFilter)}
              style={{ marginLeft: '8px', fontSize: '9px', color: textColor, backgroundColor: inputBg, border: `1px solid ${borderColor}` }}
            >
              <option value="all">{isJapanese ? 'すべて' : 'All'}</option>
              <option value="succeeded">{isJapanese ? '成功' : 'Succeeded'}</option>
              <option value="failed">{isJapanese ? '失敗' : 'Failed'}</option>
              <option value="skipped">{isJapanese ? 'スキップ' : 'Skipped'}</option>
              <option value="cancelled">{isJapanese ? 'キャンセル' : 'Cancelled'}</option>
            </select>
          </div>
          {visibleItems.length === 0 && (
            <div style={{ fontSize: '9px', color: labelColor }}>{isJapanese ? 'この状態に一致する項目はありません。' : 'No items match this status.'}</div>
          )}
          {visibleItems.map((item) => (
            <div key={item.index} style={{ fontSize: '9px', color: labelColor, marginBottom: '3px' }}>
              {isJapanese ? '項目' : 'Item'} {item.index + 1}: <strong>{item.status}</strong>
              {item.error ? ` — ${item.error}` : ''}
              {item.warnings.length > 0 ? ` — ${item.warnings.join('; ')}` : ''}
              {item.inputAtomCount !== undefined && item.inputBondCount !== undefined && item.outputAtomCount !== undefined && item.outputBondCount !== undefined && (
                <div aria-label={isJapanese ? `項目${item.index + 1}の構造比較` : `Batch structure comparison for item ${item.index + 1}`} style={{ marginLeft: '12px' }}>
                  {isJapanese ? '構造' : 'Structure'}: {item.inputAtomCount} {isJapanese ? '原子' : 'atoms'} / {item.inputBondCount} {isJapanese ? '結合' : 'bonds'} → {item.outputAtomCount} {isJapanese ? '原子' : 'atoms'} / {item.outputBondCount} {isJapanese ? '結合' : 'bonds'}
                </div>
              )}
              {item.properties && (
                <div aria-label={isJapanese ? `項目${item.index + 1}の物性` : `Batch properties for item ${item.index + 1}`} style={{ marginLeft: '12px' }}>
                  {isJapanese ? '分子式' : 'Formula'}: {item.properties.formula}; MW: {item.properties.molecular_weight.toFixed(2)};
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
