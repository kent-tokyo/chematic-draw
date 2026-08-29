import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export function UndoTimelineModal() {
  const theme = useUIStore((s) => s.theme);
  const showUndoModal = useUIStore((s) => s.showUndoModal);
  const hideModal = useUIStore((s) => s.hideModal);
  const undoStack = useMoleculeStore((s) => s.undoStack);
  const redoStack = useMoleculeStore((s) => s.redoStack);
  const undo = useMoleculeStore((s) => s.undo);
  const redo = useMoleculeStore((s) => s.redo);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  // Lazy initializer: computed once when the modal first mounts, not on
  // every re-render — Date.now() is impure and must not run directly in
  // the render body (it would also silently drift the "Current" label to
  // a newer "now" on every unrelated re-render while the modal stays open).
  const [openedAt] = useState(() => Date.now());
  const dialogRef = useFocusTrap(showUndoModal);

  useEffect(() => {
    if (!showUndoModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideModal('undo');
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showUndoModal, hideModal]);

  if (!showUndoModal) return null;

  const currentIdx = undoStack.length;
  // undoStack/redoStack only ever store raw MoleculeDto snapshots (see
  // moleculeStore.ts's pushUndo) — there's no real per-edit description or
  // timestamp to show, so label by position instead of fabricating one.
  const allStates: Array<{ description: string; timestamp: number | null }> = [
    ...undoStack.map((_, i) => ({
      description: `Undo step ${undoStack.length - i}`,
      timestamp: null,
    })),
    { description: 'Current', timestamp: openedAt },
    ...[...redoStack].reverse().map((_, i) => ({
      description: `Redo step ${i + 1}`,
      timestamp: null,
    })),
  ];

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const activeBg = '#4d8dff';
  const hoverBg = theme === 'dark' ? '#3a4a57' : '#f0f0f0';

  return (
    <div
      onClick={() => hideModal('undo')}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="undo-timeline-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '8px',
          width: '600px',
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="undo-timeline-title" style={{ margin: 0, color: textColor, fontSize: '18px' }}>Undo/Redo Timeline</h2>
          <button
            onClick={() => hideModal('undo')}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: textColor,
            }}
          >
            ✕
          </button>
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allStates.map((state, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedIndex(idx === selectedIndex ? -1 : idx)}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  backgroundColor: idx === currentIdx ? activeBg : idx === selectedIndex ? hoverBg : bgColor,
                  color: idx === currentIdx ? 'white' : textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: idx === currentIdx ? 'bold' : 'normal' }}>
                  {idx === currentIdx ? '● ' : '  '}{state.description}
                </div>
                {state.timestamp !== null && (
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                    {new Date(state.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Slider */}
        <div style={{ padding: '16px', borderTop: `1px solid ${borderColor}` }}>
          <input
            type="range"
            aria-label="Timeline position"
            min={0}
            max={allStates.length - 1}
            value={currentIdx}
            onChange={(e) => {
              const targetIdx = parseInt(e.target.value);
              if (targetIdx < currentIdx) {
                // Undo to target
                for (let i = currentIdx; i > targetIdx; i--) {
                  undo();
                }
              } else if (targetIdx > currentIdx) {
                // Redo to target
                for (let i = currentIdx; i < targetIdx; i++) {
                  redo();
                }
              }
            }}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: '10px', color: textColor, marginTop: '8px', textAlign: 'center' }}>
            {currentIdx + 1} / {allStates.length}
          </div>
        </div>
      </div>
    </div>
  );
}
