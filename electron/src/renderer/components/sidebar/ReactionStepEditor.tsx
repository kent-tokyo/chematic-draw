import React from 'react';
import type { MechanismStep, ReactionCondition } from '../../store/types';

type ComponentRole = 'reactant' | 'product' | 'agent';
type DraftSetter = React.Dispatch<React.SetStateAction<Record<string, string>>>;

interface ReactionStepEditorProps {
  steps: MechanismStep[];
  expandedStepId: string | null;
  onExpandedStepIdChange: (stepId: string | null) => void;
  isJapanese: boolean;
  theme: string;
  borderColor: string;
  inputBg: string;
  textColor: string;
  labelColor: string;
  accentColor: string;
  agentDrafts: Record<string, string>;
  coefficientDrafts: Record<string, string>;
  componentIdDrafts: Record<string, string>;
  setAgentDrafts: DraftSetter;
  setCoefficientDrafts: DraftSetter;
  setComponentIdDrafts: DraftSetter;
  onMoveStep: (index: number, direction: -1 | 1) => void;
  onArrowTypeChange: (stepId: string, arrowType: 'single' | 'double' | 'equilibrium' | 'retro') => void;
  onSuggestCoefficients: (step: MechanismStep) => void;
  onCommitCoefficients: (stepId: string, role: 'reactant' | 'product', value: string) => void;
  onAddAgent: (stepId: string) => Promise<void> | void;
  onCommitComponentIds: (stepId: string, role: ComponentRole, value: string) => void;
  onUpdateConditions: (stepId: string, conditions: Partial<ReactionCondition>) => void;
  onRemoveStep: (stepId: string) => void;
}

interface ConditionFieldProps {
  label: string;
  placeholder: string;
  value: string | number | undefined;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  onChange: (value: string) => void;
  isDark: boolean;
  borderColor: string;
  textColor: string;
  labelColor: string;
}

function ConditionField({ label, placeholder, value, type = 'text', min, max, onChange, isDark, borderColor, textColor, labelColor }: ConditionFieldProps) {
  return <div style={{ marginBottom: '8px' }}>
    <label style={{ fontSize: '10px', color: labelColor }}>{label}</label>
    <input type={type} min={min} max={max} placeholder={placeholder} value={value ?? ''} onChange={(event) => onChange(event.target.value)} style={{ width: '100%', padding: '4px', marginTop: '2px', border: `1px solid ${borderColor}`, borderRadius: '3px', backgroundColor: isDark ? '#0e1530' : '#ffffff', color: textColor, fontSize: '10px', boxSizing: 'border-box' }} />
  </div>;
}

