import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { ElementPicker } from '../inspector/ElementPicker';
import { AtomDto, BondDto } from '../../store/types';

export function InspectorPanel() {
  const theme = useUIStore((s) => s.theme);
  const selectedAtom = useUIStore((s) => s.selectedAtomForInspector);
  const selectedBond = useUIStore((s) => s.selectedBondForInspector);
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const updateBond = useMoleculeStore((s) => s.updateBond);

  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const inputBg = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const inputBorder = theme === 'dark' ? '#3a4a57' : '#d0d0d0';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';

  const handleAtomUpdate = (key: keyof AtomDto, value: any) => {
    if (selectedAtom) {
      updateAtom(selectedAtom.id, { [key]: value });
    }
  };

  const handleBondUpdate = (key: keyof BondDto, value: any) => {
    if (selectedBond) {
      updateBond(selectedBond.id, { [key]: value });
    }
  };

  if (!selectedAtom && !selectedBond) {
    return (
      <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
        Select an atom or bond to inspect
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {selectedAtom && (
        <>
          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>Element</label>
            <ElementPicker
              currentElement={selectedAtom.element}
              onSelect={(el) => handleAtomUpdate('element', el)}
              theme={theme}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor, display: 'block', marginBottom: '6px' }}>
              Charge
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              {[-2, -1, 0, 1, 2].map((ch) => (
                <button
                  key={ch}
                  onClick={() => handleAtomUpdate('charge', ch)}
                  style={{
                    padding: '6px',
                    border: `1px solid ${inputBorder}`,
                    borderRadius: '3px',
                    backgroundColor: (selectedAtom.charge ?? 0) === ch ? '#4d8dff' : inputBg,
                    color: (selectedAtom.charge ?? 0) === ch ? 'white' : textColor,
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {ch > 0 ? `+${ch}` : ch}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>Explicit H</label>
            <select
              value={selectedAtom.explicit_h ?? 0}
              onChange={(e) => handleAtomUpdate('explicit_h', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${inputBorder}`,
                borderRadius: '3px',
                backgroundColor: inputBg,
                color: textColor,
                fontSize: '11px',
                boxSizing: 'border-box',
              }}
            >
              {[0, 1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h === 0 ? 'Auto' : h}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: '10px', color: labelColor, padding: '8px', backgroundColor: theme === 'dark' ? '#2f3a47' : '#f3f5f8', borderRadius: '3px' }}>
            <strong>Atom ID:</strong> {selectedAtom.id}
            <br />
            <strong>Position:</strong> ({selectedAtom.x.toFixed(1)}, {selectedAtom.y.toFixed(1)})
          </div>
        </>
      )}

      {selectedBond && (
        <>
          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>Bond Order</label>
            <select
              value={selectedBond.order}
              onChange={(e) => handleBondUpdate('order', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${inputBorder}`,
                borderRadius: '3px',
                backgroundColor: inputBg,
                color: textColor,
                fontSize: '11px',
                boxSizing: 'border-box',
              }}
            >
              <option value={1}>Single</option>
              <option value={2}>Double</option>
              <option value={3}>Triple</option>
              <option value={4}>Aromatic</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>Stereo</label>
            <select
              value={selectedBond.stereo ?? 0}
              onChange={(e) => handleBondUpdate('stereo', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${inputBorder}`,
                borderRadius: '3px',
                backgroundColor: inputBg,
                color: textColor,
                fontSize: '11px',
                boxSizing: 'border-box',
              }}
            >
              <option value={0}>None</option>
              <option value={1}>Wedge Up</option>
              <option value={6}>Dash Down</option>
            </select>
          </div>

          <div style={{ fontSize: '10px', color: labelColor, padding: '8px', backgroundColor: theme === 'dark' ? '#2f3a47' : '#f3f5f8', borderRadius: '3px' }}>
            <strong>Bond ID:</strong> {selectedBond.id}
            <br />
            <strong>From:</strong> {selectedBond.from} <strong>To:</strong> {selectedBond.to}
          </div>
        </>
      )}
    </div>
  );
}
