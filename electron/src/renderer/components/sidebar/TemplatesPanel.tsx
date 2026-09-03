import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import * as wasmBridge from '../../wasm/wasmBridge';

const TEMPLATES = [
  // Aromatic rings
  { name: 'Benzene', smiles: 'c1ccccc1' },
  { name: 'Naphthalene', smiles: 'c1ccc2ccccc2c1' },
  { name: 'Anthracene', smiles: 'c1ccc2cc3ccccc3cc2c1' },
  { name: 'Pyridine', smiles: 'c1ccncc1' },
  { name: 'Pyrrole', smiles: 'c1cc[nH]c1' },
  { name: 'Thiophene', smiles: 'c1sccc1' },
  { name: 'Furan', smiles: 'o1cccc1' },
  { name: 'Imidazole', smiles: 'c1c[nH]cn1' },
  { name: 'Pyrazole', smiles: 'c1cc[nH]n1' },
  { name: 'Oxazole', smiles: 'c1ocnc1' },
  { name: 'Thiazole', smiles: 'c1scnc1' },
  { name: 'Indole', smiles: 'c1ccc2[nH]ccc2c1' },
  { name: 'Quinoline', smiles: 'c1ccc2ncccc2c1' },

  // Alicyclic rings
  { name: 'Cyclopentane', smiles: 'C1CCCC1' },
  { name: 'Cyclohexane', smiles: 'C1CCCCC1' },
  { name: 'Cycloheptane', smiles: 'C1CCCCCC1' },
  { name: 'Cyclopropane', smiles: 'C1CC1' },
  { name: 'Cyclobutane', smiles: 'C1CCC1' },
  { name: 'Morpholine', smiles: 'C1COCCN1' },
  { name: 'Piperidine', smiles: 'C1CCNCC1' },
  { name: 'Piperazine', smiles: 'C1CNCCN1' },

  // Functional groups
  { name: 'Carboxylic Acid', smiles: 'CC(=O)O' },
  { name: 'Ester', smiles: 'CC(=O)OC' },
  { name: 'Amide', smiles: 'CC(=O)N' },
  { name: 'Aldehyde', smiles: 'CC(=O)' },
  { name: 'Ketone', smiles: 'CC(=O)C' },
  { name: 'Alcohol', smiles: 'CO' },
  { name: 'Ether', smiles: 'COC' },
  { name: 'Amine', smiles: 'CCN' },
  { name: 'Thiol', smiles: 'CCS' },
  { name: 'Sulfide', smiles: 'CCS(C)=O' },
  { name: 'Phenol', smiles: 'Oc1ccccc1' },
  { name: 'Aniline', smiles: 'Nc1ccccc1' },
  { name: 'Benzaldehyde', smiles: 'O=Cc1ccccc1' },
  { name: 'Acetone', smiles: 'CC(=O)C' },
  { name: 'Methanol', smiles: 'CO' },
  { name: 'Ethanol', smiles: 'CCO' },
  { name: 'Acetic Acid', smiles: 'CC(=O)O' },

  // Common fragments
  { name: 'Phenyl', smiles: 'c1ccccc1' },
  { name: 'Benzyl', smiles: 'Cc1ccccc1' },
  { name: 'Methyl', smiles: 'C' },
  { name: 'Ethyl', smiles: 'CC' },
  { name: 'Propyl', smiles: 'CCC' },
  { name: 'Isopropyl', smiles: 'CC(C)' },
  { name: 'tert-Butyl', smiles: 'CC(C)(C)' },
  { name: 'Allyl', smiles: 'C=CC' },
  { name: 'Acetyl', smiles: 'CC(=O)' },
  { name: 'Chlorine', smiles: 'Cl' },
  { name: 'Bromine', smiles: 'Br' },
  { name: 'Fluorine', smiles: 'F' },
  { name: 'Iodine', smiles: 'I' },
];

export function TemplatesPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setStatus = useUIStore((s) => s.setStatus);
  const [searchTerm, setSearchTerm] = useState('');

  const handleInsertTemplate = (smiles: string, name: string) => {
    try {
      const mol = wasmBridge.parseMolecule(smiles);
      pushUndo();
      setMolecule(mol);
      setStatus(`Inserted ${name}`);
    } catch {
      setStatus(`Failed to insert ${name}`);
    }
  };

  const handleDragStart = (e: React.DragEvent, smiles: string, name: string) => {
    e.dataTransfer!.effectAllowed = 'copy';
    e.dataTransfer!.setData('application/x-template-smiles', smiles);
    e.dataTransfer!.setData('application/x-template-name', name);
  };

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const hoverBg = theme === 'dark' ? '#3a4a57' : '#f0f0f0';

  const filtered = TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="text"
        aria-label={language === 'ja' ? 'テンプレートを検索' : 'Search templates'}
        placeholder={language === 'ja' ? 'テンプレートを検索…' : 'Search templates...'}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: '6px 8px',
          border: `1px solid ${borderColor}`,
          borderRadius: '3px',
          backgroundColor: inputBg,
          color: textColor,
          fontSize: '11px',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {filtered.map((template) => (
        <button
          key={template.name}
          draggable
          onClick={() => handleInsertTemplate(template.smiles, template.name)}
          onDragStart={(e) => handleDragStart(e, template.smiles, template.name)}
          style={{
            padding: '12px',
            border: `1px solid ${borderColor}`,
            borderRadius: '4px',
            backgroundColor: bgColor,
            color: textColor,
            cursor: 'grab',
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
      {filtered.length === 0 && (
        <div style={{ fontSize: '11px', color: 'gray', textAlign: 'center', padding: '20px 0' }}>
          No templates match "{searchTerm}"
        </div>
      )}
    </div>
  );
}
