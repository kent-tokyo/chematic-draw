import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { ReactionScheme, ReactionStep, ReactionCondition, createReactionStep, addStep, removeStep, updateConditions, executeReaction, SMIRKS_TEMPLATES } from '../../lib/reactions';
import { useReactionSchemeStore, ReactionSchemeContext } from '../../store/reactionSchemeStore';
import { validateReactionScheme, getIntermediates, getExternalReagents } from '../../lib/reactionSchemeUtils';
import { exportSchemeAsJSON, importSchemeFromJSON, exportSchemeAsSVG, exportSchemeAsCSV } from '../../lib/schemeExport';

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schemeLayout = useReactionSchemeStore((s) => s.schemeLayout);

  // Scheme store hooks
  const schemeStoreScheme = useReactionSchemeStore((s) => s.scheme);
  const getCurrentStep = useReactionSchemeStore((s) => s.getCurrentStep);
  const nextStep = useReactionSchemeStore((s) => s.nextStep);
  const previousStep = useReactionSchemeStore((s) => s.previousStep);
  const canGoNext = useReactionSchemeStore((s) => s.canGoNext);
  const canGoPrevious = useReactionSchemeStore((s) => s.canGoPrevious);
  const atomMappings = useReactionSchemeStore((s) => s.atomMappings);
  const reactionClassification = useReactionSchemeStore((s) => s.reactionClassification);
  const greenMetrics = useReactionSchemeStore((s) => s.greenMetrics);
  const atomLabelsVisible = useReactionSchemeStore((s) => s.atomLabelsVisible);
  const mappingLinesVisible = useReactionSchemeStore((s) => s.mappingLinesVisible);
  const calculateAtomMappings = useReactionSchemeStore((s) => s.calculateAtomMappings);
  const toggleAtomLabels = useReactionSchemeStore((s) => s.toggleAtomLabels);
  const toggleMappingLines = useReactionSchemeStore((s) => s.toggleMappingLines);

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

  useEffect(() => {
    if (scheme && scheme.steps.length > 0) {
      calculateAtomMappings();
    }
  }, [scheme?.steps.length, calculateAtomMappings]);

  const isDark = theme === 'dark';

  // Download helper function
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export/Import handlers
  const handleExportJSON = () => {
    if (!scheme) return;
    const json = exportSchemeAsJSON(
      scheme,
      useReactionSchemeStore.getState().atomMappings,
      useReactionSchemeStore.getState().reactionClassification,
      useReactionSchemeStore.getState().greenMetrics
    );
    downloadFile(json, `${scheme.title || 'scheme'}_export.json`, 'application/json');
    setStatus('Exported as JSON');
  };

  const handleExportSVG = () => {
    if (!scheme || !schemeLayout) return;
    const svg = exportSchemeAsSVG(
      scheme,
      schemeLayout,
      useReactionSchemeStore.getState().atomMappings
    );
    downloadFile(svg, `${scheme.title || 'scheme'}_diagram.svg`, 'image/svg+xml');
    setStatus('Exported as SVG');
  };

  const handleExportCSV = () => {
    if (!scheme) return;
    const csv = exportSchemeAsCSV(
      scheme,
      useReactionSchemeStore.getState().reactionClassification,
      useReactionSchemeStore.getState().greenMetrics
    );
    downloadFile(csv, `${scheme.title || 'scheme'}_report.csv`, 'text/csv');
    setStatus('Exported as CSV');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedScheme = importSchemeFromJSON(text);
      if (importedScheme) {
        useReactionSchemeStore.getState().createScheme(importedScheme.title, importedScheme.description);
        const state = useReactionSchemeStore.getState();
        state.scheme?.steps?.forEach((step, i) => {
          if (i < importedScheme.steps.length) {
            state.updateStep(step.id, importedScheme.steps[i]);
          }
        });
        setStatus(`Imported scheme: ${importedScheme.title}`);
      } else {
        setStatus('Failed to import JSON');
      }
    } catch (error) {
      setStatus('Error reading file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Button style definition
  const buttonStyle = {
    width: '100%',
    backgroundColor: isDark ? '#2a3a3a' : '#f0f0f0',
    color: textColor,
    border: `1px solid ${borderColor}`,
    borderRadius: '3px',
    cursor: 'pointer' as const,
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

      {/* Export/Import Section */}
      {scheme && (
        <div style={{
          padding: '12px',
          backgroundColor: isDark ? '#1e2a2a' : '#f9f9f9',
          border: `1px solid ${borderColor}`,
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
            Export & Import
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                padding: '6px 8px',
                backgroundColor: accentColor,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 'bold',
              }}
            >
              ▼ Export Scheme
            </button>

            {showExportMenu && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <button onClick={handleExportJSON} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>
                  JSON (full data)
                </button>
                <button onClick={handleExportSVG} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>
                  SVG Image
                </button>
                <button onClick={handleExportCSV} style={{ padding: '4px 6px', fontSize: '9px', ...buttonStyle }}>
                  CSV Report
                </button>
              </div>
            )}

            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '6px 8px',
                backgroundColor: borderColor,
                color: textColor,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 'bold',
              }}
            >
              Import from JSON
            </button>
          </div>
        </div>
      )}

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

      {/* Reaction Classification Panel */}
      {reactionClassification && scheme && scheme.steps.length > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd',
          border: `1px solid ${isDark ? '#2a5a7a' : '#90caf9'}`,
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#90caf9' : '#1976d2', marginBottom: '8px' }}>
            Reaction Type
          </div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: textColor, marginBottom: '4px' }}>
            {reactionClassification.type.toUpperCase()}
          </div>
          <div style={{ fontSize: '10px', color: labelColor, marginBottom: '6px' }}>
            Confidence: {Math.round(reactionClassification.confidence * 100)}%
          </div>
          {reactionClassification.indicators.map((ind, i) => (
            <div key={i} style={{ fontSize: '9px', color: labelColor }}>• {ind}</div>
          ))}
        </div>
      )}

      {/* Atom Mapping Legend */}
      {atomMappings && atomMappings.totalMappedAtoms > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: isDark ? '#1e2a3a' : '#f9f9f9',
          border: `1px solid ${borderColor}`,
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
            Atom Mapping ({atomMappings.totalMappedAtoms} atoms)
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
            {[
              { color: '#51cf66', label: 'Persistent' },
              { color: '#4d8dff', label: 'New' },
              { color: '#ff6b6b', label: 'Leaving' },
              { color: '#888888', label: 'Spectator' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: item.color, borderRadius: '2px' }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => toggleAtomLabels()}
              style={{
                flex: 1,
                padding: '4px 6px',
                backgroundColor: atomLabelsVisible ? accentColor : borderColor,
                color: atomLabelsVisible ? 'white' : textColor,
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '9px',
              }}
            >
              {atomLabelsVisible ? '✓' : '○'} Labels
            </button>
            <button
              onClick={() => toggleMappingLines()}
              style={{
                flex: 1,
                padding: '4px 6px',
                backgroundColor: mappingLinesVisible ? accentColor : borderColor,
                color: mappingLinesVisible ? 'white' : textColor,
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '9px',
              }}
            >
              {mappingLinesVisible ? '✓' : '○'} Lines
            </button>
          </div>

          {/* Atom List */}
          <div style={{ marginTop: '8px', maxHeight: '120px', overflowY: 'auto', fontSize: '9px' }}>
            {Array.from(atomMappings.entries).map(([id, entry]) => (
              <div key={id} style={{ color: labelColor, marginBottom: '2px' }}>
                <span style={{ fontWeight: 'bold' }}>{id}:</span> {entry.element}{entry.formalCharge > 0 ? '+' : entry.formalCharge < 0 ? '−' : ''}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Green Chemistry Metrics */}
      {greenMetrics && scheme && scheme.steps.length > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: isDark ? '#1a3a2a' : '#e8f5e9',
          border: `1px solid ${isDark ? '#2a5a4a' : '#81c784'}`,
          borderRadius: '6px',
          marginBottom: '12px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: isDark ? '#81c784' : '#2e7d32', marginBottom: '8px' }}>
            Green Chemistry Metrics
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '11px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: textColor }}>Atom Economy</div>
              <div style={{ fontSize: '13px', color: '#4caf50', fontWeight: 'bold' }}>{greenMetrics.atomEconomy}%</div>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', color: textColor }}>E-Factor</div>
              <div style={{ fontSize: '13px', color: '#ff9800', fontWeight: 'bold' }}>{greenMetrics.eFactorApprox}</div>
            </div>
          </div>
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
