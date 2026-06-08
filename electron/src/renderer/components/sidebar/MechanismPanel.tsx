import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { MechanismStep, createMechanismStep } from '../../lib/advancedFeatures';

export function MechanismPanel() {
  const theme = useUIStore((s) => s.theme);
  const [steps, setSteps] = useState<MechanismStep[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const mechanismTypes = [
    'sn2',
    'sn1',
    'e1',
    'e2',
    'electrophilic_addition',
  ] as const;

  const arrowTypes = ['forward', 'retro', 'resonance'] as const;

  const handleAddStep = () => {
    const newStep = createMechanismStep(`step-${Date.now()}`);
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleUpdateStep = (id: string, updates: Partial<MechanismStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: labelColor }}>
        Define reaction mechanism steps with electron flow and intermediates.
      </div>

      {/* Steps List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
        {steps.length === 0 ? (
          <div style={{ fontSize: '11px', color: labelColor, textAlign: 'center', padding: '16px' }}>
            No mechanism steps. Add one to start.
          </div>
        ) : (
          steps.map((step, idx) => (
            <div key={step.id} style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', overflow: 'hidden' }}>
              {/* Step Header */}
              <button
                onClick={() => setExpandedId(expandedId === step.id ? null : step.id)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: expandedId === step.id ? '#3a4a57' : inputBg,
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
                <span>Step {idx + 1}: {step.mechanismType}</span>
                <span>{expandedId === step.id ? '▼' : '▶'}</span>
              </button>

              {/* Step Details */}
              {expandedId === step.id && (
                <div style={{ padding: '8px', backgroundColor: theme === 'dark' ? '#1e2530' : '#f9f9f9', borderTop: `1px solid ${borderColor}` }}>
                  {/* Mechanism Type */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>
                      Mechanism Type
                    </label>
                    <select
                      value={step.mechanismType}
                      onChange={(e) =>
                        handleUpdateStep(step.id, { mechanismType: e.target.value as any })
                      }
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
                      {mechanismTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Arrow Type */}
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', color: labelColor, display: 'block', marginBottom: '4px' }}>
                      Arrow Type
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                      {arrowTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleUpdateStep(step.id, { arrows: type })}
                          style={{
                            padding: '4px',
                            backgroundColor: step.arrows === type ? accentColor : borderColor,
                            color: step.arrows === type ? 'white' : textColor,
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

      {/* Add Step Button */}
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
        + Add Mechanism Step
      </button>

      {/* Info */}
      <div style={{ fontSize: '9px', color: labelColor, lineHeight: '1.4' }}>
        <strong>Mechanism Steps:</strong> Define SN2, SN1, E1, E2, or electrophilic addition mechanisms with proper arrow notation.
      </div>
    </div>
  );
}
