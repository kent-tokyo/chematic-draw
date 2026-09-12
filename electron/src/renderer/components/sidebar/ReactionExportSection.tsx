import React, { type ChangeEvent, type RefObject } from 'react';
import type { SchemeFontScale, SchemePageSize, SchemeSvgPreset } from '../../lib/schemeExport';

interface ReactionExportSectionProps {
  isJapanese: boolean;
  isDark: boolean;
  textColor: string;
  labelColor: string;
  borderColor: string;
  accentColor: string;
  showExportMenu: boolean;
  setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
  svgPreset: SchemeSvgPreset;
  setSvgPreset: React.Dispatch<React.SetStateAction<SchemeSvgPreset>>;
  fontScale: SchemeFontScale;
  setFontScale: React.Dispatch<React.SetStateAction<SchemeFontScale>>;
  pageSize: SchemePageSize;
  setPageSize: React.Dispatch<React.SetStateAction<SchemePageSize>>;
  onExportJSON: () => void;
  onExportSVG: () => void;
  onExportPDF: () => void;
  onExportRXN: () => void;
  onExportCSV: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

/** Export/import controls kept separate from the step editor. */
export function ReactionExportSection({
  isJapanese,
  isDark,
  textColor,
  labelColor,
  borderColor,
  accentColor,
  showExportMenu,
  setShowExportMenu,
  svgPreset,
  setSvgPreset,
  fontScale,
  setFontScale,
  pageSize,
  setPageSize,
  onExportJSON,
  onExportSVG,
  onExportPDF,
  onExportRXN,
  onExportCSV,
  onImport,
  fileInputRef,
}: ReactionExportSectionProps) {
  const buttonStyle = {
    width: '100%',
    backgroundColor: isDark ? '#2a3a3a' : '#f0f0f0',
    color: textColor,
    border: `1px solid ${borderColor}`,
    borderRadius: '3px',
    cursor: 'pointer' as const,
  };

  return (
    <div style={{ padding: '12px', backgroundColor: isDark ? '#1e2a2a' : '#f9f9f9', border: `1px solid ${borderColor}`, borderRadius: '6px', marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        {isJapanese ? 'エクスポートとインポート' : 'Export & Import'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button
          onClick={() => setShowExportMenu((visible) => !visible)}
          style={{ padding: '6px 8px', backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
        >
          {isJapanese ? '▼ 反応スキームを出力' : '▼ Export Scheme'}
        </button>
        {showExportMenu && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <button data-testid="reaction-export-json" onClick={onExportJSON} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>{isJapanese ? 'JSON（全データ）' : 'JSON (full data)'}</button>
            <button onClick={onExportSVG} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>{isJapanese ? 'SVG画像' : 'SVG Image'}</button>
            <button onClick={onExportPDF} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>{isJapanese ? 'PDF（出版用）' : 'PDF (publication)'}</button>
            <label style={{ fontSize: '9px', color: labelColor }}>
              {isJapanese ? '出版スタイル' : 'Publication style'}
              <select aria-label={isJapanese ? '出版スタイル' : 'Publication style'} value={svgPreset} onChange={(event) => setSvgPreset(event.target.value as SchemeSvgPreset)} style={{ marginLeft: '4px', fontSize: '9px' }}>
                <option value="journal">{isJapanese ? '論文（モノクロ）' : 'Journal (monochrome)'}</option>
                <option value="screen">{isJapanese ? '画面表示' : 'Screen'}</option>
              </select>
            </label>
            <label style={{ fontSize: '9px', color: labelColor }}>
              {isJapanese ? '文字サイズ' : 'Text scale'}
              <select data-testid="publication-font-scale" aria-label={isJapanese ? '文字サイズ' : 'Text scale'} value={fontScale} onChange={(event) => setFontScale(event.target.value as SchemeFontScale)} style={{ marginLeft: '4px', fontSize: '9px' }}>
                <option value="compact">{isJapanese ? '小' : 'Compact'}</option>
                <option value="standard">{isJapanese ? '標準' : 'Standard'}</option>
                <option value="large">{isJapanese ? '大' : 'Large'}</option>
              </select>
            </label>
            <label style={{ fontSize: '9px', color: labelColor }}>
              {isJapanese ? 'ページサイズ' : 'Page size'}
              <select data-testid="publication-page-size" aria-label={isJapanese ? 'ページサイズ' : 'Page size'} value={pageSize} onChange={(event) => setPageSize(event.target.value as SchemePageSize)} style={{ marginLeft: '4px', fontSize: '9px' }}>
                <option value="auto">{isJapanese ? '自動' : 'Auto'}</option>
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
              </select>
            </label>
            <button onClick={onExportRXN} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>{isJapanese ? 'RXN V2000（単一ステップ）' : 'RXN V2000 (single step)'}</button>
            <button onClick={onExportCSV} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>{isJapanese ? 'CSVレポート' : 'CSV Report'}</button>
          </div>
        )}
        <input data-testid="reaction-import-file" type="file" accept=".json,.rxn" onChange={onImport} ref={fileInputRef} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '6px 8px', backgroundColor: borderColor, color: textColor, border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>
          {isJapanese ? 'JSONまたはRXNを読み込む' : 'Import JSON or RXN'}
        </button>
      </div>
    </div>
  );
}
