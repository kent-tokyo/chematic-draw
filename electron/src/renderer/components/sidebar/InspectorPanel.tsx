import React, { useState, useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { ElementPicker } from '../inspector/ElementPicker';
import { AtomDto, BondDto } from '../../store/types';
import * as wasmBridge from '../../wasm/wasmBridge';

// Hoisted out of InspectorPanel's render body: defining a component inline
// in a render function gives it a new identity every render, so React
// unmounts and remounts its whole subtree each time — for SmartsSection
// specifically, that meant the search <input> got recreated (and lost
// keyboard focus) after every single keystroke, since typing triggers the
// parent state update that re-renders InspectorPanel.
function FunctionalGroupsSection({
  bgColor,
  labelColor,
  textColor,
  functionalGroups,
}: {
  bgColor: string;
  labelColor: string;
  textColor: string;
  functionalGroups: string[];
}) {
  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        Functional Groups
      </div>
      {functionalGroups.length === 0 ? (
        <div style={{ fontSize: '10px', color: labelColor }}>None detected</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {functionalGroups.map((group, i) => (
            <div
              key={i}
              style={{
                fontSize: '9px',
                backgroundColor: '#4d8dff',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {group.replace(/[()]/g, '')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValidationSection({
  bgColor,
  labelColor,
  textColor,
  validationErrors,
  validationWarnings,
}: {
  bgColor: string;
  labelColor: string;
  textColor: string;
  validationErrors: string[];
  validationWarnings: string[];
}) {
  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        Validation
      </div>
      {validationErrors.length === 0 ? (
        <div style={{ fontSize: '10px', color: '#58c97a' }}>✓ No errors</div>
      ) : (
        <div style={{ fontSize: '10px', color: '#f26d6d' }}>
          {validationErrors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}
      {validationWarnings.length > 0 && (
        <div style={{ fontSize: '10px', color: '#e0a030', marginTop: '6px' }}>
          {validationWarnings.map((warning, i) => (
            <div key={i}>⚠ {warning}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SmartsSection({
  bgColor,
  labelColor,
  textColor,
  theme,
  smartsPattern,
  setSmartsPattern,
  smartsMatches,
  handleSmartsSearch,
}: {
  bgColor: string;
  labelColor: string;
  textColor: string;
  theme: string;
  smartsPattern: string;
  setSmartsPattern: (value: string) => void;
  smartsMatches: number[];
  handleSmartsSearch: () => void;
}) {
  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        SMARTS Search
      </div>
      <input
        type="text"
        placeholder="e.g., [#6]1:[#6]:[#6]:[#6]:[#6]:[#6]:1"
        value={smartsPattern}
        onChange={(e) => setSmartsPattern(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSmartsSearch()}
        style={{
          width: '100%',
          padding: '6px',
          border: `1px solid ${labelColor}`,
          borderRadius: '3px',
          backgroundColor: theme === 'dark' ? '#1e2530' : '#f9f9f9',
          color: textColor,
          fontSize: '10px',
          boxSizing: 'border-box',
        }}
      />
      <button
        onClick={handleSmartsSearch}
        style={{
          marginTop: '6px',
          width: '100%',
          padding: '6px',
          backgroundColor: '#4d8dff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '10px',
          cursor: 'pointer',
        }}
      >
        Search
      </button>
      {smartsMatches.length > 0 && (
        <div style={{ marginTop: '6px', fontSize: '10px', color: textColor }}>
          Found {smartsMatches.length} atoms matching
        </div>
      )}
    </div>
  );
}

export function InspectorPanel() {
  const theme = useUIStore((s) => s.theme);
  const selectedAtomIdForInspector = useUIStore((s) => s.selectedAtomIdForInspector);
  const selectedBond = useUIStore((s) => s.selectedBondForInspector);
  const molecule = useMoleculeStore((s) => s.molecule);
  // Derived live, every render, from molecule.atoms + the tracked id — never
  // a stale snapshot. Deliberately NOT gated on the atom's `selected` flag:
  // right-click sets this id without ever touching `selected` (and bonds
  // have no left-click select at all), so a `selected`-based fallback would
  // make right-click lose to whatever was left-clicked earlier instead of
  // showing the atom just right-clicked. The tracked id is simply "the atom
  // the most recent selection action (left-click, right-click, or keyboard
  // roving-focus) pointed at" — each of those sets it directly, in the
  // order the actions happen, which already matches "most recently
  // selected" for the ordinary case without needing a separate fallback.
  const selectedAtom: AtomDto | null = molecule.atoms.find((a) => a.id === selectedAtomIdForInspector) ?? null;
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const updateBond = useMoleculeStore((s) => s.updateBond);
  const [smartsPattern, setSmartsPattern] = useState('');
  const [smartsMatches, setSmartsMatches] = useState<number[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [functionalGroups, setFunctionalGroups] = useState<string[]>([]);

  // Validate molecule. `result?.errors ?? []` used to silently mask a real
  // bug: validate_molecule returned a serde_json::json!() Value, which
  // serde_wasm_bindgen serializes as a JS Map, so `.errors` was always
  // undefined regardless of the actual validation outcome — the fallback
  // fired on every call, not just during startup. Fixed on the Rust side
  // (ValidationResultDto, a concrete #[derive(Serialize)] struct, serializes
  // as a plain object). The `?? []`/try-catch stays as a defensive guard,
  // not a workaround for anything currently broken.
  useEffect(() => {
    try {
      const result = wasmBridge.validateMolecule(molecule);
      setValidationErrors(result?.errors ?? []);
      setValidationWarnings(result?.warnings ?? []);
    } catch (err) {
      setValidationErrors(['Validation error']);
      setValidationWarnings([]);
    }
  }, [molecule]);

  // SMARTS search
  const handleSmartsSearch = () => {
    if (!smartsPattern.trim()) {
      setSmartsMatches([]);
      return;
    }
    try {
      const matches = wasmBridge.smarts(molecule, smartsPattern);
      setSmartsMatches(matches);
    } catch (err) {
      setSmartsMatches([]);
    }
  };

  // Identify functional groups
  useEffect(() => {
    if (molecule && molecule.atoms.length > 0) {
      try {
        const groups = wasmBridge.identifyFunctionalGroups(molecule);
        setFunctionalGroups(groups);
      } catch (err) {
        setFunctionalGroups([]);
      }
    } else {
      setFunctionalGroups([]);
    }
  }, [molecule]);

  const bgColor = theme === 'dark' ? '#1e2530' : '#f9f9f9';
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          Select an atom or bond to inspect
        </div>
        <FunctionalGroupsSection bgColor={bgColor} labelColor={labelColor} textColor={textColor} functionalGroups={functionalGroups} />
        <ValidationSection bgColor={bgColor} labelColor={labelColor} textColor={textColor} validationErrors={validationErrors} validationWarnings={validationWarnings} />
        <SmartsSection bgColor={bgColor} labelColor={labelColor} textColor={textColor} theme={theme} smartsPattern={smartsPattern} setSmartsPattern={setSmartsPattern} smartsMatches={smartsMatches} handleSmartsSearch={handleSmartsSearch} />
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
            <label style={{ fontSize: '11px', color: labelColor, display: 'block', marginBottom: '6px' }}>
              Isotope (mass number)
            </label>
            <input
              type="number"
              min="1"
              placeholder="natural abundance"
              value={selectedAtom.isotope ?? ''}
              onChange={(e) =>
                handleAtomUpdate('isotope', e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
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
            />
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
            <label style={{ fontSize: '11px', color: labelColor, display: 'block', marginBottom: '6px' }}>
              Stereo
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                { label: 'None', value: 0 },
                { label: '⌟ Wedge', value: 1 },
                { label: '⌞ Dash', value: 6 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleBondUpdate('stereo', opt.value)}
                  style={{
                    padding: '6px',
                    border: `1px solid ${inputBorder}`,
                    borderRadius: '3px',
                    backgroundColor: (selectedBond.stereo ?? 0) === opt.value ? '#4d8dff' : inputBg,
                    color: (selectedBond.stereo ?? 0) === opt.value ? 'white' : textColor,
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
