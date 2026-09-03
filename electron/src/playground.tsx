import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import * as wasm from './renderer/wasm/wasmBridge';
import type { AppLanguage, Molecule as MoleculeDto } from '../../packages/chematic-contract/src/index';

type Copy = { title: string; intro: string; input: string; parse: string; sample: string; exportSmiles: string; exportSvg: string; atoms: string; bonds: string; ready: string; error: string; language: string };
const copy: Record<AppLanguage, Copy> = {
  en: { title: 'Chematic Draw Playground', intro: 'Edit a chemical structure in your browser. Nothing is uploaded.', input: 'SMILES or chemical structure', parse: 'Update structure', sample: 'Load sample', exportSmiles: 'Copy SMILES', exportSvg: 'Download SVG', atoms: 'atoms', bonds: 'bonds', ready: 'Ready in your browser', error: 'Could not parse this structure', language: 'Language' },
  ja: { title: 'Chematic Draw Playground', intro: 'ブラウザー上で構造式を編集できます。データはアップロードされません。', input: 'SMILESまたは化学構造', parse: '構造を更新', sample: 'サンプルを読み込む', exportSmiles: 'SMILESをコピー', exportSvg: 'SVGをダウンロード', atoms: '原子', bonds: '結合', ready: 'ブラウザー上で準備完了', error: 'この構造を解析できませんでした', language: '言語' },
  zh: { title: 'Chematic Draw Playground', intro: '直接在浏览器中编辑化学结构。不会上传任何数据。', input: 'SMILES 或化学结构', parse: '更新结构', sample: '加载示例', exportSmiles: '复制 SMILES', exportSvg: '下载 SVG', atoms: '原子', bonds: '键', ready: '浏览器中已准备就绪', error: '无法解析此结构', language: '语言' },
};

const samples = [
  { label: 'Benzene', smiles: 'c1ccccc1' },
  { label: 'Caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { label: 'Aspirin', smiles: 'CC(=O)Oc1ccccc1C(=O)O' },
];

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Playground() {
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [smiles, setSmiles] = useState(samples[0].smiles);
  const [molecule, setMolecule] = useState<MoleculeDto | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const t = copy[language];

  useEffect(() => {
    wasm.initWasm().then(() => {
      setReady(true);
      try { setMolecule(wasm.parseMolecule(samples[0].smiles)); } catch { setError(copy.en.error); }
    }).catch(() => setError(copy.en.error));
  }, []);

  const svg = useMemo(() => molecule ? wasm.toSvg(molecule) : '', [molecule]);
  const canonicalSmiles = useMemo(() => molecule ? wasm.toCanonicalSmiles(molecule) : '', [molecule]);
  const updateStructure = (value = smiles) => {
    try {
      const parsed = wasm.parseMolecule(value);
      setMolecule(parsed);
      setSmiles(value);
      setError('');
    } catch {
      setError(t.error);
    }
  };

  return (
    <main className="playground-page">
      <header className="playground-header">
        <div><span className="playground-mark" aria-hidden="true">⌬</span><span>{t.title}</span></div>
        <label className="language-picker">{t.language}
          <select value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)} aria-label={t.language}>
            <option value="en">English</option><option value="ja">日本語</option><option value="zh">简体中文</option>
          </select>
        </label>
      </header>
      <p className="playground-intro">{t.intro}</p>
      <section className="playground-workspace" aria-label={t.title}>
        <div className="playground-editor">
          <label htmlFor="playground-smiles">{t.input}</label>
          <textarea id="playground-smiles" value={smiles} onChange={(event) => setSmiles(event.target.value)} rows={3} spellCheck={false} />
          <div className="playground-actions">
            <button onClick={() => updateStructure()} disabled={!ready}>{t.parse}</button>
            <button className="secondary" onClick={() => updateStructure(samples[0].smiles)} disabled={!ready}>{t.sample}</button>
          </div>
          <div className="playground-samples" aria-label={t.sample}>
            {samples.map((sample) => <button key={sample.label} className="sample-chip" onClick={() => { setSmiles(sample.smiles); updateStructure(sample.smiles); }}>{sample.label}</button>)}
          </div>
          {error && <p className="playground-error" role="alert">{error}</p>}
          <p className="playground-status" role="status">{ready ? `✓ ${t.ready}` : '…'}</p>
        </div>
        <div className="playground-preview">
          <div className="structure-preview" aria-label="2D chemical structure" dangerouslySetInnerHTML={{ __html: svg }} />
          {molecule && <p className="molecule-count">{molecule.atoms.length} {t.atoms} · {molecule.bonds.length} {t.bonds}</p>}
          <div className="playground-actions">
            <button onClick={() => navigator.clipboard?.writeText(canonicalSmiles)} disabled={!canonicalSmiles}>{t.exportSmiles}</button>
            <button className="secondary" onClick={() => download('molecule.svg', svg, 'image/svg+xml')} disabled={!svg}>{t.exportSvg}</button>
          </div>
        </div>
      </section>
      <footer className="playground-footer">Powered by Rust/WASM · <a href="https://github.com/kent-tokyo/chematic-draw">Open source</a></footer>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('playground-root')!).render(<Playground />);
