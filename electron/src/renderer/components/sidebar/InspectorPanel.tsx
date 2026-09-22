import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUIStore, AppLanguage } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { ElementPicker } from '../inspector/ElementPicker';
import { AtomDto, BondDto } from '../../store/types';
import * as wasmBridge from '../../wasm/wasmBridge';
import { QueryDocument, queryDocumentFromMolecule, queryDocumentToMolecule, validateQueryDocument, serializeQueryDocument, parseQueryDocument, QueryAtomConstraint, QueryBondOrder } from '../../lib/queryDocument';
import { runQueryInWorker, runSmartsSearchInWorker } from '../../lib/queryWorkerClient';
import { moleculeStructureKey } from '../../lib/moleculeKey';
import { BOND_STEREO } from '../../../../../packages/chematic-contract/src/index';
import { expandPolymer, selectMarkushSubstituent, validateMarkushExpansion } from '../../lib/specialChemistry';
import { editNucleicAcid } from '../../lib/specialChemistry';
import type { NucleicAcidBase, NucleicAcidSugar } from '../../lib/queryDocument';

function semanticMarkushModel(document: QueryDocument, molecule: import('../../store/types').MoleculeDto) {
  return {
    schema: 'chematic.semantic.v1' as const,
    atom_ids: molecule.atoms.map((atom) => String(atom.id)),
    bond_ids: molecule.bonds.map((bond) => String(bond.id)),
    r_groups: (document.markush ?? []).map((definition) => ({
      id: definition.id,
      attachment_atoms: definition.attachmentAtomIds.map((id) => String(id)),
      alternatives: definition.allowedSubstituentSmarts,
      selected_alternative: null as number | null,
    })),
    polymer_units: [],
    extensions: {},
  };
}

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
  language,
  functionalGroups,
}: {
  bgColor: string;
  labelColor: string;
  textColor: string;
  language: AppLanguage;
  functionalGroups: string[];
}) {
  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        {language === 'ja' ? '官能基' : 'Functional groups'}
      </div>
      {functionalGroups.length === 0 ? (
        <div style={{ fontSize: '10px', color: labelColor }}>{language === 'ja' ? '検出なし' : 'None detected'}</div>
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
  language,
  validationErrors,
  validationWarnings,
}: {
  bgColor: string;
  labelColor: string;
  textColor: string;
  language: AppLanguage;
  validationErrors: string[];
  validationWarnings: string[];
}) {
  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        {language === 'ja' ? '検証' : 'Validation'}
      </div>
      {validationErrors.length === 0 ? (
        <div style={{ fontSize: '10px', color: '#58c97a' }}>✓ {language === 'ja' ? 'エラーなし' : 'No errors'}</div>
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
  language,
  smartsPattern,
  setSmartsPattern,
  smartsMatches,
  smartsStatus,
  handleSmartsSearch,
  selectSmartsMatches,
}: {
  bgColor: string;
  labelColor: string;
  textColor: string;
  theme: string;
  language: AppLanguage;
  smartsPattern: string;
  setSmartsPattern: (value: string) => void;
  smartsMatches: number[];
  smartsStatus: string;
  handleSmartsSearch: () => void;
  selectSmartsMatches: () => void;
}) {
  return (
    <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>
        {language === 'ja' ? 'SMARTS検索' : 'SMARTS search'}
      </div>
      <input
        type="text"
        placeholder={language === 'ja' ? '例：[#6]1:[#6]:[#6]:[#6]:[#6]:1' : 'e.g., [#6]1:[#6]:[#6]:[#6]:[#6]:[#6]:1'}
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
        {language === 'ja' ? '検索' : 'Search'}
      </button>
      {smartsMatches.length > 0 && (
        <>
          <div style={{ marginTop: '6px', fontSize: '10px', color: textColor }}>
            {language === 'ja' ? `${smartsMatches.length}個の原子が一致` : `Found ${smartsMatches.length} atoms matching`}
          </div>
          <button
            type="button"
            data-testid="select-smarts-matches"
            onClick={selectSmartsMatches}
            style={{
              marginTop: '6px',
              width: '100%',
              padding: '6px',
              backgroundColor: 'transparent',
              color: textColor,
              border: `1px solid ${labelColor}`,
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            {language === 'ja' ? '一致した原子を選択' : 'Select matching atoms'}
          </button>
        </>
      )}
      {smartsStatus && <div role="status" style={{ marginTop: '6px', fontSize: '10px', color: textColor }}>{smartsStatus}</div>}
    </div>
  );
}

function QueryEditorSection({
  molecule,
  theme,
  language,
  textColor,
  bgColor,
  labelColor,
  pushUndo,
  setMolecule,
}: {
  molecule: import('../../store/types').MoleculeDto;
  theme: string;
  language: AppLanguage;
  textColor: string;
  bgColor: string;
  labelColor: string;
  pushUndo: () => void;
  setMolecule: (molecule: import('../../store/types').MoleculeDto) => void;
}) {
  const [draft, setDraft] = useState<QueryDocument>(() => queryDocumentFromMolecule(molecule));
  const [queryUndoStack, setQueryUndoStack] = useState<QueryDocument[]>([]);
  const [queryRedoStack, setQueryRedoStack] = useState<QueryDocument[]>([]);
  const queryFileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [polymerRepeatCounts, setPolymerRepeatCounts] = useState<Record<string, string>>({});
  const [markushSelections, setMarkushSelections] = useState<Record<string, string>>({});
  const [semanticExpansionResults, setSemanticExpansionResults] = useState<Record<string, { smiles: string; sourceCount: number }>>({});
  const draftDirtyRef = useRef(false);
  const moleculeKeyRef = useRef(moleculeStructureKey(molecule));
  const validationRunRef = useRef(0);
  const validationControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => validationControllerRef.current?.abort(), []);
  useEffect(() => {
    const nextMoleculeKey = moleculeStructureKey(molecule);
    if (nextMoleculeKey === moleculeKeyRef.current) return;
    moleculeKeyRef.current = nextMoleculeKey;
    if (!draftDirtyRef.current) {
      // Keep the editor synchronized for ordinary drawing edits. Once the
      // user has loaded or edited a query, preserve that semantic document
      // across applying an expansion or another molecule update.
      setDraft(queryDocumentFromMolecule(molecule));
      setQueryUndoStack([]);
      setQueryRedoStack([]);
    }
  }, [molecule]);
  const commitDraft = (next: QueryDocument) => {
    setDraft((current) => {
      if (JSON.stringify(current) === JSON.stringify(next)) return current;
      draftDirtyRef.current = true;
      setQueryUndoStack((history) => [...history, current].slice(-50));
      setQueryRedoStack([]);
      return next;
    });
  };
  const updateDraft = (value: string) => {
    try {
      const parsed = JSON.parse(value) as QueryDocument;
      commitDraft(parsed);
      setStatus('');
    } catch {
      setStatus(language === 'ja' ? 'JSONが不正です' : 'Invalid JSON');
    }
  };
  const updateQueryAtom = (id: number, patch: Partial<QueryAtomConstraint>) => {
    commitDraft({
      ...draft,
      atoms: draft.atoms.map((atom) => atom.id === id ? { ...atom, constraint: { ...atom.constraint, ...patch } } : atom),
    });
    setStatus('');
  };
  const updateQueryBond = (id: number, order: QueryBondOrder) => {
    commitDraft({ ...draft, bonds: draft.bonds.map((bond) => bond.id === id ? { ...bond, constraint: { ...bond.constraint, order } } : bond) });
    setStatus('');
  };
  const undoQuery = () => {
    setQueryUndoStack((history) => {
      const previous = history.at(-1);
      if (!previous) return history;
      setDraft((current) => {
        setQueryRedoStack((redo) => [current, ...redo].slice(0, 50));
        return previous;
      });
      setStatus('');
      return history.slice(0, -1);
    });
  };
  const redoQuery = () => {
    setQueryRedoStack((history) => {
      const next = history[0];
      if (!next) return history;
      setDraft((current) => {
        setQueryUndoStack((undo) => [...undo, current].slice(-50));
        return next;
      });
      setStatus('');
      return history.slice(1);
    });
  };
  const exportQuery = () => {
    try {
      const content = serializeQueryDocument(draft);
      const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'query.schematic-query.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(language === 'ja' ? 'query JSONを保存しました' : 'Saved query JSON');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const importQuery = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseQueryDocument(await file.text());
      if (!imported) throw new Error(language === 'ja' ? 'query JSONの形式または内容が不正です' : 'Query JSON is invalid or unsupported');
      commitDraft(imported);
      setStatus(language === 'ja' ? 'query JSONを読み込みました' : 'Loaded query JSON');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      event.target.value = '';
    }
  };
  const json = JSON.stringify(draft, null, 2);
  const validate = () => {
    const validationRun = ++validationRunRef.current;
    validationControllerRef.current?.abort();
    const validationController = new AbortController();
    validationControllerRef.current = validationController;
    const errors = validateQueryDocument(draft);
    if (errors.length) setStatus(errors.map((error) => `${error.path}: ${error.message}`).join('; '));
    else if (draft.atoms.length === 0) setStatus(language === 'ja' ? '有効なクエリ; SMARTS: (空); 一致: 0' : 'Valid query; SMARTS: (empty); matches: 0');
    else {
      setStatus(language === 'ja' ? '有効なクエリ; WASMワーカーで確認中…' : 'Valid query; checking WASM worker…');
      void runQueryInWorker(draft, molecule, validationController.signal)
        .then((result) => {
          if (validationRun !== validationRunRef.current) return;
          setStatus(language === 'ja' ? `有効なクエリ; SMARTS: ${result.pattern}; 一致: ${result.matches.length}` : `Valid query; SMARTS: ${result.pattern}; matches: ${result.matches.length}`);
        })
        .catch((error) => {
          if (validationRun !== validationRunRef.current) return;
          setStatus(error instanceof Error ? error.message : String(error));
        });
    }
  };
  const apply = () => {
    try {
      const next = queryDocumentToMolecule(draft);
      pushUndo();
      setMolecule(next);
      setStatus(language === 'ja' ? 'クエリを損なわずに適用しました' : 'Applied without query loss');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const expand = (id: string) => {
    const repeatCount = Number(polymerRepeatCounts[id] ?? '2');
    try {
      commitDraft(expandPolymer(draft, id, repeatCount));
      setStatus(language === 'ja' ? `ポリマー反復単位を${repeatCount}回に展開しました。クエリJSONとして保持されます。` : `Expanded the polymer repeat unit ${repeatCount} times. It remains preserved as query JSON.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const selectSubstituent = (definitionId: string, substituentSmarts: string) => {
    try {
      selectMarkushSubstituent(draft, definitionId, substituentSmarts);
      setMarkushSelections((selections) => ({ ...selections, [definitionId]: substituentSmarts }));
      setStatus(language === 'ja' ? `Markush ${definitionId} に ${substituentSmarts} を選択しました。クエリJSONの意味は保持されます。` : `Selected ${substituentSmarts} for Markush ${definitionId}. Query JSON semantics remain preserved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const expandMarkushSelection = (definitionId: string) => {
    const substituent = markushSelections[definitionId];
    const definition = (draft.markush ?? []).find((candidate) => candidate.id === definitionId);
    if (!definition || !substituent) {
      setStatus(language === 'ja' ? '先にMarkushの置換候補を選択してください。' : 'Choose a Markush substituent first.');
      return;
    }
    try {
      const alternative = definition.allowedSubstituentSmarts.indexOf(substituent);
      if (alternative < 0) throw new Error(`Substituent is not allowed by Markush definition: ${substituent}`);
      validateMarkushExpansion(draft, definitionId, substituent, molecule);
      const model = semanticMarkushModel(draft, molecule);
      wasmBridge.validateSemanticModel(model);
      const selectedModel = wasmBridge.applySemanticCommand(model, { group_id: definitionId, alternative });
      const expanded = wasmBridge.expandSemanticModel(selectedModel, molecule);
      setSemanticExpansionResults((results) => ({ ...results, [definitionId]: { smiles: expanded.smiles, sourceCount: expanded.source_to_expanded[definitionId]?.length ?? 0 } }));
      setStatus(language === 'ja' ? `Markush ${definitionId} を展開しました。結果は確認用で、元のクエリJSONは保持されます。` : `Expanded Markush ${definitionId}. The result is for review; the source query JSON remains preserved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const applyMarkushExpansion = (definitionId: string) => {
    const result = semanticExpansionResults[definitionId];
    if (!result) return;
    try {
      const expandedMolecule = wasmBridge.parseMolecule(result.smiles);
      pushUndo();
      setMolecule(expandedMolecule);
      setStatus(language === 'ja' ? `Markush ${definitionId} の展開結果を分子へ適用しました。クエリJSONは保持されています。` : `Applied the Markush ${definitionId} expansion to the molecule. Query JSON remains preserved.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const updateResidue = (definitionId: string, residueId: string, patch: { base?: NucleicAcidBase; sugar?: NucleicAcidSugar; phosphateAttached?: boolean }) => {
    try {
      const definition = (draft.nucleicAcids ?? []).find((candidate) => candidate.id === definitionId);
      const residue = definition?.residues.find((candidate) => candidate.id === residueId);
      if (!definition || !residue) throw new Error(`Unknown nucleic-acid residue: ${residueId}`);
      commitDraft(editNucleicAcid(draft, definitionId, { residues: definition.residues.map((candidate) => candidate.id === residueId ? { ...candidate, ...patch } : candidate) }));
      setStatus(language === 'ja' ? `核酸残基 ${residueId} を更新しました。` : `Updated nucleic-acid residue ${residueId}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };
  const specialCount = (draft.markush?.length ?? 0) + (draft.polymers?.length ?? 0) + (draft.nucleicAcids?.length ?? 0) + (draft.opaque?.length ?? 0);
  return <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '4px', border: `1px solid ${labelColor}` }}>
    <div style={{ fontSize: '11px', fontWeight: 'bold', color: textColor, marginBottom: '8px' }}>{language === 'ja' ? 'クエリエディタ' : 'Query editor'}</div>
    {specialCount > 0 && <div role="status" style={{ marginBottom: '6px', padding: '6px', color: textColor, backgroundColor: theme === 'dark' ? '#3f3424' : '#fff4d6', border: '1px solid #d89b32', borderRadius: '3px', fontSize: '10px' }}>
      {language === 'ja' ? `特殊化学データ ${specialCount}件: 通常分子へ変換せず、クエリJSONとして保存されます。` : `${specialCount} special-chemistry item(s): preserved as query JSON and not flattened into an ordinary molecule.`}
    </div>}
    <details open style={{ marginBottom: '6px' }}>
      <summary style={{ cursor: 'pointer', color: textColor, fontSize: '10px' }}>
        {language === 'ja' ? '構造化制約（原子・結合）' : 'Structured constraints (atoms and bonds)'}
      </summary>
      <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {draft.atoms.map((atom) => {
          const selectedElement = atom.constraint.wildcard ? '*' : atom.constraint.elements?.length === 1 ? atom.constraint.elements[0] : '';
          const selectedAromaticity = atom.constraint.aromatic === undefined ? '' : atom.constraint.aromatic ? 'aromatic' : 'aliphatic';
          const selectedRing = atom.constraint.ring === undefined ? '' : atom.constraint.ring ? 'ring' : 'non-ring';
          return <div key={atom.id} data-testid={`query-atom-constraint-${atom.id}`} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(76px, 1fr) repeat(5, minmax(52px, 0.7fr))', gap: '4px', alignItems: 'center', fontSize: '9px', color: textColor }}>
            <span>{language === 'ja' ? `原子 ${atom.id}` : `Atom ${atom.id}`}</span>
            <select aria-label={`Query atom ${atom.id} element`} value={selectedElement} onChange={(event) => {
              const value = event.target.value;
              updateQueryAtom(atom.id, value === '*' ? { elements: undefined, wildcard: true } : { elements: [value], wildcard: false });
            }}>
              <option value="">{language === 'ja' ? '複数/未指定' : 'Multiple/unspecified'}</option>
              {['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I', '*'].map((element) => <option key={element} value={element}>{element === '*' ? 'Any (*)' : element}</option>)}
            </select>
            <input aria-label={`Query atom ${atom.id} charge`} type="number" step="1" placeholder="charge" value={atom.constraint.charge ?? ''} onChange={(event) => updateQueryAtom(atom.id, { charge: event.target.value === '' ? undefined : Number(event.target.value) })} />
            <input aria-label={`Query atom ${atom.id} hydrogens`} type="number" min="0" step="1" placeholder="H" value={atom.constraint.hydrogens ?? ''} onChange={(event) => updateQueryAtom(atom.id, { hydrogens: event.target.value === '' ? undefined : Number(event.target.value) })} />
            <input aria-label={`Query atom ${atom.id} valence`} type="number" min="0" step="1" placeholder="valence" value={atom.constraint.valence ?? ''} onChange={(event) => updateQueryAtom(atom.id, { valence: event.target.value === '' ? undefined : Number(event.target.value) })} />
            <select aria-label={`Query atom ${atom.id} aromaticity`} value={selectedAromaticity} onChange={(event) => updateQueryAtom(atom.id, { aromatic: event.target.value === '' ? undefined : event.target.value === 'aromatic' })}>
              <option value="">Aromaticity</option><option value="aromatic">Aromatic</option><option value="aliphatic">Aliphatic</option>
            </select>
            <select aria-label={`Query atom ${atom.id} ring`} value={selectedRing} onChange={(event) => updateQueryAtom(atom.id, { ring: event.target.value === '' ? undefined : event.target.value === 'ring' })}>
              <option value="">Ring</option><option value="ring">In ring</option><option value="non-ring">Not in ring</option>
            </select>
          </div>;
        })}
        {draft.bonds.map((bond) => <label key={bond.id} style={{ display: 'flex', gap: '5px', alignItems: 'center', fontSize: '9px', color: textColor }}>
          {language === 'ja' ? `結合 ${bond.id} (${bond.from}–${bond.to})` : `Bond ${bond.id} (${bond.from}–${bond.to})`}
          <select aria-label={`Query bond ${bond.id} order`} value={bond.constraint.order} onChange={(event) => updateQueryBond(bond.id, event.target.value as QueryBondOrder)}>
            {(['single', 'double', 'triple', 'aromatic', 'any', 'single-or-aromatic', 'single-or-double'] as QueryBondOrder[]).map((order) => <option key={order} value={order}>{order}</option>)}
          </select>
        </label>)}
        {draft.atoms.length === 0 && <span style={{ fontSize: '9px', color: labelColor }}>{language === 'ja' ? '原子がありません' : 'No query atoms'}</span>}
      </div>
    </details>
    {(draft.markush ?? []).map((definition) => <div key={definition.id} style={{ marginBottom: '6px', fontSize: '10px', color: textColor }}>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <span>{language === 'ja' ? `Markush ${definition.label}（結合点${definition.attachmentAtomIds.length}）` : `Markush ${definition.label} (${definition.attachmentAtomIds.length} attachment${definition.attachmentAtomIds.length === 1 ? '' : 's'})`}</span>
        <select aria-label={language === 'ja' ? `${definition.id}の置換候補` : `${definition.id} substituent`} value={markushSelections[definition.id] ?? ''} onChange={(event) => selectSubstituent(definition.id, event.target.value)} style={{ flex: 1, minWidth: 0 }}>
          <option value="">{language === 'ja' ? '置換候補を選択…' : 'Choose substituent…'}</option>
          {definition.allowedSubstituentSmarts.map((substituent) => <option key={substituent} value={substituent}>{substituent}</option>)}
        </select>
        <button type="button" onClick={() => expandMarkushSelection(definition.id)} disabled={!markushSelections[definition.id]} aria-label={language === 'ja' ? `${definition.id}を展開` : `Expand ${definition.id}`}>{language === 'ja' ? '展開' : 'Expand'}</button>
      </div>
      {semanticExpansionResults[definition.id] && <div data-testid={`markush-expansion-${definition.id}`} role="status" style={{ marginTop: '3px', padding: '4px', color: labelColor, backgroundColor: theme === 'dark' ? '#202b38' : '#f7f9fc', overflowWrap: 'anywhere' }}>
        {language === 'ja' ? '展開SMILES' : 'Expanded SMILES'}: {semanticExpansionResults[definition.id].smiles} ({semanticExpansionResults[definition.id].sourceCount} {language === 'ja' ? '件のsource mapping' : 'source mappings'})
        <button type="button" onClick={() => applyMarkushExpansion(definition.id)} style={{ display: 'block', marginTop: '4px' }} aria-label={language === 'ja' ? `${definition.id}の展開結果を適用` : `Apply ${definition.id} expansion`}>{language === 'ja' ? '分子へ適用' : 'Apply to molecule'}</button>
      </div>}
    </div>)}
    {(draft.polymers ?? []).map((polymer) => <div key={polymer.id} style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px', fontSize: '10px', color: textColor }}>
      <span>{language === 'ja' ? `反復単位 ${polymer.id}` : `Repeat unit ${polymer.id}`}</span>
      <input type="number" min="1" max="100" aria-label={language === 'ja' ? `${polymer.id}の反復回数` : `${polymer.id} repeat count`} value={polymerRepeatCounts[polymer.id] ?? '2'} onChange={(event) => setPolymerRepeatCounts((counts) => ({ ...counts, [polymer.id]: event.target.value }))} style={{ width: '48px' }} />
      <button type="button" onClick={() => expand(polymer.id)}>{language === 'ja' ? '展開' : 'Expand'}</button>
    </div>)}
    {(draft.nucleicAcids ?? []).flatMap((definition) => definition.residues.map((residue) => <div key={`${definition.id}:${residue.id}`} style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '6px', fontSize: '10px', color: textColor }}>
      <span>{language === 'ja' ? `核酸 ${residue.id}` : `Nucleic acid ${residue.id}`}</span>
      <select aria-label={`${residue.id} base`} value={residue.base} onChange={(event) => updateResidue(definition.id, residue.id, { base: event.target.value as NucleicAcidBase })}>
        {(['A', 'C', 'G', 'T', 'U', 'other'] as NucleicAcidBase[]).map((base) => <option key={base} value={base}>{base}</option>)}
      </select>
      <select aria-label={`${residue.id} sugar`} value={residue.sugar} onChange={(event) => updateResidue(definition.id, residue.id, { sugar: event.target.value as NucleicAcidSugar })}>
        {(['ribose', 'deoxyribose', 'unknown'] as NucleicAcidSugar[]).map((sugar) => <option key={sugar} value={sugar}>{sugar}</option>)}
      </select>
      <label><input type="checkbox" aria-label={`${residue.id} phosphate attached`} checked={residue.phosphateAttached === true} onChange={(event) => updateResidue(definition.id, residue.id, { phosphateAttached: event.target.checked })} /> P</label>
    </div>))}
    <textarea aria-label={language === 'ja' ? 'クエリドキュメントエディタ' : 'Query document editor'} value={json} onChange={(event) => updateDraft(event.target.value)} rows={8} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace', fontSize: '9px', backgroundColor: theme === 'dark' ? '#1e2530' : '#fff', color: textColor, border: `1px solid ${labelColor}` }} />
    <input ref={queryFileInputRef} data-testid="query-file-input" type="file" accept=".json,application/json" onChange={importQuery} style={{ display: 'none' }} />
    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
      <button type="button" onClick={undoQuery} disabled={queryUndoStack.length === 0} aria-label={language === 'ja' ? 'クエリを元に戻す' : 'Undo query edit'}>{language === 'ja' ? '元に戻す' : 'Undo'}</button>
      <button type="button" onClick={redoQuery} disabled={queryRedoStack.length === 0} aria-label={language === 'ja' ? 'クエリをやり直す' : 'Redo query edit'}>{language === 'ja' ? 'やり直す' : 'Redo'}</button>
      <button type="button" onClick={() => queryFileInputRef.current?.click()} aria-label={language === 'ja' ? 'query JSONを読み込む' : 'Import query JSON'}>{language === 'ja' ? '読込' : 'Import'}</button>
      <button type="button" onClick={exportQuery} aria-label={language === 'ja' ? 'query JSONを保存する' : 'Export query JSON'}>{language === 'ja' ? '保存' : 'Export'}</button>
      <button onClick={validate} style={{ flex: 1 }}>{language === 'ja' ? '検証 / SMARTS' : 'Validate / SMARTS'}</button>
      <button onClick={apply} style={{ flex: 1 }} title={language === 'ja' ? 'クエリを通常の分子構造として適用します' : 'Apply the query as a concrete molecule'}>{language === 'ja' ? '分子として適用' : 'Apply as molecule'}</button>
    </div>
    {status && <div role="status" style={{ marginTop: '6px', color: textColor, fontSize: '10px', overflowWrap: 'anywhere' }}>{status}</div>}
  </div>;
}

export function InspectorPanel({ mode = 'properties' }: { mode?: 'properties' | 'query' | 'stereo' }) {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const selectedAtomIdForInspector = useUIStore((s) => s.selectedAtomIdForInspector);
  const selectedBondIdForInspector = useUIStore((s) => s.selectedBondIdForInspector);
  const setActiveSidebarPanel = useUIStore((s) => s.setActiveSidebarPanel);
  const molecule = useMoleculeStore((s) => s.molecule);
  const setMolecule = useMoleculeStore((s) => s.setMolecule);
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
  const selectedBond: BondDto | null = molecule.bonds.find((b) => b.id === selectedBondIdForInspector) ?? null;
  const updateAtom = useMoleculeStore((s) => s.updateAtom);
  const updateBond = useMoleculeStore((s) => s.updateBond);
  const pushUndo = useMoleculeStore((s) => s.pushUndo);
  const [smartsPattern, setSmartsPattern] = useState('');
  const [smartsMatches, setSmartsMatches] = useState<number[]>([]);
  const [smartsStatus, setSmartsStatus] = useState('');
  const smartsSearchControllerRef = useRef<AbortController | null>(null);
  const moleculeKey = useMemo(() => moleculeStructureKey(molecule), [molecule]);
  const [validationState, setValidationState] = useState<{ sourceKey: string; errors: string[]; warnings: string[] }>({ sourceKey: '', errors: [], warnings: [] });
  const [functionalGroupState, setFunctionalGroupState] = useState<{ sourceKey: string; groups: string[] }>({ sourceKey: '', groups: [] });
  const visibleValidation = validationState.sourceKey === moleculeKey ? validationState : { sourceKey: moleculeKey, errors: [], warnings: [] };
  const visibleFunctionalGroups = functionalGroupState.sourceKey === moleculeKey ? functionalGroupState.groups : [];

  // A result is meaningful only for the structure it searched. Selection is
  // deliberately excluded from moleculeStructureKey, so selecting matches
  // does not erase the result; an actual atom/bond edit does.
  useEffect(() => {
    smartsSearchControllerRef.current?.abort();
    // This effect invalidates derived async-result state at an external
    // document identity boundary; keeping stale matches visible is worse
    // than the intentional synchronous reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSmartsMatches([]);
    setSmartsStatus('');
  }, [moleculeKey]);

  // Validate molecule. `result?.errors ?? []` used to silently mask a real
  // bug: validate_molecule returned a serde_json::json!() Value, which
  // serde_wasm_bindgen serializes as a JS Map, so `.errors` was always
  // undefined regardless of the actual validation outcome — the fallback
  // fired on every call, not just during startup. Fixed on the Rust side
  // (ValidationResultDto, a concrete #[derive(Serialize)] struct, serializes
  // as a plain object). The `?? []`/try-catch stays as a defensive guard,
  // not a workaround for anything currently broken.
  useEffect(() => {
    const currentMolecule = useMoleculeStore.getState().molecule;
    try {
      const result = wasmBridge.validateMolecule(currentMolecule);
      // WASM analysis is the effect boundary; the source key prevents stale publication.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValidationState({ sourceKey: moleculeKey, errors: result?.errors ?? [], warnings: result?.warnings ?? [] });
    } catch {
      setValidationState({ sourceKey: moleculeKey, errors: ['Validation error'], warnings: [] });
    }
  }, [moleculeKey]);

  // SMARTS search
  useEffect(() => () => smartsSearchControllerRef.current?.abort(), []);

  const handleSmartsSearch = async () => {
    smartsSearchControllerRef.current?.abort();
    if (!smartsPattern.trim()) {
      setSmartsMatches([]);
      setSmartsStatus(language === 'ja' ? 'SMARTSパターンを入力してください' : 'Enter a SMARTS pattern');
      return;
    }
    const controller = new AbortController();
    smartsSearchControllerRef.current = controller;
    setSmartsStatus(language === 'ja' ? '検索中…' : 'Searching…');
    try {
      const result = await runSmartsSearchInWorker(smartsPattern, molecule, controller.signal);
      if (controller.signal.aborted) return;
      setSmartsMatches(result.matches);
      setSmartsStatus(result.matches.length === 0
        ? (language === 'ja' ? '一致する原子はありません' : 'No matching atoms')
        : (language === 'ja' ? `${result.matches.length}個の原子が一致` : `Found ${result.matches.length} atoms matching`));
    } catch (error) {
      if (controller.signal.aborted) return;
      setSmartsMatches([]);
      setSmartsStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const selectSmartsMatches = () => {
    const moleculeStore = useMoleculeStore.getState();
    moleculeStore.deselectAll();
    const availableIds = new Set(moleculeStore.molecule.atoms.map((atom) => atom.id));
    const matchingIds = smartsMatches.filter((id) => availableIds.has(id));
    matchingIds.forEach((id) => moleculeStore.selectAtom(id, true));
    if (matchingIds.length > 0) {
      useUIStore.getState().setSelectedAtomIdForInspector(matchingIds[0]);
      useUIStore.getState().setActiveSidebarPanel('inspector');
    }
  };

  // Identify functional groups
  useEffect(() => {
    const currentMolecule = useMoleculeStore.getState().molecule;
    if (currentMolecule.atoms.length > 0) {
      try {
        const groups = wasmBridge.identifyFunctionalGroups(currentMolecule);
        // WASM analysis is the effect boundary; the source key prevents stale publication.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFunctionalGroupState({ sourceKey: moleculeKey, groups });
      } catch {
        setFunctionalGroupState({ sourceKey: moleculeKey, groups: [] });
      }
    } else {
      setFunctionalGroupState({ sourceKey: moleculeKey, groups: [] });
    }
  }, [moleculeKey]);

  const bgColor = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const inputBg = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const inputBorder = theme === 'dark' ? '#3a4a57' : '#d0d0d0';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';

  const handleAtomUpdate = (key: keyof AtomDto, value: any) => {
    if (selectedAtom) {
      pushUndo();
      updateAtom(selectedAtom.id, { [key]: value });
    }
  };

  const handleBondUpdate = (key: keyof BondDto, value: any) => {
    if (selectedBond) {
      pushUndo();
      updateBond(selectedBond.id, { [key]: value });
    }
  };

  if (mode === 'query') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ color: textColor, fontSize: '12px', fontWeight: 600 }}>{language === 'ja' ? '高度なクエリ機能' : 'Advanced query tools'}</div>
        <SmartsSection bgColor={bgColor} labelColor={labelColor} textColor={textColor} theme={theme} language={language} smartsPattern={smartsPattern} setSmartsPattern={setSmartsPattern} smartsMatches={smartsMatches} smartsStatus={smartsStatus} handleSmartsSearch={handleSmartsSearch} selectSmartsMatches={selectSmartsMatches} />
        <QueryEditorSection molecule={molecule} theme={theme} language={language} textColor={textColor} bgColor={bgColor} labelColor={labelColor} pushUndo={pushUndo} setMolecule={setMolecule} />
      </div>
    );
  }

  if (mode === 'stereo') {
    if (!selectedBond) {
      return <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>{language === 'ja' ? '結合を選択して立体表現を設定' : 'Select a bond to set its stereo representation'}</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <strong style={{ color: textColor, fontSize: '12px' }}>{language === 'ja' ? `結合 ${selectedBond.id} の立体化学` : `Bond ${selectedBond.id} stereochemistry`}</strong>
        {[
          { label: language === 'ja' ? 'なし' : 'None', value: BOND_STEREO.None },
          { label: language === 'ja' ? '実線くさび' : 'Solid wedge', value: BOND_STEREO.WedgeUp },
          { label: language === 'ja' ? '破線くさび' : 'Hashed wedge', value: BOND_STEREO.WedgeDown },
        ].map((option) => <button key={option.value} type="button" onClick={() => handleBondUpdate('stereo', option.value)} aria-pressed={(selectedBond.stereo ?? 0) === option.value}>{option.label}</button>)}
      </div>
    );
  }

  const queryLink = (
    <button type="button" onClick={() => setActiveSidebarPanel('query')} style={{ width: '100%' }}>
      {language === 'ja' ? '高度なクエリ機能' : 'Advanced query tools'}
    </button>
  );

  if (!selectedAtom && !selectedBond) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {queryLink}
        <div style={{ color: labelColor, fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
          {language === 'ja' ? '原子または結合を選択して検査' : 'Select an atom or bond to inspect'}
        </div>
        <FunctionalGroupsSection bgColor={bgColor} labelColor={labelColor} textColor={textColor} language={language} functionalGroups={visibleFunctionalGroups} />
        <ValidationSection bgColor={bgColor} labelColor={labelColor} textColor={textColor} language={language} validationErrors={visibleValidation.errors} validationWarnings={visibleValidation.warnings} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {queryLink}
      {selectedAtom && (
        <>
          <div>
            <label style={{ fontSize: '11px', color: labelColor }}>{language === 'ja' ? '元素' : 'Element'}</label>
            <ElementPicker
              currentElement={selectedAtom.element}
              onSelect={(el) => handleAtomUpdate('element', el)}
              theme={theme}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor, display: 'block', marginBottom: '6px' }}>
              {language === 'ja' ? '電荷' : 'Charge'}
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
              {language === 'ja' ? '同位体（質量数）' : 'Isotope (mass number)'}
            </label>
            <input
              type="number"
              min="1"
              placeholder={language === 'ja' ? '天然存在比' : 'natural abundance'}
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

          <div>
            <label htmlFor="atom-map-number" style={{ fontSize: '11px', color: labelColor, display: 'block', marginBottom: '6px' }}>
              {language === 'ja' ? '原子マップ番号' : 'Atom map number'}
            </label>
            <input
              id="atom-map-number"
              data-testid="atom-map-number"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              aria-describedby="atom-map-help"
              value={selectedAtom.atom_map || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  handleAtomUpdate('atom_map', 0);
                  return;
                }
                const parsed = Number(value);
                if (Number.isSafeInteger(parsed) && parsed >= 0) handleAtomUpdate('atom_map', parsed);
              }}
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
            <div id="atom-map-help" style={{ fontSize: '9px', color: labelColor, marginTop: '4px' }}>
              {language === 'ja' ? '反応の対応原子を同じ番号で指定します。0は未指定です。' : 'Use the same number to identify an atom across a reaction; 0 means unspecified.'}
            </div>
          </div>

          <div style={{ fontSize: '10px', color: labelColor, padding: '8px', backgroundColor: theme === 'dark' ? '#2f3a47' : '#f3f5f8', borderRadius: '3px' }}>
            <strong>{language === 'ja' ? '原子ID:' : 'Atom ID:'}</strong> {selectedAtom.id}
            <br />
            <strong>{language === 'ja' ? '位置:' : 'Position:'}</strong> ({selectedAtom.x.toFixed(1)}, {selectedAtom.y.toFixed(1)})
          </div>
        </>
      )}

      {selectedBond && (
        <>
          <div>
            <label htmlFor="inspector-bond-order" style={{ fontSize: '11px', color: labelColor }}>{language === 'ja' ? '結合次数' : 'Bond order'}</label>
            <select
              id="inspector-bond-order"
              aria-label={language === 'ja' ? '結合次数' : 'Bond order'}
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
              <option value={1}>{language === 'ja' ? '単結合' : 'Single'}</option>
              <option value={2}>{language === 'ja' ? '二重結合' : 'Double'}</option>
              <option value={3}>{language === 'ja' ? '三重結合' : 'Triple'}</option>
              <option value={4}>{language === 'ja' ? '芳香族' : 'Aromatic'}</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: labelColor, display: 'block', marginBottom: '6px' }}>
              {language === 'ja' ? '立体化学' : 'Stereo'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {[
                { label: language === 'ja' ? 'なし' : 'None', value: BOND_STEREO.None },
                { label: language === 'ja' ? '⌟ 太線くさび' : '⌟ Wedge', value: BOND_STEREO.WedgeUp },
                { label: language === 'ja' ? '⌞ 破線くさび' : '⌞ Dash', value: BOND_STEREO.WedgeDown },
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
            <strong>{language === 'ja' ? '結合ID:' : 'Bond ID:'}</strong> {selectedBond.id}
            <br />
            <strong>{language === 'ja' ? '始点:' : 'From:'}</strong> {selectedBond.from} <strong>{language === 'ja' ? '終点:' : 'To:'}</strong> {selectedBond.to}
          </div>
        </>
      )}

    </div>
  );
}
