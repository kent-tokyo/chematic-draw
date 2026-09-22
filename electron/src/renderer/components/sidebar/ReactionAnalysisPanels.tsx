import React from 'react';
import type { AtomMapping, GreenChemistryMetrics, ReactionClassification } from '../../store/types';
import type { ReactionDiagnostics } from '../../lib/reactionSchemeUtils';

interface ReactionAnalysisPanelsProps {
  hasSteps: boolean;
  classification: ReactionClassification | null;
  diagnostics: ReactionDiagnostics | null;
  atomMappings: AtomMapping | null;
  greenMetrics: GreenChemistryMetrics | null;
  atomLabelsVisible: boolean;
  mappingLinesVisible: boolean;
  onToggleAtomLabels: () => void;
  onToggleMappingLines: () => void;
  isJapanese: boolean;
  isDark: boolean;
  textColor: string;
  labelColor: string;
  borderColor: string;
  accentColor: string;
}

/** Read-only reaction-derived state; the scheme store remains the sole owner. */
export function ReactionAnalysisPanels({
  hasSteps, classification, diagnostics, atomMappings, greenMetrics, atomLabelsVisible, mappingLinesVisible,
  onToggleAtomLabels, onToggleMappingLines, isJapanese, isDark, textColor, labelColor, borderColor, accentColor,
}: ReactionAnalysisPanelsProps) {
  if (!hasSteps) return null;

  return (
    <>
      {classification && (
        <div data-workflow-stage="review" style={{ padding: '12px', backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd', border: `1px solid ${isDark ? '#2a5a7a' : '#90caf9'}`, borderRadius: '6px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#90caf9' : '#1976d2', marginBottom: '8px' }}>Reaction Structure</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: textColor, marginBottom: '6px' }}>
            {classification.type === 'multi_step' ? 'MULTI-STEP' : classification.type === 'single_step' ? 'SINGLE-STEP' : 'UNKNOWN'}
          </div>
          {classification.indicators.map((indicator, index) => <div key={index} style={{ fontSize: '9px', color: labelColor }}>• {indicator}</div>)}
        </div>
      )}

      {diagnostics && (
        <div role="status" aria-label="Reaction verification" data-workflow-stage="validation" style={{
          padding: '12px',
          backgroundColor: diagnostics.status === 'verified' ? (isDark ? '#1a3a2a' : '#e8f5e9') : (isDark ? '#3a2d1a' : '#fff8e1'),
          border: `1px solid ${diagnostics.status === 'verified' ? (isDark ? '#2a5a4a' : '#81c784') : (isDark ? '#6a4d22' : '#ffcc80')}`,
          borderRadius: '6px', marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: textColor, marginBottom: '6px' }}>
            {isJapanese ? '反応検証' : 'Reaction Verification'}: {diagnostics.status === 'verified' ? (isJapanese ? '検証済み' : 'VERIFIED') : (isJapanese ? '未検証' : 'NOT VERIFIED')}
          </div>
          <div data-testid="reaction-verification-scope" style={{ fontSize: '10px', color: labelColor, lineHeight: 1.4, marginBottom: '6px' }}>
            {isJapanese
              ? '注: これは入力された原子・電荷・マップ・中間体の整合性確認です。反応機構の正しさ、完全な化学量論、生成物予測は保証しません。'
              : 'Scope: checks authored atoms, charges, maps, and intermediate continuity only. It does not prove mechanism correctness, complete stoichiometry, or product prediction.'}
          </div>
          {diagnostics.issues.map((issue, index) => <div key={index} style={{ fontSize: '10px', color: diagnostics.status === 'verified' ? '#4caf50' : '#d88900', marginTop: '3px' }}>{diagnostics.status === 'verified' ? '✓' : '⚠'} {issue}</div>)}
          {diagnostics.mapping.unmatchedMapNumbers.length > 0 && <div style={{ fontSize: '10px', color: '#d88900', marginTop: '5px' }}>{isJapanese ? '一致しないマップ番号' : 'Unmatched map numbers'}: {diagnostics.mapping.unmatchedMapNumbers.join(', ')}</div>}
          {diagnostics.continuity.boundaries.length > 0 && (
            <div data-testid="reaction-integrity-continuity" style={{ marginTop: '6px', color: labelColor, fontSize: '10px' }}>
              {diagnostics.continuity.boundaries.map((boundary) => <div key={`${boundary.fromStep}-${boundary.toStep}`}>{isJapanese ? 'ステップ' : 'Step'} {boundary.fromStep} → {boundary.toStep}: {boundary.matchedMoleculeCount} {isJapanese ? '件の中間体' : `authored intermediate${boundary.matchedMoleculeCount === 1 ? '' : 's'}`}</div>)}
            </div>
          )}
          <div data-testid="reaction-integrity-steps" style={{ marginTop: '8px', borderTop: `1px solid ${borderColor}`, paddingTop: '6px' }}>
            {diagnostics.stepResults.map((step) => <div key={step.stepIndex} style={{ fontSize: '10px', color: labelColor, marginTop: '3px' }}>Step {step.stepIndex + 1}: atoms {step.atomBalance.balanced ? '✓' : '⚠'} · charge {step.chargeBalance.balanced ? '✓' : '⚠'} · mapping {step.mapping.complete ? '✓' : '⚠'}{step.mapping.mappedAtomCount > 0 ? ` (${step.mapping.mappedAtomCount} mapped)` : ''}</div>)}
          </div>
        </div>
      )}

      {atomMappings && atomMappings.totalMappedAtoms > 0 && (
        <div data-workflow-stage="mapping"><div style={{ padding: '12px', backgroundColor: isDark ? '#1e2a3a' : '#f9f9f9', border: `1px solid ${borderColor}`, borderRadius: '6px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>Atom Mapping ({atomMappings.totalMappedAtoms} atoms)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
            {[{ color: '#51cf66', label: 'Persistent' }, { color: '#4d8dff', label: 'New' }, { color: '#ff6b6b', label: 'Leaving' }, { color: '#888888', label: 'Spectator' }].map((item) => <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}><div style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }} /><span>{item.label}</span></div>)}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={onToggleAtomLabels} style={{ flex: 1, padding: '4px 6px', backgroundColor: atomLabelsVisible ? accentColor : borderColor, color: atomLabelsVisible ? 'white' : textColor, border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>{atomLabelsVisible ? '✓' : '○'} Labels</button>
            <button onClick={onToggleMappingLines} style={{ flex: 1, padding: '4px 6px', backgroundColor: mappingLinesVisible ? accentColor : borderColor, color: mappingLinesVisible ? 'white' : textColor, border: 'none', borderRadius: '2px', cursor: 'pointer', fontSize: '9px' }}>{mappingLinesVisible ? '✓' : '○'} Lines</button>
          </div>
          <div style={{ marginTop: '8px', maxHeight: '120px', overflowY: 'auto', fontSize: '9px' }}>{Array.from(atomMappings.entries).map(([id, entry]) => <div key={id} style={{ color: labelColor, marginBottom: '2px' }}><span style={{ fontWeight: 'bold' }}>{id}:</span> {entry.element}{entry.formalCharge > 0 ? '+' : entry.formalCharge < 0 ? '−' : ''}</div>)}</div>
        </div></div>
      )}

      {greenMetrics && (
        <div style={{ padding: '12px', backgroundColor: isDark ? '#1a3a2a' : '#e8f5e9', border: `1px solid ${isDark ? '#2a5a4a' : '#81c784'}`, borderRadius: '6px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#81c784' : '#2e7d32', marginBottom: '8px' }}>{isJapanese ? 'グリーンケミストリー指標' : 'Green Chemistry Metrics'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px' }}>
            <div><div style={{ fontWeight: 'bold', color: textColor }}>{isJapanese ? '原子効率' : 'Atom Economy'}</div><div style={{ fontSize: '13px', color: '#4caf50', fontWeight: 'bold' }}>{greenMetrics.atomEconomy}%</div></div>
            <div><div style={{ fontWeight: 'bold', color: textColor }}>E-Factor</div><div style={{ fontSize: '13px', color: '#ff9800', fontWeight: 'bold' }}>{greenMetrics.eFactorApprox}</div></div>
          </div>
        </div>
      )}
    </>
  );
}
