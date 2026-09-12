import React from 'react';

interface ReactionExecutorProps {
  isJapanese: boolean;
  theme: 'dark' | 'light';
  borderColor: string;
  bgColor: string;
  textColor: string;
  labelColor: string;
  accentColor: string;
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  smirksInput: string;
  onSmirksChange: (value: string) => void;
  multiReactantSmiles: string;
  onMultiReactantChange: (value: string) => void;
  onRunReaction: () => void;
  onRunMultiReactantReaction: () => void;
  reactionError: string;
}

/** UI-only reaction execution controls. Reaction orchestration stays in the parent. */
export function ReactionExecutor({
  isJapanese, theme, borderColor, bgColor, textColor, labelColor, accentColor,
  selectedTemplate, onTemplateChange, smirksInput, onSmirksChange,
  multiReactantSmiles, onMultiReactantChange, onRunReaction, onRunMultiReactantReaction, reactionError,
}: ReactionExecutorProps) {
  const inputBackground = theme === 'dark' ? '#0e1530' : '#ffffff';
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '4px', marginTop: '2px', border: `1px solid ${borderColor}`,
    borderRadius: '3px', backgroundColor: inputBackground, color: textColor, fontSize: '9px', boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${borderColor}`, marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>{isJapanese ? '反応を実行' : 'Execute Reaction'}</div>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>{isJapanese ? 'テンプレート' : 'Template'}</label>
        <select aria-label={isJapanese ? '反応テンプレート' : 'Reaction template'} value={selectedTemplate} onChange={(event) => onTemplateChange(event.target.value)} style={{ ...inputStyle, fontSize: '10px' }}>
          <option value="carboxylic_acid_to_amide">{isJapanese ? 'カルボン酸 → アミド' : 'Carboxylic acid → Amide'}</option>
          <option value="ester_to_acid">{isJapanese ? 'エステル → 酸' : 'Ester → Acid'}</option>
          <option value="ester_to_alcohol">{isJapanese ? 'エステル → アルコール' : 'Ester → Alcohol'}</option>
          <option value="alcohol_to_aldehyde">{isJapanese ? 'アルコール → アルデヒド' : 'Alcohol → Aldehyde'}</option>
          <option value="aldehyde_to_carboxylic_acid">{isJapanese ? 'アルデヒド → カルボン酸' : 'Aldehyde → Carboxylic acid'}</option>
          <option value="ketone_to_alcohol">{isJapanese ? 'ケトン → アルコール' : 'Ketone → Alcohol'}</option>
          <option value="custom">{isJapanese ? 'カスタムSMIRKS' : 'Custom SMIRKS'}</option>
        </select>
      </div>
      {selectedTemplate === 'custom' && (
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>{isJapanese ? 'SMIRKSパターン' : 'SMIRKS Pattern'}</label>
          <textarea placeholder={isJapanese ? '例：[C:1](=[O])[OH]>>[C:1](=[O])[NH2]' : 'e.g., [C:1](=[O])[OH]>>[C:1](=[O])[NH2]'} value={smirksInput} onChange={(event) => onSmirksChange(event.target.value)} style={{ ...inputStyle, minHeight: '50px', fontFamily: 'monospace' }} />
        </div>
      )}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>{isJapanese ? '複数反応物（SMILESを1行ずつ）' : 'Multiple reactants (one SMILES per line)'}</label>
        <textarea aria-label={isJapanese ? '複数反応物SMILES' : 'Multiple reactant SMILES'} data-testid="multi-reactant-smiles" placeholder={isJapanese ? '例：\nC\nN' : 'e.g.\nC\nN'} value={multiReactantSmiles} onChange={(event) => onMultiReactantChange(event.target.value)} style={{ ...inputStyle, minHeight: '48px', fontFamily: 'monospace' }} />
        <button type="button" onClick={onRunMultiReactantReaction} style={{ width: '100%', padding: '5px', marginTop: '3px', backgroundColor: 'transparent', color: accentColor, border: `1px solid ${accentColor}`, borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>
          {isJapanese ? '複数反応物で実行' : 'Run multi-reactant SMIRKS'}
        </button>
      </div>
      <button onClick={onRunReaction} style={{ width: '100%', padding: '6px', backgroundColor: accentColor, color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', marginBottom: reactionError ? '6px' : '0' }}>
        {isJapanese ? '反応を実行' : 'Execute Reaction'}
      </button>
      {reactionError && <div style={{ fontSize: '9px', color: '#f26d6d', padding: '4px', backgroundColor: 'rgba(242, 109, 109, 0.1)', borderRadius: '3px' }}>{reactionError}</div>}
    </div>
  );
}
