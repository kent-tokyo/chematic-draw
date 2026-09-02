import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useMechanismStore } from '../../store/mechanismStore';
import { useReactionSchemeStore } from '../../store/reactionSchemeStore';
import { ArrowTypeDialog } from '../modals/ArrowTypeDialog';
import { useElectronSuggestions } from '../../hooks/useElectronSuggestions';
import { ArrowSuggestion } from '../../store/types';
import { MechanismArrow } from '../../store/types';

export function MechanismPanel() {
  const theme = useUIStore((s) => s.theme);
  const setStatus = useUIStore((s) => s.setStatus);
  const molecule = useMoleculeStore((s) => s.molecule);

  const mechanismArrows = useMechanismStore((s) => s.arrows);
  const arrowSelectionMode = useMechanismStore((s) => s.arrowSelectionMode);
  const pendingSourceAtomId = useMechanismStore((s) => s.pendingSourceAtomId);
  const pendingSinkAtomId = useMechanismStore((s) => s.pendingSinkAtomId);
  const suggestions = useMechanismStore((s) => s.suggestions);
  const suggestionsVisible = useMechanismStore((s) => s.suggestionsVisible);

  const scheme = useReactionSchemeStore((s) => s.scheme);
  const updateCurrentStepArrows = useReactionSchemeStore((s) => s.updateCurrentStepArrows);
  const viewMode = useReactionSchemeStore((s) => s.scheme?.viewMode);
  const setViewMode = useReactionSchemeStore((s) => s.setViewMode);

  useElectronSuggestions();

  const [showArrowTypeDialog, setShowArrowTypeDialog] = useState(false);
  const [selectedArrowId, setSelectedArrowIdLocal] = useState<string | null>(null);

  // Watch for sink atom selection and show dialog
  useEffect(() => {
    if (arrowSelectionMode === 'awaitingSink' && pendingSinkAtomId !== null) {
      setShowArrowTypeDialog(true);
    }
  }, [pendingSinkAtomId, arrowSelectionMode]);

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1e1e1e' : '#ffffff';
  const borderColor = isDark ? '#444' : '#ddd';
  const textColor = isDark ? '#d8deea' : '#333';
  const labelColor = isDark ? '#999' : '#666';
  const accentColor = '#4d8dff';
  const deleteColor = '#d94545';

  const handleStartArrow = () => {
    if (arrowSelectionMode !== 'idle') {
      useMechanismStore.getState().cancelArrowSelection();
      setStatus('Arrow selection cancelled');
    } else {
      useMechanismStore.getState().startArrowSelection();
      setStatus('Click source atom (electron source)');
    }
  };

  const handleRemoveArrow = (arrowId: string) => {
    useMechanismStore.getState().removeArrow(arrowId);
    setStatus('Arrow removed');
  };

  const handleChangeArrowType = (arrowId: string, type: 'forward' | 'retro' | 'resonance') => {
    useMechanismStore.getState().updateArrow(arrowId, { type });
    setStatus(`Arrow type changed to ${type}`);
  };

  const handleLabelChange = (arrowId: string, newLabel: string) => {
    useMechanismStore.getState().updateArrow(arrowId, { label: newLabel });
  };

  const handleCreateFromSuggestion = (suggestion: ArrowSuggestion) => {
    // Set both source and sink atoms directly
    useMechanismStore.getState().setPendingSourceAtomId(suggestion.sourceAtomId);
    useMechanismStore.getState().setPendingSinkAtomId(suggestion.sinkAtomId);
    // Show arrow type dialog
    setShowArrowTypeDialog(true);
  };

  const handleDismissSuggestion = (index: number) => {
    useMechanismStore.getState().dismissSuggestion(index);
  };

  const getAtomLabel = (atomId: number) => {
    const atom = molecule.atoms.find((a) => a.id === atomId);
    return atom ? atom.element : '?';
  };

  const handleArrowTypeSelected = (type: 'forward' | 'retro' | 'resonance') => {
    if (pendingSinkAtomId !== null && pendingSourceAtomId !== null) {
      const newArrow: MechanismArrow = {
        id: `arrow-${Date.now()}`,
        sourceAtomId: pendingSourceAtomId,
        sinkAtomId: pendingSinkAtomId,
        type,
        stepId: scheme && scheme.steps.length > 0 ? scheme.steps[scheme.currentStepIndex].id : '',
      };

      // Always add to the interactive mechanism store — the canvas, hit-testing,
      // electron suggestions, and this panel's own list/edit/remove UI all read
      // from here. A reaction scheme existing must never make an arrow invisible.
      useMechanismStore.getState().addArrow(newArrow);
      useMechanismStore.getState().cancelArrowSelection();

      // Best-effort mirror into the current scheme step too, so step arrow
      // counts (classification/export) reflect it. Not kept in sync on step
      // navigation — see ROADMAP "Discovered Work" note.
      if (scheme && scheme.steps.length > 0) {
        const currentArrows = scheme.steps[scheme.currentStepIndex].arrows;
        updateCurrentStepArrows([...currentArrows, newArrow]);
      }

      setShowArrowTypeDialog(false);
      setStatus(`Arrow added (${type})`);
    }
  };

  const getArrowTypeLabel = (type: 'forward' | 'retro' | 'resonance'): string => {
    const labels = { forward: '→', retro: '⇌', resonance: '↔' };
    return labels[type];
  };

  return (
    <div
      style={{
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        height: '100%',
        overflow: 'auto',
      }}
    >
      {/* View Mode Toggle - only show when scheme exists */}
      {scheme && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginBottom: '12px',
            borderBottom: `1px solid ${borderColor}`,
            paddingBottom: '12px',
          }}
        >
          <button
            onClick={() => setViewMode('step')}
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: viewMode === 'step' ? accentColor : borderColor,
              color: viewMode === 'step' ? 'white' : textColor,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'step') {
                (e.target as HTMLButtonElement).style.backgroundColor = isDark ? '#3a5a7a' : '#d0e8ff';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'step') {
                (e.target as HTMLButtonElement).style.backgroundColor = borderColor;
              }
            }}
          >
            📋 Step-by-Step
          </button>
          <button
            onClick={() => setViewMode('scheme')}
            style={{
              flex: 1,
              padding: '6px 8px',
              backgroundColor: viewMode === 'scheme' ? accentColor : borderColor,
              color: viewMode === 'scheme' ? 'white' : textColor,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              if (viewMode !== 'scheme') {
                (e.target as HTMLButtonElement).style.backgroundColor = isDark ? '#3a5a7a' : '#d0e8ff';
              }
            }}
            onMouseLeave={(e) => {
              if (viewMode !== 'scheme') {
                (e.target as HTMLButtonElement).style.backgroundColor = borderColor;
              }
            }}
          >
            📊 Full Scheme
          </button>
        </div>
      )}

      <div style={{ fontSize: '12px', color: labelColor }}>
        {scheme && scheme.steps.length > 0 ? (
          <div style={{ fontSize: '12px', color: labelColor, marginBottom: '8px' }}>
            Drawing mechanism arrows for Step {scheme.currentStepIndex + 1} of {scheme.steps.length}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: labelColor }}>
            Draw electron flow arrows showing reaction mechanisms.
          </div>
        )}
      </div>

      {scheme && viewMode === 'scheme' && (
        <div
          style={{
            fontSize: '11px',
            color: labelColor,
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd',
            borderRadius: '4px',
            borderLeft: `3px solid ${accentColor}`,
          }}
        >
          📊 Viewing full reaction scheme. Click a step to edit details.
        </div>
      )}

      {/* Selection Status */}
      {arrowSelectionMode === 'awaitingSink' && (
        <div
          style={{
            padding: '8px',
            backgroundColor: isDark ? '#ffaa0033' : '#fff8e1',
            border: '1px solid #ffaa00',
            borderRadius: '4px',
            fontSize: '11px',
            color: '#ffaa00',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Waiting for sink atom...</span>
          <button
            onClick={() => {
              useMechanismStore.getState().cancelArrowSelection();
              setStatus('Arrow selection cancelled');
            }}
            style={{
              padding: '2px 6px',
              backgroundColor: '#ffaa00',
              color: '#000',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* Suggested Electron Flows Section */}
      {suggestionsVisible && suggestions.length > 0 && (
        <div
          style={{
            padding: '10px',
            backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd',
            border: `1px solid ${isDark ? '#2a5a7a' : '#90caf9'}`,
            borderRadius: '6px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              color: isDark ? '#90caf9' : '#1976d2',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>💡</span> Suggested Electron Flows
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {suggestions.map((suggestion, index) => {
              const sourceAtom = molecule.atoms.find((a) => a.id === suggestion.sourceAtomId);
              const sinkAtom = molecule.atoms.find((a) => a.id === suggestion.sinkAtomId);
              const confidencePercent = Math.round(suggestion.confidence * 100);

              return (
                <div
                  key={index}
                  style={{
                    padding: '8px',
                    backgroundColor: isDark ? '#2a4a5a' : '#ffffff',
                    border: `1px solid ${isDark ? '#3a6a8a' : '#bbdefb'}`,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    gap: '8px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ color: textColor, fontWeight: '500' }}>
                      {sourceAtom?.element || '?'} → {sinkAtom?.element || '?'}
                    </span>
                    <div
                      style={{
                        fontSize: '9px',
                        color: labelColor,
                        marginTop: '2px',
                      }}
                    >
                      Confidence: {confidencePercent}%
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleCreateFromSuggestion(suggestion)}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#45a049';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#4CAF50';
                      }}
                    >
                      Create
                    </button>
                    <button
                      onClick={() => handleDismissSuggestion(index)}
                      style={{
                        padding: '3px 6px',
                        backgroundColor: isDark ? '#444' : '#ddd',
                        color: textColor,
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arrow List Header */}
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginTop: '8px' }}>
        Arrows ({mechanismArrows.length})
      </div>

      {/* Arrow List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
      >
        {/* Arrows for current step */}
        {mechanismArrows.length > 0 && (
          <div style={{ fontSize: '10px', color: labelColor, marginBottom: '4px', fontWeight: 'bold' }}>
            {scheme ? `Step ${scheme.currentStepIndex + 1} Arrows:` : 'Mechanism Arrows:'}
          </div>
        )}
        {mechanismArrows.length === 0 ? (
          <div
            style={{
              fontSize: '11px',
              color: labelColor,
              textAlign: 'center',
              padding: '12px',
              backgroundColor: isDark ? '#2f3a47' : '#f9f9f9',
              borderRadius: '4px',
              border: `1px dashed ${borderColor}`,
            }}
          >
            No arrows yet
          </div>
        ) : (
          mechanismArrows.map((arrow) => {
            const isSelected = selectedArrowId === arrow.id;

            return (
              <div
                key={arrow.id}
                style={{
                  padding: '8px',
                  border: `1px solid ${isSelected ? accentColor : borderColor}`,
                  borderRadius: '4px',
                  backgroundColor: isDark ? '#2f3a47' : '#f9f9f9',
                  cursor: 'pointer',
                }}
              >
                {/* Main arrow row - clickable to select */}
                <div
                  onClick={() => setSelectedArrowIdLocal(isSelected ? null : arrow.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: textColor,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = isDark ? '#3a4f62' : '#f0f0f0';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <span>
                    {getAtomLabel(arrow.sourceAtomId)} {getArrowTypeLabel(arrow.type)} {getAtomLabel(arrow.sinkAtomId)}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select
                      value={arrow.type}
                      onChange={(e) => {
                        handleChangeArrowType(arrow.id, e.target.value as any);
                        e.stopPropagation();
                      }}
                      style={{
                        padding: '2px 4px',
                        fontSize: '9px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '2px',
                        backgroundColor: bgColor,
                        color: textColor,
                        cursor: 'pointer',
                      }}
                    >
                      <option value="forward">→</option>
                      <option value="retro">⇌</option>
                      <option value="resonance">↔</option>
                    </select>
                    <button
                      onClick={(e) => {
                        handleRemoveArrow(arrow.id);
                        e.stopPropagation();
                      }}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: deleteColor,
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '9px',
                        fontWeight: 'bold',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Expanded details when selected */}
                {isSelected && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: `1px solid ${borderColor}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={{ fontSize: '10px', color: labelColor, marginBottom: '6px', fontWeight: 'bold' }}>
                      Label (optional):
                    </div>
                    <input
                      type="text"
                      value={arrow.label || ''}
                      onChange={(e) => handleLabelChange(arrow.id, e.target.value)}
                      placeholder="e.g., H3C+, OH−, H2O"
                      style={{
                        width: '100%',
                        padding: '4px 6px',
                        fontSize: '11px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '2px',
                        backgroundColor: bgColor,
                        color: textColor,
                        boxSizing: 'border-box',
                        marginBottom: '6px',
                      }}
                    />
                    <div style={{ fontSize: '9px', color: labelColor, fontStyle: 'italic' }}>
                      Appears on arrow in diagram
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Arrow Button */}
      <button
        onClick={handleStartArrow}
        style={{
          padding: '8px',
          backgroundColor: arrowSelectionMode === 'awaitingSink' ? '#ff8800' : accentColor,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (arrowSelectionMode !== 'awaitingSink') {
            (e.target as HTMLButtonElement).style.backgroundColor = '#3d7de5';
          }
        }}
        onMouseLeave={(e) => {
          if (arrowSelectionMode !== 'awaitingSink') {
            (e.target as HTMLButtonElement).style.backgroundColor = accentColor;
          }
        }}
      >
        {arrowSelectionMode === 'awaitingSink' ? '↓ AWAITING CLICK' : '+ Add Arrow'}
      </button>

      {/* Info Section */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '12px',
          borderTop: `1px solid ${borderColor}`,
          fontSize: '10px',
          color: labelColor,
        }}
      >
        <div style={{ marginBottom: '6px', fontWeight: 'bold' }}>Arrow types:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>→ <strong>Forward:</strong> Standard electron flow</div>
          <div>⇌ <strong>Retro:</strong> Reverse/equilibrium</div>
          <div>↔ <strong>Resonance:</strong> Delocalization</div>
        </div>
      </div>

      {/* Arrow Type Dialog */}
      {showArrowTypeDialog && (
        <ArrowTypeDialog
          onSelect={handleArrowTypeSelected}
          onCancel={() => {
            setShowArrowTypeDialog(false);
            useMechanismStore.getState().setPendingSinkAtomId(null);
            useMechanismStore.getState().cancelArrowSelection();
            setStatus('Arrow selection cancelled');
          }}
        />
      )}
    </div>
  );
}