/** Controlled step-editing form. Scheme mutations are provided by the parent. */
export function ReactionStepEditor(props: ReactionStepEditorProps) {
  const { steps, expandedStepId, onExpandedStepIdChange, isJapanese, theme, borderColor, inputBg, textColor, labelColor, accentColor, agentDrafts, coefficientDrafts, componentIdDrafts, setAgentDrafts, setCoefficientDrafts, setComponentIdDrafts, onMoveStep, onArrowTypeChange, onSuggestCoefficients, onCommitCoefficients, onAddAgent, onCommitComponentIds, onUpdateConditions, onRemoveStep } = props;
  const isDark = theme === 'dark';
  const fieldStyle = { width: '100%', padding: '4px', marginTop: '2px', border: `1px solid ${borderColor}`, borderRadius: '3px', backgroundColor: isDark ? '#0e1530' : '#ffffff', color: textColor, fontSize: '10px', boxSizing: 'border-box' } as const;

  return <div data-workflow-stage="components" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
    {steps.length === 0 ? <div style={{ fontSize: '11px', color: labelColor, textAlign: 'center', padding: '16px' }}>{isJapanese ? 'ステップがありません。追加して始めてください。' : 'No steps. Add one to start.'}</div> : steps.map((step, index) => {
      const expanded = expandedStepId === step.id;
      return <div key={step.id} style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
        <button onClick={() => onExpandedStepIdChange(expanded ? null : step.id)} style={{ width: '100%', padding: '8px', backgroundColor: expanded ? '#3a4a57' : inputBg, color: textColor, border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>{isJapanese ? 'ステップ' : 'Step'} {index + 1}</span><span>{expanded ? '▼' : '▶'}</span></button>
        <div style={{ display: 'flex', gap: '3px', padding: '4px 8px', backgroundColor: inputBg, borderTop: `1px solid ${borderColor}` }}>
          <button aria-label={isJapanese ? `ステップ${index + 1}を上へ移動` : `Move step ${index + 1} up`} disabled={index === 0} onClick={() => onMoveStep(index, -1)} style={{ padding: '2px 6px', fontSize: '9px', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.5 : 1 }}>↑</button>
          <button aria-label={isJapanese ? `ステップ${index + 1}を下へ移動` : `Move step ${index + 1} down`} disabled={index === steps.length - 1} onClick={() => onMoveStep(index, 1)} style={{ padding: '2px 6px', fontSize: '9px', cursor: index === steps.length - 1 ? 'not-allowed' : 'pointer', opacity: index === steps.length - 1 ? 0.5 : 1 }}>↓</button>
          <span style={{ fontSize: '9px', color: labelColor, alignSelf: 'center' }}>{isJapanese ? '順序' : 'Order'}</span>
        </div>
        {expanded && <div style={{ padding: '8px', backgroundColor: isDark ? '#1e2530' : '#f9f9f9', borderTop: `1px solid ${borderColor}` }}>
          <div style={{ marginBottom: '8px' }}><label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>{isJapanese ? '矢印の種類' : 'Arrow Type'}</label><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>{(['single', 'double', 'equilibrium', 'retro'] as const).map((type) => <button key={type} onClick={() => onArrowTypeChange(step.id, type)} style={{ padding: '4px', backgroundColor: step.arrowType === type ? accentColor : borderColor, color: step.arrowType === type ? 'white' : textColor, border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '9px' }}>{isJapanese ? ({ single: '単結合', double: '二重結合', equilibrium: '平衡', retro: '逆反応' }[type]) : type}</button>)}</div></div>
          <div style={{ marginBottom: '8px' }}><label style={{ fontSize: '10px', color: labelColor, display: 'block' }}>{isJapanese ? '係数（反応物,製品）' : 'Coefficients (reactants, products)'}</label><button type="button" onClick={() => onSuggestCoefficients(step)} style={{ width: '100%', padding: '4px', marginTop: '3px', border: `1px solid ${accentColor}`, borderRadius: '3px', background: 'transparent', color: accentColor, fontSize: '9px', cursor: 'pointer' }}>{isJapanese ? '係数を提案' : 'Suggest coefficients'}</button>
            <input data-testid={`reaction-step-${index + 1}-temperature`} type="text" aria-label={isJapanese ? `ステップ${index + 1}の反応物係数` : `Step ${index + 1} reactant coefficients`} placeholder="1, 0.5" value={coefficientDrafts[`${step.id}:reactant`] ?? (step.reactantCoefficients ?? []).join(', ')} onChange={(event) => setCoefficientDrafts((drafts) => ({ ...drafts, [`${step.id}:reactant`]: event.target.value }))} onBlur={(event) => onCommitCoefficients(step.id, 'reactant', event.target.value)} style={fieldStyle} />
            <input type="text" aria-label={isJapanese ? `ステップ${index + 1}の製品係数` : `Step ${index + 1} product coefficients`} placeholder="1, 1.25" value={coefficientDrafts[`${step.id}:product`] ?? (step.productCoefficients ?? []).join(', ')} onChange={(event) => setCoefficientDrafts((drafts) => ({ ...drafts, [`${step.id}:product`]: event.target.value }))} onBlur={(event) => onCommitCoefficients(step.id, 'product', event.target.value)} style={fieldStyle} />
          </div>
          <div style={{ marginBottom: '8px' }}><label style={{ fontSize: '10px', color: labelColor, display: 'block' }}>{isJapanese ? '反応剤（SMILES）' : 'Agents (SMILES)'}</label><div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}><input data-testid={`reaction-step-${index + 1}-agent`} type="text" aria-label={isJapanese ? `ステップ${index + 1}の反応剤SMILES` : `Step ${index + 1} agent SMILES`} placeholder="O, CC(=O)O" value={agentDrafts[step.id] ?? ''} onChange={(event) => setAgentDrafts((drafts) => ({ ...drafts, [step.id]: event.target.value }))} style={{ ...fieldStyle, flex: 1, marginTop: 0 }} /><button data-testid={`reaction-step-${index + 1}-add-agent`} onClick={() => void onAddAgent(step.id)} style={{ padding: '4px 6px', fontSize: '9px' }}>{isJapanese ? '追加' : 'Add'}</button></div>{(step.agents?.length ?? 0) > 0 && <div style={{ marginTop: '3px', fontSize: '9px', color: labelColor }}>{isJapanese ? `登録済み: ${step.agents?.length}件` : `Added: ${step.agents?.length} agent(s)`}</div>}</div>
          <div style={{ marginBottom: '8px' }}><label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>{isJapanese ? 'コンポーネント識別子（カンマ区切り）' : 'Component IDs (comma-separated)'}</label>{([['reactant', step.reactantComponentIds ?? [], step.reactants.length, isJapanese ? '反応物' : 'Reactants'], ['product', step.productComponentIds ?? [], step.products.length, isJapanese ? '生成物' : 'Products'], ['agent', step.agentComponentIds ?? [], (step.agents ?? []).length, isJapanese ? '反応剤' : 'Agents']] as const).map(([role, ids, expectedCount, label]) => <input key={role} type="text" aria-label={isJapanese ? `ステップ${index + 1}の${label}コンポーネント識別子` : `Step ${index + 1} ${label.toLowerCase()} component IDs`} placeholder={expectedCount > 0 ? (isJapanese ? `${expectedCount}件必要` : `${expectedCount} value(s) required`) : (isJapanese ? 'なし' : 'none')} value={componentIdDrafts[`${step.id}:${role}`] ?? ids.join(', ')} onChange={(event) => setComponentIdDrafts((drafts) => ({ ...drafts, [`${step.id}:${role}`]: event.target.value }))} onBlur={(event) => onCommitComponentIds(step.id, role, event.target.value)} style={fieldStyle} />)}</div>
          <ConditionField label={isJapanese ? '温度' : 'Temperature'} placeholder={isJapanese ? '例：RT、100°C、還流' : 'e.g., RT, 100°C, reflux'} value={step.conditions?.temperature} onChange={(value) => onUpdateConditions(step.id, { temperature: value })} isDark={isDark} borderColor={borderColor} textColor={textColor} labelColor={labelColor} />
          <ConditionField label={isJapanese ? '溶媒' : 'Solvent'} placeholder={isJapanese ? '例：DMF、THF、H2O' : 'e.g., DMF, THF, H2O'} value={step.conditions?.solvent} onChange={(value) => onUpdateConditions(step.id, { solvent: value })} isDark={isDark} borderColor={borderColor} textColor={textColor} labelColor={labelColor} />
          <ConditionField label={isJapanese ? '触媒' : 'Catalyst'} placeholder={isJapanese ? '例：Pd/C、Et3N' : 'e.g., Pd/C, Et3N'} value={step.conditions?.catalyst} onChange={(value) => onUpdateConditions(step.id, { catalyst: value })} isDark={isDark} borderColor={borderColor} textColor={textColor} labelColor={labelColor} />
          <ConditionField label={isJapanese ? '時間' : 'Time'} placeholder={isJapanese ? '例：2時間、一晩' : 'e.g., 2h, overnight'} value={step.conditions?.time} onChange={(value) => onUpdateConditions(step.id, { time: value })} isDark={isDark} borderColor={borderColor} textColor={textColor} labelColor={labelColor} />
          <ConditionField label={isJapanese ? '収率（%）' : 'Yield (%)'} placeholder={isJapanese ? '0〜100' : '0-100'} type="number" min={0} max={100} value={step.conditions?.yield} onChange={(value) => onUpdateConditions(step.id, { yield: value ? parseInt(value, 10) : undefined })} isDark={isDark} borderColor={borderColor} textColor={textColor} labelColor={labelColor} />
          <button onClick={() => onRemoveStep(step.id)} style={{ width: '100%', padding: '4px', backgroundColor: '#d94545', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '10px', marginTop: '4px' }}>{isJapanese ? 'ステップを削除' : 'Remove Step'}</button>
        </div>}
      </div>;
    })}
  </div>;
}
