import React, { useEffect, useRef, useState } from 'react';
import { MoleculeDto } from '../store/types';
import { parsePastedContent } from '../lib/clipboard';
import { serializeSessionBundle, parseSessionBundle } from '../lib/sessionBundle';
import { runAnalysisInWorker } from '../lib/analysisWorkerClient';
import * as wasmBridge from '../wasm/wasmBridge';
import { browserDocumentHost } from '../lib/documentHost';
import { svgToPngBase64 } from '../lib/svgToPng';

const MAX_RECOVERY_TEXT_LENGTH = 10_000_000;

interface BrowserDocumentToolbarProps {
  molecule: MoleculeDto;
  language: string;
  onMoleculeLoaded: (molecule: MoleculeDto, fileName?: string) => void;
  onNew: () => void;
  onStatus: (message: string) => void;
}

function moleculeFingerprint(molecule: MoleculeDto): string {
  return JSON.stringify({
    atoms: molecule.atoms.map(({ selected: _selected, ...atom }) => atom),
    bonds: molecule.bonds.map(({ selected: _selected, ...bond }) => bond),
  });
}

export function BrowserDocumentToolbar({ molecule, language, onMoleculeLoaded, onNew, onStatus }: BrowserDocumentToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedFingerprint, setSavedFingerprint] = useState(() => moleculeFingerprint(molecule));
  const isDirty = savedFingerprint !== moleculeFingerprint(molecule);
  const ja = language === 'ja';

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [isDirty]);

  useEffect(() => {
    let cancelled = false;
    try {
      const raw = browserDocumentHost.readRecovery();
      if (raw && raw.length <= MAX_RECOVERY_TEXT_LENGTH) {
        const recovered = parseSessionBundle(raw).document.molecule;
        if (!cancelled && recovered.atoms.length > 0) {
          const shouldRestore = window.confirm(ja ? '前回の編集を復元しますか？' : 'Restore the previous browser session?');
          if (shouldRestore) {
            onMoleculeLoaded(recovered, 'browser-recovery.schematic.json');
            window.setTimeout(() => setSavedFingerprint(moleculeFingerprint(recovered)), 0);
            onStatus(ja ? '前回のセッションを復元しました' : 'Previous session restored');
          } else {
            browserDocumentHost.clearRecovery();
            onStatus(ja ? '復旧データを破棄しました' : 'Recovery discarded');
          }
        }
      }
    } catch {
      // A stale, malformed, or unavailable browser store must not block editing.
      browserDocumentHost.clearRecovery();
    }
    return () => { cancelled = true; };
    // Restore exactly once when the browser host mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const snapshot = serializeSessionBundle(molecule, null);
        if (snapshot.length <= MAX_RECOVERY_TEXT_LENGTH) browserDocumentHost.writeRecovery(snapshot);
      } catch {
        // Recovery is best effort; normal editing must continue if storage is full or blocked.
      }
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [molecule]);

  const guardUnsaved = () => !isDirty || window.confirm(ja ? '未保存の変更を破棄しますか？' : 'Discard unsaved changes?');

  const handleNew = () => {
    if (!guardUnsaved()) return;
    onNew();
    setSavedFingerprint(moleculeFingerprint({ atoms: [], bonds: [] }));
    browserDocumentHost.clearRecovery();
    onStatus(ja ? '新しい分子' : 'New molecule');
  };

  const handleSave = () => {
    const fileName = `chematic-${new Date().toISOString().slice(0, 10)}.schematic.json`;
    browserDocumentHost.download(fileName, serializeSessionBundle(molecule, null), 'application/json;charset=utf-8');
    setSavedFingerprint(moleculeFingerprint(molecule));
    browserDocumentHost.clearRecovery();
    onStatus(ja ? 'セッションをダウンロードしました' : 'Session downloaded');
  };

  const openFile = async (file: File) => {
    if (!file || !guardUnsaved()) return;
    try {
      const content = await file.text();
      const loaded = file.name.toLowerCase().endsWith('.json')
        ? parseSessionBundle(content).document.molecule
        : await parsePastedContent(content);
      onMoleculeLoaded(loaded, file.name);
      setSavedFingerprint(moleculeFingerprint(loaded));
      onStatus(ja ? `${file.name} を開きました` : `Opened ${file.name}`);
    } catch (error) {
      onStatus(`${ja ? '読込に失敗しました' : 'Open failed'}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleOpen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await openFile(file);
  };

  const handleCopy = async () => {
    try {
      const smiles = await runAnalysisInWorker('canonical-smiles', molecule) as string;
      await browserDocumentHost.writeClipboard(smiles);
      onStatus(ja ? 'SMILESをコピーしました' : 'SMILES copied');
    } catch (error) {
      onStatus(`${ja ? 'コピーに失敗しました' : 'Copy failed'}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleExport = async (format: 'mol' | 'smiles' | 'svg' | 'png') => {
    try {
      if (format === 'svg') {
        browserDocumentHost.download('chematic-structure.svg', wasmBridge.toSvg(molecule), 'image/svg+xml;charset=utf-8');
      } else if (format === 'png') {
        const png = await svgToPngBase64(wasmBridge.toSvg(molecule));
        browserDocumentHost.downloadBase64('chematic-structure.png', png, 'image/png');
      } else {
        const content = await runAnalysisInWorker(format === 'mol' ? 'mol-v2000' : 'canonical-smiles', molecule) as string;
        browserDocumentHost.download(`chematic-structure.${format === 'mol' ? 'mol' : 'smi'}`, content, 'text/plain;charset=utf-8');
      }
      onStatus(ja ? '書き出しました' : 'Exported');
    } catch (error) {
      onStatus(`${ja ? '書き出しに失敗しました' : 'Export failed'}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '5px 8px', background: 'transparent', color: 'inherit',
    border: '1px solid currentColor', borderRadius: '4px', cursor: 'pointer', fontSize: '11px',
  };
  return (
    <div
      role="group"
      aria-label={ja ? 'ブラウザ文書操作' : 'Browser document actions'}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
      onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void openFile(file); }}
      style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
    >
      <input ref={inputRef} type="file" accept=".json,.schematic.json,.mol,.sdf,.smi,.smiles,.cdxml,text/*" onChange={handleOpen} hidden />
      <button type="button" data-testid="browser-new" onClick={handleNew} style={buttonStyle}>{ja ? '新規' : 'New'}</button>
      <button type="button" data-testid="browser-open" onClick={() => inputRef.current?.click()} style={buttonStyle}>{ja ? '開く' : 'Open'}</button>
      <button type="button" data-testid="browser-save" onClick={handleSave} style={buttonStyle}>{ja ? '保存' : 'Save'}{isDirty ? ' *' : ''}</button>
      <button type="button" data-testid="browser-export-mol" onClick={() => void handleExport('mol')} style={buttonStyle}>{ja ? 'MOL' : 'MOL'}</button>
      <button type="button" data-testid="browser-export-smiles" onClick={() => void handleExport('smiles')} style={buttonStyle}>SMILES</button>
      <button type="button" data-testid="browser-export-svg" onClick={() => void handleExport('svg')} style={buttonStyle}>SVG</button>
      <button type="button" data-testid="browser-export-png" onClick={() => void handleExport('png')} style={buttonStyle}>PNG</button>
      <button type="button" data-testid="browser-copy-smiles" onClick={handleCopy} style={buttonStyle}>{ja ? 'SMILESコピー' : 'Copy SMILES'}</button>
    </div>
  );
}
