import React, { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { runAnalysisInWorker } from '../../lib/analysisWorkerClient';
import type { MoleculeDto } from '../../store/types';
import { useCanvasStore } from '../../store/canvasStore';
import { mergeTemplateIntoMolecule } from '../../lib/templateMerge';

type TemplateCategory = 'aromatic' | 'alicyclic' | 'heterocycle' | 'functional-group' | 'protecting-group' | 'fragment';

interface MoleculeTemplate {
  name: string;
  smiles: string;
  category: TemplateCategory;
  keywords?: string[];
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  aromatic: 'Aromatic',
  alicyclic: 'Alicyclic',
  heterocycle: 'Heterocycles',
  'functional-group': 'Functional groups',
  'protecting-group': 'Protecting groups',
  fragment: 'Fragments',
};

/** Curated, data-backed templates. Every entry is parsed and merged through
 * the normal undoable molecule path; there are no decorative-only templates. */
export const MOLECULE_TEMPLATES: readonly MoleculeTemplate[] = [
  // Aromatic rings
  { name: 'Benzene', smiles: 'c1ccccc1', category: 'aromatic' },
  { name: 'Naphthalene', smiles: 'c1ccc2ccccc2c1', category: 'aromatic' },
  { name: 'Anthracene', smiles: 'c1ccc2cc3ccccc3cc2c1', category: 'aromatic' },
  { name: 'Biphenyl', smiles: 'c1ccccc1-c2ccccc2', category: 'aromatic' },
  { name: 'Pyridine', smiles: 'c1ccncc1', category: 'aromatic' },
  { name: 'Indole', smiles: 'c1ccc2[nH]ccc2c1', category: 'aromatic' },
  { name: 'Quinoline', smiles: 'c1ccc2ncccc2c1', category: 'aromatic' },

  // Alicyclic rings
  { name: 'Cyclopropane', smiles: 'C1CC1', category: 'alicyclic' },
  { name: 'Cyclobutane', smiles: 'C1CCC1', category: 'alicyclic' },
  { name: 'Cyclopentane', smiles: 'C1CCCC1', category: 'alicyclic' },
  { name: 'Cyclohexane', smiles: 'C1CCCCC1', category: 'alicyclic' },
  { name: 'Cycloheptane', smiles: 'C1CCCCCC1', category: 'alicyclic' },
  { name: 'Adamantane', smiles: 'C1C2CC3CC1CC(C2)C3', category: 'alicyclic' },

  // Heterocycles
  { name: 'Pyrrole', smiles: 'c1cc[nH]c1', category: 'heterocycle' },
  { name: 'Thiophene', smiles: 'c1sccc1', category: 'heterocycle' },
  { name: 'Furan', smiles: 'o1cccc1', category: 'heterocycle' },
  { name: 'Imidazole', smiles: 'c1c[nH]cn1', category: 'heterocycle' },
  { name: 'Pyrazole', smiles: 'c1cc[nH]n1', category: 'heterocycle' },
  { name: 'Oxazole', smiles: 'c1ocnc1', category: 'heterocycle' },
  { name: 'Thiazole', smiles: 'c1scnc1', category: 'heterocycle' },
  { name: 'Morpholine', smiles: 'C1COCCN1', category: 'heterocycle' },
  { name: 'Piperidine', smiles: 'C1CCNCC1', category: 'heterocycle' },
  { name: 'Piperazine', smiles: 'C1CNCCN1', category: 'heterocycle' },
  { name: '1,4-Dioxane', smiles: 'O1CCOCC1', category: 'heterocycle' },
  { name: 'Purine', smiles: 'c1ncnc2ncnc12', category: 'heterocycle' },

  // Functional groups
  { name: 'Carboxylic Acid', smiles: 'CC(=O)O', category: 'functional-group' },
  { name: 'Ester', smiles: 'CC(=O)OC', category: 'functional-group' },
  { name: 'Amide', smiles: 'CC(=O)N', category: 'functional-group' },
  { name: 'Aldehyde', smiles: 'CC=O', category: 'functional-group' },
  { name: 'Ketone', smiles: 'CC(=O)C', category: 'functional-group' },
  { name: 'Alcohol', smiles: 'CO', category: 'functional-group' },
  { name: 'Ether', smiles: 'COC', category: 'functional-group' },
  { name: 'Amine', smiles: 'CCN', category: 'functional-group' },
  { name: 'Thiol', smiles: 'CS', category: 'functional-group' },
  { name: 'Sulfoxide', smiles: 'CS(C)=O', category: 'functional-group' },
  { name: 'Phenol', smiles: 'Oc1ccccc1', category: 'functional-group' },
  { name: 'Aniline', smiles: 'Nc1ccccc1', category: 'functional-group' },
  { name: 'Benzaldehyde', smiles: 'O=Cc1ccccc1', category: 'functional-group' },

  // Common protecting groups
  { name: 'Boc amine', smiles: 'CC(C)(C)OC(=O)N', category: 'protecting-group', keywords: ['tert-butoxycarbonyl'] },
  { name: 'Cbz amine', smiles: 'O=C(N)OCc1ccccc1', category: 'protecting-group', keywords: ['benzyloxycarbonyl'] },
  { name: 'Acetate ester', smiles: 'CC(=O)O', category: 'protecting-group', keywords: ['acyl'] },
  { name: 'TBDMS ether', smiles: 'C[Si](C)(C)O', category: 'protecting-group', keywords: ['silyl'] },

  // Common fragments
  { name: 'Phenyl', smiles: 'c1ccccc1', category: 'fragment' },
  { name: 'Benzyl', smiles: 'Cc1ccccc1', category: 'fragment' },
  { name: 'Methyl', smiles: 'C', category: 'fragment' },
  { name: 'Ethyl', smiles: 'CC', category: 'fragment' },
  { name: 'Propyl', smiles: 'CCC', category: 'fragment' },
  { name: 'Isopropyl', smiles: 'CC(C)', category: 'fragment' },
  { name: 'tert-Butyl', smiles: 'CC(C)(C)', category: 'fragment' },
  { name: 'Allyl', smiles: 'C=CC', category: 'fragment' },
  { name: 'Acetyl', smiles: 'CC(=O)', category: 'fragment' },
  { name: 'Chlorine', smiles: 'Cl', category: 'fragment' },
  { name: 'Bromine', smiles: 'Br', category: 'fragment' },
  { name: 'Fluorine', smiles: 'F', category: 'fragment' },
  { name: 'Iodine', smiles: 'I', category: 'fragment' },
];

export function TemplatesPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const setStatus = useUIStore((s) => s.setStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');

  const handleInsertTemplate = async (smiles: string, name: string) => {
    try {
      const mol = await runAnalysisInWorker('parse', undefined, undefined, undefined, smiles) as MoleculeDto;
      const current = useMoleculeStore.getState().molecule;
      const { canvasSize, screenToWorld } = useCanvasStore.getState();
      const center = screenToWorld(canvasSize.width / 2, canvasSize.height / 2);
      const centroid = {
        x: mol.atoms.reduce((sum, atom) => sum + atom.x, 0) / (mol.atoms.length || 1),
        y: mol.atoms.reduce((sum, atom) => sum + atom.y, 0) / (mol.atoms.length || 1),
      };
      pushUndo();
      setMolecule(mergeTemplateIntoMolecule(current, mol, center.x - centroid.x, center.y - centroid.y));
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

  const search = searchTerm.toLowerCase();
  const filtered = MOLECULE_TEMPLATES.filter((template) =>
    (category === 'all' || template.category === category)
    && ([template.name, ...(template.keywords ?? [])].some((term) => term.toLowerCase().includes(search))),
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
      <div aria-label={language === 'ja' ? 'テンプレート分類' : 'Template categories'} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {(['all', ...Object.keys(CATEGORY_LABELS)] as Array<TemplateCategory | 'all'>).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
            style={{ padding: '3px 6px', border: `1px solid ${borderColor}`, borderRadius: '999px', backgroundColor: category === item ? hoverBg : bgColor, color: textColor, cursor: 'pointer', fontSize: '9px' }}
          >
            {item === 'all' ? (language === 'ja' ? 'すべて' : 'All') : CATEGORY_LABELS[item]}
          </button>
        ))}
      </div>
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
