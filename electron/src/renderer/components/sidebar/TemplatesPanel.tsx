import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import * as wasmBridge from '../../wasm/wasmBridge';

const TEMPLATES = [
  { name: 'Benzene', smiles: 'c1ccccc1' },
  { name: 'Cyclohexane', smiles: 'C1CCCCC1' },
  { name: 'Pyrrole', smiles: 'c1cc[nH]c1' },
  { name: 'Thiophene', smiles: 'c1sccc1' },
  { name: 'Pyridine', smiles: 'c1ccncc1' },
  { name: 'Furan', smiles: 'o1cccc1' },
  { name: 'Cyclopentane', smiles: 'C1CCCC1' },
  { name: 'Cycloheptane', smiles: 'C1CCCCCC1' },
  { name: 'Naphthalene', smiles: 'c1ccc2ccccc2c1' },
  { name: 'Phenol', smiles: 'Oc1ccccc1' },
  { name: 'Aniline', smiles: 'Nc1ccccc1' },
  { name: 'Toluene', smiles: 'Cc1ccccc1' },
];

export function TemplatesPanel() {
  const theme = useUIStore((s) => s.theme);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const setStatus = useUIStore((s) => s.setStatus);

  const handleInsertTemplate = (smiles: string, name: string) => {
    try {
      const mol = wasmBridge.parseMolecule(smiles);
      setMolecule(mol);
      setStatus(`Inserted ${name}`);
    } catch (err) {
      setStatus(`Failed to insert ${name}`);
    }
  };

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const hoverBg = theme === 'dark' ? '#3a4a57' : '#f0f0f0';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
      {TEMPLATES.map((template) => (
        <button
          key={template.name}
          onClick={() => handleInsertTemplate(template.smiles, template.name)}
          style={{
            padding: '12px',
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            backgroundColor: bgColor,
            color: textColor,
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bgColor)}
        >
          {template.name}
        </button>
      ))}
    </div>
  );
}
