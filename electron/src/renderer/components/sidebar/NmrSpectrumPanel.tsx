import React, { useMemo, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { MAX_NMR_JSON_LENGTH, serializeNmrSpectrum, validateNmrSpectrum, type NmrSpectrum } from '../../../../../packages/chematic-contract/src/index';
import { parseBrukerPeakList } from '../../lib/nmrBrukerPeakList';

const EMPTY_SPECTRUM: NmrSpectrum = {
  schema: 'chematic-draw/nmr-spectrum', schema_version: 1, nucleus: '1H', peaks: [],
  provenance: { kind: 'manual-entry' },
};

export function NmrSpectrumPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const [raw, setRaw] = useState(() => JSON.stringify(EMPTY_SPECTRUM, null, 2));
  const [spectrum, setSpectrum] = useState<NmrSpectrum | null>(EMPTY_SPECTRUM);
  const [errors, setErrors] = useState<string[]>([]);
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';
  const isJapanese = language === 'ja';
  const shifts = spectrum?.peaks.map((peak) => peak.shiftPpm) ?? [];
  const maxShift = Math.max(10, ...shifts, 0);
  const minShift = Math.min(0, ...shifts);
  const range = maxShift - minShift || 1;
  const visiblePeaks = spectrum?.peaks.slice(0, 100) ?? [];
  const bars = useMemo(() => spectrum?.peaks.map((peak) => ({
    ...peak,
    x: ((maxShift - peak.shiftPpm) / range) * 100,
    height: Math.max(8, Math.min(86, (peak.intensity ?? 1) * 70)),
  })) ?? [], [spectrum, maxShift, range]);

  const validate = () => {
    if (raw.length > MAX_NMR_JSON_LENGTH) {
      setErrors([`$: NMR JSON must be at most ${MAX_NMR_JSON_LENGTH} characters`]);
      return;
    }
    try {
      const candidate = JSON.parse(raw) as NmrSpectrum;
      const validationErrors = validateNmrSpectrum(candidate);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map((error) => `${error.path}: ${error.message}`));
        return;
      }
      setErrors([]);
      setSpectrum(candidate);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = typeof file.text === 'function' ? await file.text() : await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read spectrum file'));
        reader.readAsText(file);
      });
      if (text.length > MAX_NMR_JSON_LENGTH) {
        setErrors([`$: NMR input must be at most ${MAX_NMR_JSON_LENGTH} characters`]);
        return;
      }
      const isJson = file.name.toLowerCase().endsWith('.json');
      const candidate = isJson
        ? JSON.parse(text) as NmrSpectrum
        : parseBrukerPeakList(text, file.name);
      const validationErrors = validateNmrSpectrum(candidate);
      if (validationErrors.length > 0) {
        setErrors(validationErrors.map((error) => `${error.path}: ${error.message}`));
        return;
      }
      setErrors([]);
      setSpectrum(candidate);
      setRaw(isJson ? text : serializeNmrSpectrum(candidate));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : String(error)]);
    } finally {
      event.target.value = '';
    }
  };

  const download = () => {
    if (!spectrum) return;
    const url = URL.createObjectURL(new Blob([serializeNmrSpectrum(spectrum)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nmr-spectrum.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const updatePeakAnnotation = (peakId: string, field: 'assignment' | 'note', value: string) => {
    if (!spectrum) return;
    const next: NmrSpectrum = {
      ...spectrum,
      peaks: spectrum.peaks.map((peak) => peak.id === peakId
        ? { ...peak, [field]: value.trim() ? value : undefined }
        : peak),
    };
    setSpectrum(next);
    setRaw(serializeNmrSpectrum(next));
    setErrors([]);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontSize: '13px', fontWeight: 'bold', color: textColor }}>{isJapanese ? 'NMRスペクトル' : 'NMR spectrum'}</div>
      <div style={{ fontSize: '10px', color: labelColor, lineHeight: 1.4 }}>
        {isJapanese ? '汎用JSONとBruker 1D peak listを表示・検証します。自動帰属と予測は行いません。' : 'Generic JSON and Bruker 1D peak lists are displayed and validated. Automatic assignment and prediction are not provided.'}
      </div>
      <textarea
        aria-label={isJapanese ? 'NMRスペクトルJSON' : 'NMR spectrum JSON'}
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        rows={9}
        spellCheck={false}
        style={{ width: '100%', boxSizing: 'border-box', backgroundColor: inputBg, color: textColor, border: `1px solid ${borderColor}`, borderRadius: 4, padding: 8, fontFamily: 'monospace', fontSize: 10 }}
      />
      <button type="button" onClick={validate} style={{ padding: '7px', border: 'none', borderRadius: 4, backgroundColor: accentColor, color: 'white', cursor: 'pointer' }}>
        {isJapanese ? '検証して表示' : 'Validate and display'}
      </button>
      <div style={{ display: 'flex', gap: 6 }}>
        <label style={{ flex: 1, padding: '6px', border: `1px solid ${borderColor}`, borderRadius: 4, color: textColor, fontSize: 10, textAlign: 'center', cursor: 'pointer' }}>
          {isJapanese ? 'JSON / Brukerを読み込む' : 'Load JSON / Bruker'}
          <input aria-label={isJapanese ? 'NMRスペクトルファイル' : 'NMR spectrum file'} type="file" accept="application/json,.json,.txt,.pks" onChange={handleFile} style={{ display: 'none' }} />
        </label>
        <button type="button" onClick={download} disabled={!spectrum} style={{ flex: 1, padding: '6px', border: `1px solid ${borderColor}`, borderRadius: 4, backgroundColor: 'transparent', color: textColor, cursor: spectrum ? 'pointer' : 'not-allowed' }}>
          {isJapanese ? 'JSONを保存' : 'Save JSON'}
        </button>
      </div>
      {errors.length > 0 && <div role="alert" style={{ color: '#d94545', fontSize: 10 }}>{errors.join('\n')}</div>}
      {spectrum && (
        <div aria-label={`${spectrum.nucleus} NMR spectrum`} style={{ border: `1px solid ${borderColor}`, borderRadius: 4, padding: 8 }}>
          <div style={{ color: labelColor, fontSize: 10, marginBottom: 6 }}>{spectrum.nucleus} · {spectrum.peaks.length} peaks{spectrum.solvent ? ` · ${spectrum.solvent}` : ''}</div>
          <svg role="img" aria-label={`${spectrum.nucleus} spectrum plot`} viewBox="0 0 100 100" width="100%" height="120" preserveAspectRatio="none">
            <line x1="0" y1="92" x2="100" y2="92" stroke={borderColor} />
            {bars.map((bar) => <line key={bar.id} x1={bar.x} y1={92 - bar.height} x2={bar.x} y2="92" stroke={accentColor} strokeWidth="0.8"><title>{`${bar.shiftPpm} ppm${bar.assignment ? ` · ${bar.assignment}` : ''}`}</title></line>)}
          </svg>
          <div style={{ color: labelColor, fontSize: 9, display: 'flex', justifyContent: 'space-between' }}><span>{maxShift.toFixed(2)} ppm</span><span>{minShift.toFixed(2)} ppm</span></div>
        </div>
      )}
      {spectrum && spectrum.peaks.length > 0 && (
        <section aria-label={isJapanese ? 'NMRピーク帰属' : 'NMR peak assignments'} style={{ border: `1px solid ${borderColor}`, borderRadius: 4, padding: 8 }}>
          <div style={{ color: textColor, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>{isJapanese ? 'ピーク帰属（手動）' : 'Peak assignments (manual)'}</div>
          <div style={{ color: labelColor, fontSize: 9, marginBottom: 6 }}>
            {isJapanese ? '帰属とメモは実験データに保存されます。' : 'Assignments and notes are saved with the experimental data.'}
            {spectrum.peaks.length > visiblePeaks.length ? ` ${isJapanese ? `先頭${visiblePeaks.length}件を表示中（全${spectrum.peaks.length}件）` : `Showing the first ${visiblePeaks.length} of ${spectrum.peaks.length} peaks.`}` : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '64px minmax(90px, 1fr) minmax(90px, 1fr)', gap: 4, color: labelColor, fontSize: 9, alignItems: 'center' }}>
            <span>{isJapanese ? 'ppm' : 'ppm'}</span><span>{isJapanese ? '帰属' : 'Assignment'}</span><span>{isJapanese ? 'メモ' : 'Note'}</span>
            {visiblePeaks.map((peak) => <React.Fragment key={peak.id}>
              <span>{peak.shiftPpm}</span>
              <input aria-label={`${peak.id} ${isJapanese ? '帰属' : 'assignment'}`} value={peak.assignment ?? ''} onChange={(event) => updatePeakAnnotation(peak.id, 'assignment', event.target.value)} maxLength={2048} />
              <input aria-label={`${peak.id} ${isJapanese ? 'メモ' : 'note'}`} value={peak.note ?? ''} onChange={(event) => updatePeakAnnotation(peak.id, 'note', event.target.value)} maxLength={2048} />
            </React.Fragment>)}
          </div>
        </section>
      )}
    </div>
  );
}
