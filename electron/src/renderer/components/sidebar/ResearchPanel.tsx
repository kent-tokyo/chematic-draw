import React, { useEffect, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { PropertiesDto } from '../../store/types';
import { copyText } from '../../lib/clipboard';
import * as wasmBridge from '../../wasm/wasmBridge';
import { moleculeStructureKey } from '../../lib/moleculeKey';

type ResearchState = { sourceKey: string } & (
  | { status: 'idle' | 'loading' }
  | { status: 'success'; properties: PropertiesDto; iupacName: string; inchi: string; inchikey: string; identifierError?: string }
  | { status: 'error'; message: string }
);

export function ResearchPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const activeSidebarPanel = useUIStore((s) => s.activeSidebarPanel);
  const setStatus = useUIStore((s) => s.setStatus);
  const molecule = useMoleculeStore((s) => s.molecule);
  // Composition/connectivity fingerprint, not `molecule` itself — atom
  // count alone used to gate this effect, which missed any edit that
  // changes an atom's element/charge/isotope or a bond's order in place
  // (e.g. clicking an atom with an atom tool selected transmutes it
  // without changing atoms.length — see useCanvasInteraction.ts). The
  // canvas stays interactive while this tab is open, so that's reachable
  // without ever leaving the Research tab, and the displayed properties
  // silently kept describing the pre-edit molecule. Deliberately excludes
  // x/y position so dragging an atom (position-only, most frequent
  // molecule mutation while this tab could be open) doesn't re-trigger
  // the WASM property/IUPAC-name calls on every drag frame.
  const molKey = moleculeStructureKey(molecule);
  const [state, setState] = useState<ResearchState>({ status: 'idle', sourceKey: '' });
  const visibleState: ResearchState = state.sourceKey === molKey ? state : { status: 'loading', sourceKey: molKey };

  // Switch to 'loading' before computing so a failure on a newly-selected
  // molecule can never be mistaken for "no molecule loaded" (its own
  // distinct, correct message) or for the previous molecule's result.
  useEffect(() => {
    if (activeSidebarPanel !== 'research') return;
    try {
      const properties = wasmBridge.getProperties(molecule);
      let iupacName: string;
      try {
        iupacName = wasmBridge.getIupacName(molecule);
      } catch {
        iupacName = '(unavailable)';
      }
      let inchi = '';
      let inchikey = '';
      let identifierError: string | undefined;
      try {
        inchi = wasmBridge.molToInchi(molecule);
        inchikey = wasmBridge.inchiToInchikey(inchi);
      } catch (err) {
        identifierError = err instanceof Error ? err.message : String(err);
      }
      // This is the asynchronous boundary where the keyed WASM result enters React state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ status: 'success', properties, iupacName, inchi, inchikey, identifierError, sourceKey: molKey });
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : String(err), sourceKey: molKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [molKey, activeSidebarPanel]);

  const loading = visibleState.status === 'loading' || visibleState.status === 'idle';
  const properties = visibleState.status === 'success' ? visibleState.properties : null;
  const iupacName = visibleState.status === 'success' ? visibleState.iupacName : '';
  const inchi = visibleState.status === 'success' ? visibleState.inchi : '';
  const inchikey = visibleState.status === 'success' ? visibleState.inchikey : '';
  const identifierError = visibleState.status === 'success' ? visibleState.identifierError : undefined;

  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const bgColor = theme === 'dark' ? '#2f3a47' : '#f3f5f8';

  const lipinski = {
    mw: (properties?.molecular_weight ?? 0) <= 500,
    logp: (properties?.logp ?? 0) <= 5,
    hba: (properties?.hba ?? 0) <= 10,
    hbd: (properties?.hbd ?? 0) <= 5,
  };

  const lipinskiPassed = Object.values(lipinski).filter(Boolean).length;

  const handleCopyIdentifier = async (label: string, value: string) => {
    try {
      await copyText(value);
      setStatus(language === 'ja' ? `${label}をクリップボードにコピーしました` : `${label} copied to clipboard`);
    } catch {
      setStatus(language === 'ja' ? `${label}のコピーに失敗しました` : `${label} copy failed`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {loading && <div style={{ color: labelColor, fontSize: '12px' }}>{language === 'ja' ? '読み込み中…' : 'Loading...'}</div>}

      {!loading && properties && (
        <>
          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>{language === 'ja' ? 'IUPAC名' : 'IUPAC Name'}</label>
            <div
              style={{
                marginTop: '4px',
                fontSize: '10px',
                color: textColor,
                padding: '8px',
                backgroundColor: bgColor,
                borderRadius: '3px',
                wordWrap: 'break-word',
                minHeight: '32px',
              }}
            >
              {iupacName}
            </div>
          </div>

          <div data-testid="research-identifiers" style={{ padding: '10px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '4px' }}>{language === 'ja' ? '識別子' : 'Identifiers'}</div>
            <div style={{ fontSize: '9px', color: labelColor, marginBottom: '8px' }}>
              {language === 'ja' ? 'InChIはWASMブリッジで生成されます。純Rust実装による近似値のため、PubChem/RDKitと一致しない場合があります。' : 'InChI is generated by the WASM bridge. This pure-Rust value is an approximation and may not match PubChem/RDKit.'}
            </div>
            {identifierError ? (
              <div role="alert" style={{ fontSize: '10px', color: '#f26d6d' }}>
                {language === 'ja' ? `識別子の生成に失敗しました: ${identifierError}` : `Identifier generation failed: ${identifierError}`}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: labelColor }}>{language === 'ja' ? 'InChI（近似値）' : 'InChI (approximate)'}</div>
                  <div data-testid="research-inchi" style={{ fontSize: '9px', color: textColor, wordBreak: 'break-all', marginTop: '2px' }}>{inchi || 'Unavailable'}</div>
                  <button onClick={() => handleCopyIdentifier('InChI', inchi)} disabled={!inchi} style={{ marginTop: '4px', fontSize: '9px', padding: '3px 6px' }}>{language === 'ja' ? 'InChIをコピー' : 'Copy InChI'}</button>
                </div>
                <div>
                  <div style={{ fontSize: '9px', color: labelColor }}>{language === 'ja' ? 'InChIKey（派生値）' : 'InChIKey (derived)'}</div>
                  <div data-testid="research-inchikey" style={{ fontSize: '9px', color: textColor, wordBreak: 'break-all', marginTop: '2px' }}>{inchikey || 'Unavailable'}</div>
                  <button onClick={() => handleCopyIdentifier('InChIKey', inchikey)} disabled={!inchikey} style={{ marginTop: '4px', fontSize: '9px', padding: '3px 6px' }}>{language === 'ja' ? 'InChIKeyをコピー' : 'Copy InChIKey'}</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>MW</div>
              <div data-testid="research-mw" style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.molecular_weight?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>LogP</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.logp?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>TPSA</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.tpsa?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: labelColor }}>HBA/HBD</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: textColor }}>
                {properties.hba ?? 0} / {properties.hbd ?? 0}
              </div>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>{language === 'ja' ? 'Lipinskiの5則' : "Lipinski's Rule of 5"}</label>
            <div style={{ marginTop: '8px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: lipinski.mw ? '#58c97a' : '#f26d6d' }}>
                ✓ MW ≤ 500 ({properties.molecular_weight?.toFixed(0)})
              </div>
              <div style={{ color: lipinski.logp ? '#58c97a' : '#f26d6d' }}>
                ✓ LogP ≤ 5 ({properties.logp?.toFixed(1)})
              </div>
              <div style={{ color: lipinski.hba ? '#58c97a' : '#f26d6d' }}>
                ✓ HBA ≤ 10 ({properties.hba})
              </div>
              <div style={{ color: lipinski.hbd ? '#58c97a' : '#f26d6d' }}>
                ✓ HBD ≤ 5 ({properties.hbd})
              </div>
              <div style={{ marginTop: '4px', fontWeight: 'bold', color: textColor }}>
                Passed: {lipinskiPassed}/4 rules
              </div>
            </div>
          </div>
        </>
      )}

      {visibleState.status === 'error' && (
        <div style={{ color: '#f26d6d', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          プロパティを計算できませんでした
          <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.85 }}>{visibleState.message}</div>
        </div>
      )}

      {!loading && visibleState.status !== 'error' && !properties && (
        <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          No molecule loaded
        </div>
      )}
    </div>
  );
}
