import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { assignCipDescriptors, enumerateStereoisomers, StereoisomerResult, StereoAssignmentDto } from '../../lib/advancedFeatures';
import * as wasmBridge from '../../wasm/wasmBridge';

export function StereoisomerPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const isJapanese = language === 'ja';
  const isChinese = language === 'zh';
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setStatus = useUIStore((s) => s.setStatus);

  const [results, setResults] = useState<StereoisomerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<StereoAssignmentDto[] | null>(null);

  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const handleEnumerate = async () => {
    try {
      setLoading(true);
      const result = enumerateStereoisomers(molecule);
      setResults(result);
      setStatus(language === 'ja' ? `立体異性体が${result.count}件見つかりました` : `Found ${result.count} stereoisomer(s)`);
    } catch (err) {
      setStatus(language === 'ja' ? `列挙に失敗しました: ${(err as Error).message}` : `Enumeration failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCip = () => {
    try {
      setAssignments(assignCipDescriptors(molecule));
      setStatus(language === 'ja' ? 'CIP割り当てが完了しました。不確定な中心は除外されています' : 'CIP assignment complete; ambiguous centers are omitted');
    } catch (err) {
      setStatus(language === 'ja' ? `CIP割り当てに失敗しました: ${(err as Error).message}` : `CIP assignment failed: ${(err as Error).message}`);
    }
  };

  const handleInvert = (atomId: number) => {
    try {
      pushUndo();
      const updated = wasmBridge.invertStereocenter(molecule, atomId);
      setMolecule(updated);
      setAssignments(assignCipDescriptors(updated));
      setStatus(isJapanese ? `原子${atomId}の立体配置を反転しました` : isChinese ? `已反转原子 ${atomId} 的立体构型` : `Inverted stereochemistry at atom ${atomId}`);
    } catch (err) {
      setStatus(isJapanese ? `立体配置の反転に失敗しました: ${(err as Error).message}` : isChinese ? `反转立体构型失败: ${(err as Error).message}` : `Stereochemistry inversion failed: ${(err as Error).message}`);
    }
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: labelColor }}>
        {isJapanese ? 'この分子で可能な立体異性体を列挙します。' : isChinese ? '枚举此分子的所有可能立体异构体。' : 'Enumerate all possible stereoisomers for this molecule.'}
      </div>

      <button
        onClick={handleEnumerate}
        disabled={loading || molecule.atoms.length === 0}
        style={{
          padding: '8px',
          backgroundColor: accentColor,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: loading || molecule.atoms.length === 0 ? 0.5 : 1,
        }}
      >
        {loading ? (isJapanese ? '列挙中…' : isChinese ? '枚举中…' : 'Enumerating...') : (isJapanese ? '立体異性体を列挙' : isChinese ? '枚举立体异构体' : 'Enumerate Stereoisomers')}
      </button>

      <button
        onClick={handleAssignCip}
        disabled={molecule.atoms.length === 0}
        style={{ padding: '8px', backgroundColor: 'transparent', color: accentColor, border: `1px solid ${accentColor}`, borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
      >
        {isJapanese ? 'CIP記述子を割り当て' : isChinese ? '分配CIP描述符' : 'Assign CIP descriptors'}
      </button>

      {assignments && (
        <div aria-live="polite" style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', padding: '8px', color: textColor, fontSize: '10px' }}>
          <strong>{isJapanese ? '検証済み記述子' : isChinese ? '已验证描述符' : 'Verified descriptors'}</strong>
          {assignments.length === 0 ? <div style={{ color: labelColor, marginTop: '6px' }}>{isJapanese ? '明確なR/S/E/Z割り当てはありません。' : isChinese ? '没有明确的R/S/E/Z分配。' : 'No unambiguous R/S/E/Z assignments.'}</div> : (
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
              {assignments.map((assignment) => <li key={`${assignment.atom_id}-${assignment.code}`} style={{ marginBottom: '4px' }}>
                <span>{isJapanese ? `原子${assignment.atom_id}` : isChinese ? `原子 ${assignment.atom_id}` : `Atom ${assignment.atom_id}`}: {assignment.code}</span>
                {['R', 'S', 'E', 'Z'].includes(assignment.code) && <button type="button" onClick={() => handleInvert(assignment.atom_id)} aria-label={isJapanese ? `原子${assignment.atom_id}の立体配置を反転` : isChinese ? `反转原子 ${assignment.atom_id} 的立体构型` : `Invert stereochemistry at atom ${assignment.atom_id}`} style={{ marginLeft: '6px', padding: '2px 5px', border: `1px solid ${accentColor}`, borderRadius: '3px', background: 'transparent', color: accentColor, cursor: 'pointer', fontSize: '9px' }}>{isJapanese ? '反転' : isChinese ? '反转' : 'Invert'}</button>}
              </li>)}
            </ul>
          )}
        </div>
      )}

      {results && (
        <div style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '8px', backgroundColor: inputBg, borderBottom: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor }}>
              {isJapanese ? `立体異性体${results.count}件` : isChinese ? `找到${results.count}个立体异构体` : `Found ${results.count} Isomer${results.count !== 1 ? 's' : ''}`}
            </div>
          </div>

          {/* List */}
          <div style={{ padding: '8px' }}>
            {results.stereoisomers.map((iso, idx) => (
              <div
                key={idx}
                style={{
                  padding: '6px',
                  marginBottom: '4px',
                  backgroundColor: inputBg,
                  borderRadius: '3px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '10px', color: textColor }}>{isJapanese ? `異性体${idx + 1}` : isChinese ? `异构体 ${idx + 1}` : `Isomer ${idx + 1}`}</div>
                <button
                  onClick={() => {
                    pushUndo();
                    setMolecule(iso);
                  }}
                  style={{
                    padding: '3px 8px',
                    backgroundColor: accentColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px',
                  }}
                >
                  {isJapanese ? '表示' : isChinese ? '查看' : 'View'}
                </button>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ padding: '8px', borderTop: `1px solid ${borderColor}`, fontSize: '9px', color: labelColor }}>
            {isJapanese ? `${results.count}件の立体異性体が見つかりました` : isChinese ? `找到${results.count}个立体异构体` : results.description}
          </div>
        </div>
      )}
    </div>
  );
}
