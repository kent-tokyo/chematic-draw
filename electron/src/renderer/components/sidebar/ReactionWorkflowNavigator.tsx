import React from 'react';

export type ReactionWorkflowStage = 'components' | 'mapping' | 'validation' | 'mechanism' | 'review' | 'export';

export interface ReactionWorkflowStageState {
  id: ReactionWorkflowStage;
  label: string;
  complete: boolean;
}

interface ReactionWorkflowNavigatorProps {
  stages: ReactionWorkflowStageState[];
  activeStage: ReactionWorkflowStage;
  isJapanese: boolean;
  isDark: boolean;
  textColor: string;
  labelColor: string;
  borderColor: string;
  inputBg: string;
  accentColor: string;
  onSelect: (stage: ReactionWorkflowStage) => void;
}

/** Presentational navigation; ReactionPanel owns selection and scrolling. */
export function ReactionWorkflowNavigator({
  stages, activeStage, isJapanese, isDark, textColor, labelColor, borderColor, inputBg, accentColor, onSelect,
}: ReactionWorkflowNavigatorProps) {
  return (
    <nav
      aria-label={isJapanese ? '反応ワークフロー' : 'Reaction workflow'}
      data-testid="reaction-workflow"
      style={{ padding: '8px', backgroundColor: isDark ? '#202b38' : '#f7f9fc', border: `1px solid ${borderColor}`, borderRadius: '6px' }}
    >
      <div style={{ fontSize: '10px', color: labelColor, marginBottom: '6px' }}>
        {isJapanese ? '反応の進め方' : 'Reaction workflow'}
      </div>
      <ol style={{ display: 'flex', gap: '3px', listStyle: 'none', padding: 0, margin: 0, overflowX: 'auto' }}>
        {stages.map((stage, index) => {
          const isActive = stage.id === activeStage;
          return (
            <li key={stage.id} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
              <button
                type="button"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${index + 1}. ${stage.label}${stage.complete ? (isJapanese ? '（完了）' : ' (complete)') : ''}`}
                onClick={() => onSelect(stage.id)}
                style={{
                  padding: '4px 6px', border: `1px solid ${isActive ? accentColor : borderColor}`, borderRadius: '4px',
                  backgroundColor: isActive ? accentColor : stage.complete ? (isDark ? '#254936' : '#e8f5e9') : inputBg,
                  color: isActive ? 'white' : textColor, fontSize: '9px', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {stage.complete ? '✓ ' : `${index + 1}. `}{stage.label}
              </button>
              {index < stages.length - 1 && <span aria-hidden="true" style={{ color: labelColor, padding: '0 1px', fontSize: '9px' }}>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
