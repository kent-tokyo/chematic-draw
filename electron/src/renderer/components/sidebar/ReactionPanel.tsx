import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { ReactionScheme, ReactionStep, ReactionCondition, createReactionStep, addStep, removeStep, updateConditions, executeReaction, SMIRKS_TEMPLATES } from '../../lib/reactions';
import { useReactionSchemeStore } from '../../store/reactionSchemeStore';
import { validateReactionScheme, getIntermediates, getExternalReagents } from '../../lib/reactionSchemeUtils';

export function ReactionPanel() {
  const scheme = useMoleculeStore((s) => s.reactionScheme);
  const setReactionScheme = useMoleculeStore((s) => s.setReactionScheme);
  const onSchemeChange = (updated: ReactionScheme) => setReactionScheme(updated);
  const theme = useUIStore((s) => s.theme);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [newStepReactants, setNewStepReactants] = useState<number>(1);
  const [newStepProducts, setNewStepProducts] = useState<number>(1);
  const [smirlksInput, setSmirlksInput] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('carboxylic_acid_to_amide');
  const [reactionError, setReactionError] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Scheme store hooks
  const schemeStoreScheme = useReactionSchemeStore((s) => s.scheme);
  const getCurrentStep = useReactionSchemeStore((s) => s.getCurrentStep);
  const nextStep = useReactionSchemeStore((s) => s.nextStep);
  const previousStep = useReactionSchemeStore((s) => s.previousStep);
  const canGoNext = useReactionSchemeStore((s) => s.canGoNext);
  const canGoPrevious = useReactionSchemeStore((s) => s.canGoPrevious);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const handleAddStep = () => {
    const newStep = createReactionStep(`step-${Date.now()}`, [], []);
    const updatedScheme = { ...scheme, steps: [...scheme.steps, newStep] };
    onSchemeChange(updatedScheme);
  };

  const handleRemoveStep = (stepId: string) => {
    const updatedScheme = { ...scheme };
    removeStep(updatedScheme, stepId);
    onSchemeChange(updatedScheme);
  };

  const handleUpdateConditions = (stepId: string, conditions: Partial<ReactionCondition>) => {
    const step = scheme.steps.find((s) => s.id === stepId);
    if (step) {
      updateConditions(step, conditions);
      onSchemeChange({ ...scheme });
    }
  };

  const handleArrowTypeChange = (stepId: string, arrowType: 'single' | 'double' | 'equilibrium' | 'retro') => {
    const step = scheme.steps.find((s) => s.id === stepId);
    if (step) {
      step.arrowType = arrowType;
      onSchemeChange({ ...scheme });
    }
  };

  const molecule = useMoleculeStore((s) => s.molecule);

  const handleRunReaction = () => {
    if (!molecule || molecule.atoms.length === 0) {
      setReactionError('No molecule selected');
      return;
    }

    const smirks = smirlksInput || SMIRKS_TEMPLATES[selectedTemplate as keyof typeof SMIRKS_TEMPLATES];
    if (!smirks) {
      setReactionError('No SMIRKS pattern provided');
      return;
    }

    const newStep = executeReaction(molecule, smirks);
    if (!newStep) {
      setReactionError('Reaction execution failed. Check SMIRKS syntax.');
      return;
    }

    setReactionError('');
    const updatedScheme = { ...scheme, steps: [...scheme.steps, newStep] };
    onSchemeChange(updatedScheme);
    setSmirlksInput('');
  };

  const handleCreateNewScheme = () => {
    useReactionSchemeStore.getState().createScheme('New Mechanism', 'Multi-step reaction');
    setStatus('✓ New reaction scheme created');
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Title */}
      <input
        type="text"
        placeholder="Reaction title..."
        value={scheme.title || ''}
        onChange={(e) => onSchemeChange({ ...scheme, title: e.target.value })}
        style={{
          padding: '6px',
          border: `1px solid ${borderColor}`,
          borderRadius: '3px',
          backgroundColor: inputBg,
          color: textColor,
          fontSize: '11px',
          fontWeight: 'bold',
        }}
      />

      {/* Description */}
      <textarea
        placeholder="Reaction description..."
        value={scheme.description || ''}
        onChange={(e) => onSchemeChange({ ...scheme, description: e.target.value })}
        style={{
          padding: '6px',
          border: `1px solid ${borderColor}`,
          borderRadius: '3px',
          backgroundColor: inputBg,
          color: textColor,
          fontSize: '10px',
          minHeight: '60px',
          fontFamily: 'inherit',
        }}
      />

      {/* Multi-Step Scheme Navigation */}
      {schemeStoreScheme && (
        <div style={{
          padding: '12px',
          backgroundColor: theme === 'dark' ? '#1e2a3a' : '#f5f9ff',
          border: `1px solid ${theme === 'dark' ? '#2a4a7a' : '#90caf9'}`,
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          {/* Step Counter and Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: theme === 'dark' ? '#90caf9' : '#1976d2',
            }}>
              Step {schemeStoreScheme.currentStepIndex + 1} of {schemeStoreScheme.steps.length}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => previousStep()}
                disabled={!canGoPrevious()}
                style={{
                  padding: '4px 8px',
                  backgroundColor: canGoPrevious() ? accentColor : '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: canGoPrevious() ? 'pointer' : 'not-allowed',
                  fontSize: '10px',
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => nextStep()}
                disabled={!canGoNext()}
                style={{
                  padding: '4px 8px',
                  backgroundColor: canGoNext() ? accentColor : '#999',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: canGoNext() ? 'pointer' : 'not-allowed',
                  fontSize: '10px',
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {/* Current Step Details */}
          {getCurrentStep() && (
            <div style={{
              fontSize: '10px',
              color: labelColor,
              marginBottom: '8px',
              borderTop: `1px solid ${borderColor}`,
              paddingTop: '8px',
            }}>
              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                Reactants: {getCurrentStep()!.reactants.length}
              </div>
              <div style={{ marginBottom: '8px' }}>
                {getCurrentStep()!.reactants.map((r, i) => (
                  <div key={i} style={{ fontSize: '9px', color: labelColor }}>
                    • {r.atoms.length > 0 ? r.atoms.map((a) => a.element).join('') : '(unknown)'}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                Products: {getCurrentStep()!.products.length}
              </div>
              <div style={{ marginBottom: '8px' }}>
                {getCurrentStep()!.products.map((p, i) => (
                  <div key={i} style={{ fontSize: '9px', color: labelColor }}>
                    • {p.atoms.length > 0 ? p.atoms.map((a) => a.element).join('') : '(unknown)'}
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                Mechanism Arrows: {getCurrentStep()!.arrows.length}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
        {scheme.steps.length === 0 ? (
          <div style={{ fontSize: '11px', color: labelColor, textAlign: 'center', padding: '16px' }}>
            No steps. Add one to start.
          </div>
        ) : (
          scheme.steps.map((step, idx) => (
            <div key={step.id} style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
              {/* Step Header */}
              <button
                onClick={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: expandedStepId === step.id ? '#3a4a57' : inputBg,
                  color: textColor,
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Step {idx + 1}</span>
                <span>{expandedStepId === step.id ? '▼' : '▶'}</span>
              </button>

              {/* Step Details */}
              {expandedStepId === step.id && (
                <div style={{ padding: '8px', backgroundColor: theme === 'dark' ? '#1e2530' : '#f9f9f9', borderTop: `1px solid ${borderColor}` }}>
                  {/* Arrow Type */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>
                      Arrow Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                      {(['single', 'double', 'equilibrium', 'retro'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => handleArrowTypeChange(step.id, type)}
                          style={{
                            padding: '4px',
                            backgroundColor: step.arrowType === type ? accentColor : borderColor,
                            color: step.arrowType === type ? 'white' : textColor,
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '9px',
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Temperature */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor }}>Temperature</label>
                    <input
                      type="text"
                      placeholder="e.g., RT, 100°C, reflux"
                      value={step.conditions.temperature || ''}
                      onChange={(e) => handleUpdateConditions(step.id, { temperature: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        marginTop: '2px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
                        color: textColor,
                        fontSize: '10px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Solvent */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor }}>Solvent</label>
                    <input
                      type="text"
                      placeholder="e.g., DMF, THF, H2O"
                      value={step.conditions.solvent || ''}
                      onChange={(e) => handleUpdateConditions(step.id, { solvent: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        marginTop: '2px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
                        color: textColor,
                        fontSize: '10px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Catalyst */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor }}>Catalyst</label>
                    <input
                      type="text"
                      placeholder="e.g., Pd/C, Et3N"
                      value={step.conditions.catalyst || ''}
                      onChange={(e) => handleUpdateConditions(step.id, { catalyst: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        marginTop: '2px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
                        color: textColor,
                        fontSize: '10px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Time */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor }}>Time</label>
                    <input
                      type="text"
                      placeholder="e.g., 2h, overnight"
                      value={step.conditions.time || ''}
                      onChange={(e) => handleUpdateConditions(step.id, { time: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        marginTop: '2px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
                        color: textColor,
                        fontSize: '10px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Yield */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor }}>Yield (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={step.conditions.yield || ''}
                      onChange={(e) => handleUpdateConditions(step.id, { yield: e.target.value ? parseInt(e.target.value) : undefined })}
                      style={{
                        width: '100%',
                        padding: '4px',
                        marginTop: '2px',
                        border: `1px solid ${borderColor}`,
                        borderRadius: '3px',
                        backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
                        color: textColor,
                        fontSize: '10px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveStep(step.id)}
                    style={{
                      width: '100%',
                      padding: '4px',
                      backgroundColor: '#d94545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      marginTop: '4px',
                    }}
                  >
                    Remove Step
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reaction Executor */}
      <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${borderColor}`, marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
          Execute Reaction
        </div>

        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>
            Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              border: `1px solid ${borderColor}`,
              borderRadius: '3px',
              backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
              color: textColor,
              fontSize: '10px',
              boxSizing: 'border-box',
            }}
          >
            <option value="carboxylic_acid_to_amide">Carboxylic acid → Amide</option>
            <option value="ester_to_acid">Ester → Acid</option>
            <option value="ester_to_alcohol">Ester → Alcohol</option>
            <option value="alcohol_to_aldehyde">Alcohol → Aldehyde</option>
            <option value="aldehyde_to_carboxylic_acid">Aldehyde → Carboxylic acid</option>
            <option value="ketone_to_alcohol">Ketone → Alcohol</option>
            <option value="custom">Custom SMIRKS</option>
          </select>
        </div>

        {selectedTemplate === 'custom' && (
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>
              SMIRKS Pattern
            </label>
            <textarea
              placeholder="e.g., [C:1](=[O])[OH]>>[C:1](=[O])[NH2]"
              value={smirlksInput}
              onChange={(e) => setSmirlksInput(e.target.value)}
              style={{
                width: '100%',
                padding: '4px',
                border: `1px solid ${borderColor}`,
                borderRadius: '3px',
                backgroundColor: theme === 'dark' ? '#0e1530' : '#ffffff',
                color: textColor,
                fontSize: '9px',
                fontFamily: 'monospace',
                minHeight: '50px',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        <button
          onClick={handleRunReaction}
          style={{
            width: '100%',
            padding: '6px',
            backgroundColor: '#4d8dff',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold',
            marginBottom: reactionError ? '6px' : '0',
          }}
        >
          Execute Reaction
        </button>

        {reactionError && (
          <div style={{ fontSize: '9px', color: '#f26d6d', padding: '4px', backgroundColor: 'rgba(242, 109, 109, 0.1)', borderRadius: '3px' }}>
            {reactionError}
          </div>
        )}
      </div>

      {/* Add Step / Create Scheme Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {!schemeStoreScheme && (
          <button
            onClick={handleCreateNewScheme}
            style={{
              padding: '8px',
              backgroundColor: accentColor,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold',
            }}
          >
            + Create Reaction Scheme
          </button>
        )}
        <button
          onClick={handleAddStep}
          style={{
            padding: '8px',
            backgroundColor: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 'bold',
          }}
        >
          {schemeStoreScheme ? '+ Add Step to Scheme' : '+ Add Reaction Step'}
        </button>
        {status && (
          <div style={{
            fontSize: '10px',
            color: '#4caf50',
            padding: '4px',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '3px',
            textAlign: 'center',
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
