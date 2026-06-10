import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useMechanismStore } from '../../store/mechanismStore';
import { ArrowTypeDialog } from '../modals/ArrowTypeDialog';

export function MechanismPanel() {
  const theme = useUIStore((s) => s.theme);
  const setStatus = useUIStore((s) => s.setStatus);
  const molecule = useMoleculeStore((s) => s.molecule);

  const mechanismArrows = useMechanismStore((s) => s.arrows);
  const arrowSelectionMode = useMechanismStore((s) => s.arrowSelectionMode);
  const pendingSourceAtomId = useMechanismStore((s) => s.pendingSourceAtomId);
  const pendingSinkAtomId = useMechanismStore((s) => s.pendingSinkAtomId);

  const [showArrowTypeDialog, setShowArrowTypeDialog] = useState(false);

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

  const getAtomLabel = (atomId: number) => {
    const atom = molecule.atoms.find((a) => a.id === atomId);
    return atom ? atom.element : '?';
  };

  const handleArrowTypeSelected = (type: 'forward' | 'retro' | 'resonance') => {
    if (pendingSinkAtomId !== null && pendingSourceAtomId !== null) {
      useMechanismStore.getState().completeArrowSelection(pendingSinkAtomId, type);
      setShowArrowTypeDialog(false);
      useMechanismStore.getState().setPendingSinkAtomId(null);
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
      <div style={{ fontSize: '12px', color: labelColor }}>
        Draw electron flow arrows showing reaction mechanisms.
      </div>

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
          mechanismArrows.map((arrow) => (
            <div
              key={arrow.id}
              style={{
                padding: '8px',
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                backgroundColor: isDark ? '#2f3a47' : '#f9f9f9',
              }}
            >
              <span style={{ color: textColor, flex: 1 }}>
                {getAtomLabel(arrow.sourceAtomId)} {getArrowTypeLabel(arrow.type)} {getAtomLabel(arrow.sinkAtomId)}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <select
                  value={arrow.type}
                  onChange={(e) => handleChangeArrowType(arrow.id, e.target.value as any)}
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
                  onClick={() => handleRemoveArrow(arrow.id)}
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
          ))
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
