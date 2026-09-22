import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useMoleculeStore } from '../../store/moleculeStore';
import { executeReaction, SMIRKS_TEMPLATES } from '../../lib/reactions';
import { useReactionSchemeStore } from '../../store/reactionSchemeStore';
import { MechanismStep, MoleculeDto, ReactionCondition } from '../../store/types';
import { exportSchemeAsJSON, importSchemeFromJSON, exportSchemeAsSVG, exportSchemeAsCSV, SchemeFontScale, SchemePageSize, SchemeSvgPreset } from '../../lib/schemeExport';
import { exportRxnViaDocumentAdapter, importRxnViaDocumentAdapter, rxnSchemeV2000Losses, rxnV2000Losses } from '../../lib/rxnExport';
import { assertPublicationLayout } from '../../lib/layoutMetrics';
import { runAnalysisInWorker } from '../../lib/analysisWorkerClient';
import * as wasmBridge from '../../wasm/wasmBridge';
import { exportLossMessage, exportLosses } from '../../lib/exportLoss';
import { parseComponentIds, parseReactionCoefficients } from '../../lib/reactionComponentEditor';
import { assertReactionDocument } from '../../lib/reactionDocumentGate';
import { suggestReactionCoefficients } from '../../lib/reactionSchemeUtils';
import { ReactionExportSection } from './ReactionExportSection';
import { ReactionExecutor } from './ReactionExecutor';
import { ReactionAnalysisPanels } from './ReactionAnalysisPanels';
import { ReactionStepEditor } from './ReactionStepEditor';
import { ReactionWorkflowNavigator, ReactionWorkflowStage, ReactionWorkflowStageState } from './ReactionWorkflowNavigator';
import { getElectronApi } from '../../electronApi';

export function ReactionPanel() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [smirlksInput, setSmirlksInput] = useState<string>('');
  const [multiReactantSmiles, setMultiReactantSmiles] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('carboxylic_acid_to_amide');
  const [reactionError, setReactionError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [svgPreset, setSvgPreset] = useState<SchemeSvgPreset>('journal');
  const [fontScale, setFontScale] = useState<SchemeFontScale>('standard');
  const [pageSize, setPageSize] = useState<SchemePageSize>('auto');
  const [agentDrafts, setAgentDrafts] = useState<Record<string, string>>({});
  const [coefficientDrafts, setCoefficientDrafts] = useState<Record<string, string>>({});
  const [componentIdDrafts, setComponentIdDrafts] = useState<Record<string, string>>({});
  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState<ReactionWorkflowStage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const schemeLayout = useReactionSchemeStore((s) => s.schemeLayout);
  const isJapanese = language === 'ja';

  // Single source of truth for the reaction scheme (steps, conditions, arrows,
  // atom mapping, green metrics). Previously this panel also read/wrote a second,
  // disconnected scheme in moleculeStore — see internal_docs/ROADMAP.md v0.3 notes.
  const storedScheme = useReactionSchemeStore((s) => s.scheme);
  const scheme = storedScheme ?? {
    id: 'pending-reaction-scheme',
    title: '',
    description: '',
    steps: [],
    currentStepIndex: 0,
    viewMode: 'step' as const,
  };
  const createScheme = useReactionSchemeStore((s) => s.createScheme);
  const loadScheme = useReactionSchemeStore((s) => s.loadScheme);
  const updateSchemeInfo = useReactionSchemeStore((s) => s.updateSchemeInfo);
  const addStepToScheme = useReactionSchemeStore((s) => s.addStep);
  const removeStepFromScheme = useReactionSchemeStore((s) => s.removeStep);
  const reorderSteps = useReactionSchemeStore((s) => s.reorderSteps);
  const updateStep = useReactionSchemeStore((s) => s.updateStep);
  const getCurrentStep = useReactionSchemeStore((s) => s.getCurrentStep);
  const nextStep = useReactionSchemeStore((s) => s.nextStep);
  const previousStep = useReactionSchemeStore((s) => s.previousStep);
  const canGoNext = useReactionSchemeStore((s) => s.canGoNext);
  const canGoPrevious = useReactionSchemeStore((s) => s.canGoPrevious);
  const atomMappings = useReactionSchemeStore((s) => s.atomMappings);
  const reactionClassification = useReactionSchemeStore((s) => s.reactionClassification);
  const greenMetrics = useReactionSchemeStore((s) => s.greenMetrics);
  const reactionDiagnostics = useReactionSchemeStore((s) => s.reactionDiagnostics);
  const atomLabelsVisible = useReactionSchemeStore((s) => s.atomLabelsVisible);
  const mappingLinesVisible = useReactionSchemeStore((s) => s.mappingLinesVisible);
  const toggleAtomLabels = useReactionSchemeStore((s) => s.toggleAtomLabels);
  const toggleMappingLines = useReactionSchemeStore((s) => s.toggleMappingLines);

  // The scheme is created lazily on first mount so the panel always has one to
  // edit, matching the previous always-present UX (addStep/removeStep already
  // recalculate atom mappings, classification, and green metrics themselves).
  useEffect(() => {
    if (!storedScheme) {
      createScheme('', '');
    }
  }, [storedScheme, createScheme]);

  const bgColor = theme === 'dark' ? '#2f3a47' : '#ffffff';
  const borderColor = theme === 'dark' ? '#3a4a57' : '#e0e0e0';
  const textColor = theme === 'dark' ? '#d8deea' : '#1d2430';
  const labelColor = theme === 'dark' ? '#a0a8b8' : '#555555';
  const inputBg = theme === 'dark' ? '#1e2530' : '#f9f9f9';
  const accentColor = '#4d8dff';

  const currentStep = scheme.steps[scheme.currentStepIndex];
  const workflowStages: ReactionWorkflowStageState[] = [
    {
      id: 'components',
      label: isJapanese ? '構成要素' : 'Components',
      complete: scheme.steps.length > 0 && scheme.steps.every((step) => step.reactants.length > 0 && step.products.length > 0),
    },
    {
      id: 'mapping',
      label: isJapanese ? 'マッピング' : 'Mapping',
      complete: Boolean(atomMappings && atomMappings.totalMappedAtoms > 0),
    },
    {
      id: 'validation',
      label: isJapanese ? '検証' : 'Validation',
      complete: reactionDiagnostics?.status === 'verified',
    },
    {
      id: 'mechanism',
      label: isJapanese ? '機構・条件' : 'Mechanism / conditions',
      complete: scheme.steps.length > 0 && scheme.steps.some((step) => step.arrows.length > 0 || Object.values(step.conditions ?? {}).some(Boolean)),
    },
    {
      id: 'review',
      label: isJapanese ? 'レビュー' : 'Review',
      complete: Boolean(scheme.title.trim() || scheme.description.trim()),
    },
    {
      id: 'export',
      label: isJapanese ? '出力' : 'Export',
      complete: false,
    },
  ];

  const activeWorkflowStage = selectedWorkflowStage ?? workflowStages.find((stage) => !stage.complete)?.id ?? 'export';
  const focusWorkflowStage = (stage: ReactionWorkflowStage) => {
    setSelectedWorkflowStage(stage);
    if (stage === 'components' && currentStep) setExpandedStepId(currentStep.id);
    const target = document.querySelector<HTMLElement>(`[data-workflow-stage="${stage}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleAddStep = () => {
    const newStep: MechanismStep = {
      id: `step-${Date.now()}`,
      reactants: [],
      products: [],
      arrows: [],
      mechanismType: 'sn2',
      conditions: {},
      arrowType: 'single',
    };
    addStepToScheme(newStep);
  };

  const handleRemoveStep = (stepId: string) => {
    removeStepFromScheme(stepId);
  };

  const handleMoveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= scheme.steps.length) return;
    const indices = scheme.steps.map((_, stepIndex) => stepIndex);
    [indices[index], indices[target]] = [indices[target], indices[index]];
    reorderSteps(indices);
  };

  const handleUpdateConditions = (stepId: string, conditions: Partial<ReactionCondition>) => {
    const step = scheme?.steps.find((s) => s.id === stepId);
    if (step) {
      updateStep(stepId, { conditions: { ...step.conditions, ...conditions } });
    }
  };

  const handleArrowTypeChange = (stepId: string, arrowType: 'single' | 'double' | 'equilibrium' | 'retro') => {
    updateStep(stepId, { arrowType });
  };

  const commitCoefficients = (stepId: string, role: 'reactant' | 'product', value: string) => {
    const step = scheme.steps.find((candidate) => candidate.id === stepId);
    if (!step) return;
    const expectedCount = role === 'reactant' ? step.reactants.length : step.products.length;
    const coefficients = parseReactionCoefficients(value, expectedCount);
    if (coefficients === null) {
      setStatus(isJapanese
        ? `${role === 'reactant' ? '反応物' : '生成物'}の係数は${expectedCount}件の0より大きい有限数で指定してください`
        : `${role} coefficients must contain exactly ${expectedCount} finite positive value(s).`);
      return;
    }
    updateStep(stepId, role === 'reactant' ? { reactantCoefficients: coefficients } : { productCoefficients: coefficients });
    setCoefficientDrafts((drafts) => {
      const next = { ...drafts };
      delete next[`${stepId}:${role}`];
      return next;
    });
  };

  const suggestCoefficients = (step: MechanismStep) => {
    const suggestion = suggestReactionCoefficients(step);
    if (!suggestion) {
      setStatus(isJapanese
        ? 'この反応部品では、限定探索範囲内の係数を提案できません。分子式と部品数を確認してください。'
        : 'No coefficient suggestion was found in the bounded search space. Check the component formulas and count.');
      return;
    }
    updateStep(step.id, { reactantCoefficients: suggestion.reactants, productCoefficients: suggestion.products });
    setStatus(isJapanese ? `係数を提案しました（反応物 ${suggestion.reactants.join(', ')} ／生成物 ${suggestion.products.join(', ')}）。` : `Suggested coefficients (reactants ${suggestion.reactants.join(', ')}, products ${suggestion.products.join(', ')}).`);
  };

  const handleAddAgent = async (stepId: string) => {
    const smiles = agentDrafts[stepId]?.trim();
    if (!smiles) return;
    try {
      const agent = await runAnalysisInWorker('parse', undefined, undefined, undefined, smiles) as MoleculeDto;
      const step = scheme.steps.find((candidate) => candidate.id === stepId);
      if (!step) return;
      updateStep(stepId, {
        agents: [...(step.agents ?? []), agent],
        agentComponentIds: [...(step.agentComponentIds ?? []), `agent-${Date.now()}`],
      });
      setAgentDrafts((drafts) => ({ ...drafts, [stepId]: '' }));
    } catch (error) {
      setStatus(`${isJapanese ? '反応剤SMILESが不正です' : 'Invalid agent SMILES'}: ${(error as Error).message}`);
    }
  };

  const commitComponentIds = (stepId: string, role: 'reactant' | 'product' | 'agent', value: string) => {
    const step = scheme.steps.find((candidate) => candidate.id === stepId);
    if (!step) return;
    const expectedCount = role === 'reactant'
      ? step.reactants.length
      : role === 'product'
        ? step.products.length
        : (step.agents ?? []).length;
    const ids = parseComponentIds(value, expectedCount);
    if (ids === null) {
      setStatus(isJapanese
        ? `${role === 'reactant' ? '反応物' : role === 'product' ? '生成物' : '反応剤'}の識別子は${expectedCount}件の一意な値で指定してください`
        : `${role} component IDs must contain exactly ${expectedCount} unique value(s)}`);
      return;
    }
    updateStep(stepId, role === 'reactant'
      ? { reactantComponentIds: ids }
      : role === 'product'
        ? { productComponentIds: ids }
        : { agentComponentIds: ids });
    setComponentIdDrafts((drafts) => {
      const next = { ...drafts };
      delete next[`${stepId}:${role}`];
      return next;
    });
  };

  const molecule = useMoleculeStore((s) => s.molecule);

  const handleRunReaction = () => {
    if (!molecule || molecule.atoms.length === 0) {
      setReactionError(isJapanese ? '分子が選択されていません' : 'No molecule selected');
      return;
    }

    const smirks = smirlksInput || SMIRKS_TEMPLATES[selectedTemplate as keyof typeof SMIRKS_TEMPLATES];
    if (!smirks) {
      setReactionError(isJapanese ? 'SMIRKSパターンが指定されていません' : 'No SMIRKS pattern provided');
      return;
    }

    const result = executeReaction(molecule, smirks);
    if (result.status === 'no_match') {
      setReactionError(isJapanese ? 'SMIRKSパターンはこの分子に一致しませんでした。' : 'SMIRKS pattern did not match this molecule.');
      return;
    }
    if (result.status === 'invalid_reaction') {
      setReactionError(`${isJapanese ? '無効なSMIRKSパターン' : 'Invalid SMIRKS pattern'}: ${result.message}`);
      return;
    }
    if (result.status === 'unsupported_chemistry') {
      setReactionError(`${isJapanese ? '未対応の反応' : 'Unsupported reaction'}: ${result.message}`);
      return;
    }
    if (result.status === 'error') {
      setReactionError(`${isJapanese ? '反応の実行に失敗しました' : 'Reaction execution failed'}: ${result.message}`);
      return;
    }

    setReactionError('');
    addStepToScheme({
      id: result.step.id,
      reactants: result.step.reactants,
      products: result.step.products,
      arrows: [],
      mechanismType: 'sn2',
      conditions: result.step.conditions,
      arrowType: result.step.arrowType,
    });
    setSmirlksInput('');
  };

  const handleRunMultiReactantReaction = async () => {
    const reactantSmiles = multiReactantSmiles.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (reactantSmiles.length < 2 || reactantSmiles.length > 8) {
      setReactionError(isJapanese ? '反応物SMILESを2〜8行で指定してください。' : 'Enter between 2 and 8 reactant SMILES lines.');
      return;
    }
    const smirks = smirlksInput || SMIRKS_TEMPLATES[selectedTemplate as keyof typeof SMIRKS_TEMPLATES];
    if (!smirks) {
      setReactionError(isJapanese ? 'SMIRKSパターンが指定されていません' : 'No SMIRKS pattern provided');
      return;
    }
    try {
      const reactants = await Promise.all(reactantSmiles.map(async (smiles) => await runAnalysisInWorker('parse', undefined, undefined, undefined, smiles) as MoleculeDto));
      const result = wasmBridge.runReactantsMulti(reactants, smirks);
      if (result.status === 'no_match') {
        setReactionError(isJapanese ? '複数反応物にSMIRKSパターンが一致しませんでした。' : 'SMIRKS pattern did not match the reactant set.');
        return;
      }
      if (result.status !== 'applied') {
        setReactionError(`${isJapanese ? '複数反応物の実行に失敗しました' : 'Multi-reactant execution failed'}: ${result.status === 'error' ? result.message : result.message}`);
        return;
      }
      addStepToScheme({
        id: `reaction-multi-${Date.now()}`,
        reactants,
        products: result.products,
        arrows: [],
        mechanismType: 'sn2',
        conditions: {},
        arrowType: 'single',
      });
      setReactionError('');
      setStatus(isJapanese ? `複数反応物から${result.products.length}件の生成物を追加しました。` : `Added ${result.products.length} product(s) from ${reactants.length} reactants.`);
    } catch (error) {
      setReactionError(`${isJapanese ? '反応物SMILESが不正です' : 'Invalid reactant SMILES'}: ${(error as Error).message}`);
    }
  };

  const isDark = theme === 'dark';

  // Scheme is created by the effect above on first mount; nothing to render
  // for the one tick before it exists.
  if (!scheme) return null;

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

  // Export/Import handlers.
  const handleExportJSON = () => {
    try {
      assertReactionDocument(scheme);
      const json = exportSchemeAsJSON(
        scheme,
        useReactionSchemeStore.getState().atomMappings,
        useReactionSchemeStore.getState().reactionClassification,
        useReactionSchemeStore.getState().greenMetrics
      );
      downloadFile(json, `${scheme.title || 'scheme'}_export.json`, 'application/json');
      setStatus(isJapanese ? 'JSONとして出力しました' : 'Exported as JSON');
    } catch (error) {
      setStatus(isJapanese ? `JSON出力を停止しました: ${(error as Error).message}` : `JSON export blocked: ${(error as Error).message}`);
    }
  };

  const handleExportSVG = () => {
    if (!schemeLayout) return;
    try {
      assertPublicationLayout(schemeLayout);
      const svg = exportSchemeAsSVG(
        scheme,
        schemeLayout,
        useReactionSchemeStore.getState().atomMappings,
        useReactionSchemeStore.getState().greenMetrics,
        { preset: svgPreset, pageSize, fontScale }
      );
      downloadFile(svg, `${scheme.title || 'scheme'}_diagram.svg`, 'image/svg+xml');
      setStatus(isJapanese ? 'SVGとして出力しました' : 'Exported as SVG');
    } catch (error) {
      setStatus(isJapanese ? `SVG出力を停止しました: ${(error as Error).message}` : `SVG export blocked: ${(error as Error).message}`);
    }
  };

  const handleExportPDF = async () => {
    const api = getElectronApi();
    if (!api) {
      setStatus(isJapanese ? 'PDF出力はElectronアプリで利用できます' : 'PDF export is available in the Electron app');
      return;
    }
    const result = await api.fileSaveDialog(`${scheme.title || 'scheme'}_publication.pdf`);
    if (result.canceled || !result.filePath) return;
    try {
      if (!schemeLayout) throw new Error('Reaction layout is not ready');
      assertPublicationLayout(schemeLayout);
      const svg = exportSchemeAsSVG(
        scheme,
        schemeLayout,
        useReactionSchemeStore.getState().atomMappings,
        useReactionSchemeStore.getState().greenMetrics,
        { preset: svgPreset, pageSize, fontScale }
      );
      const writeResult = await api.exportPdf(result.filePath, svg);
      setStatus(writeResult.success
        ? (isJapanese ? '出版用PDFとして出力しました' : 'Exported publication PDF')
        : `${isJapanese ? 'PDF出力に失敗しました' : 'PDF export failed'}: ${writeResult.error ?? 'Unknown error'}`);
    } catch (error) {
      setStatus(`${isJapanese ? 'PDF出力を停止しました' : 'PDF export blocked'}: ${(error as Error).message}`);
    }
  };

  const handleExportCSV = () => {
    const csv = exportSchemeAsCSV(
      scheme,
      useReactionSchemeStore.getState().reactionClassification,
      useReactionSchemeStore.getState().greenMetrics
    );
    downloadFile(csv, `${scheme.title || 'scheme'}_report.csv`, 'text/csv');
    setStatus(isJapanese ? 'CSVとして出力しました' : 'Exported as CSV');
  };

  const handleExportRXN = () => {
    const step = scheme.steps[0];
    const reactants = scheme.steps.flatMap((currentStep) => currentStep.reactants);
    const products = scheme.steps.length === 1 ? scheme.steps[0].products : [];
    const stepLosses = rxnSchemeV2000Losses(scheme.steps.length);
    if (stepLosses.length > 0) {
      setStatus(stepLosses[0].message);
      return;
    }
    const semanticLosses = rxnV2000Losses({
      reactants,
      products,
      agents: step.agents,
      reactantCoefficients: step.reactantCoefficients,
      productCoefficients: step.productCoefficients,
    });
    if (semanticLosses.length > 0) {
      setStatus(semanticLosses.map((loss) => loss.message).join(' '));
      return;
    }
    const losses = [...reactants, ...products].flatMap((molecule) => exportLosses(molecule, 'rxn-v2000'));
    if (losses.length > 0 && !window.confirm(exportLossMessage(`${scheme.title || 'reaction'}_export.rxn`, losses))) {
      setStatus(isJapanese ? 'RXN出力をキャンセルしました' : 'RXN export cancelled');
      return;
    }
    const rxn = exportRxnViaDocumentAdapter({ reactants, products }, wasmBridge.toSmiles, wasmBridge.rxnDocumentToRxn);
    downloadFile(rxn, `${scheme.title || 'reaction'}_export.rxn`, 'chemical/x-mdl-rxn');
    setStatus(isJapanese ? 'RXN V2000として出力しました' : 'Exported as RXN V2000');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedScheme = file.name.toLowerCase().endsWith('.rxn')
        ? (() => {
          const rxn = importRxnViaDocumentAdapter(text, wasmBridge.rxnDocumentFromRxn, wasmBridge.parseMolecule);
          return {
            id: `scheme-${Date.now()}`,
            title: file.name.replace(/\.rxn$/i, ''),
            description: 'Imported from RXN V2000',
            steps: [{ id: `step-${Date.now()}`, reactants: rxn.reactants, products: rxn.products, arrows: [], mechanismType: 'sn2' as const, conditions: {}, arrowType: 'single' as const }],
            currentStepIndex: 0,
            viewMode: 'step' as const,
          };
        })()
        : importSchemeFromJSON(text);
      if (importedScheme) {
        loadScheme(importedScheme);
        setStatus(`${isJapanese ? 'スキームを読み込みました' : 'Imported scheme'}: ${importedScheme.title}`);
      } else {
        setStatus(isJapanese ? 'JSONの読み込みに失敗しました' : 'Failed to import JSON');
      }
    } catch {
      setStatus(isJapanese ? 'ファイルの読み込み中にエラーが発生しました' : 'Error reading file');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Title */}
      <input
        data-testid="reaction-title"
        type="text"
        placeholder={isJapanese ? '反応タイトル…' : 'Reaction title...'}
        value={scheme.title || ''}
        onChange={(e) => updateSchemeInfo({ title: e.target.value })}
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
        placeholder={isJapanese ? '反応の説明…' : 'Reaction description...'}
        value={scheme.description || ''}
        onChange={(e) => updateSchemeInfo({ description: e.target.value })}
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

      <ReactionWorkflowNavigator
        stages={workflowStages}
        activeStage={activeWorkflowStage}
        isJapanese={isJapanese}
        isDark={isDark}
        textColor={textColor}
        labelColor={labelColor}
        borderColor={borderColor}
        inputBg={inputBg}
        accentColor={accentColor}
        onSelect={focusWorkflowStage}
      />

      <div data-workflow-stage="export">
        <ReactionExportSection
          isJapanese={isJapanese}
          isDark={isDark}
          textColor={textColor}
          labelColor={labelColor}
          borderColor={borderColor}
          accentColor={accentColor}
          showExportMenu={showExportMenu}
          setShowExportMenu={setShowExportMenu}
          svgPreset={svgPreset}
          setSvgPreset={setSvgPreset}
          fontScale={fontScale}
          setFontScale={setFontScale}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onExportJSON={handleExportJSON}
          onExportSVG={handleExportSVG}
          onExportPDF={() => void handleExportPDF()}
          onExportRXN={handleExportRXN}
          onExportCSV={handleExportCSV}
          onImport={handleImportJSON}
          fileInputRef={fileInputRef}
        />
      </div>

      {/* Multi-Step Scheme Navigation */}
      {scheme.steps.length > 0 && (
        <div data-workflow-stage="mechanism" style={{
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
              Step {scheme.currentStepIndex + 1} of {scheme.steps.length}
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

      <ReactionAnalysisPanels
        hasSteps={scheme.steps.length > 0}
        classification={reactionClassification}
        diagnostics={reactionDiagnostics}
        atomMappings={atomMappings}
        greenMetrics={greenMetrics}
        atomLabelsVisible={atomLabelsVisible}
        mappingLinesVisible={mappingLinesVisible}
        onToggleAtomLabels={toggleAtomLabels}
        onToggleMappingLines={toggleMappingLines}
        isJapanese={isJapanese}
        isDark={isDark}
        textColor={textColor}
        labelColor={labelColor}
        borderColor={borderColor}
        accentColor={accentColor}
      />

      <ReactionStepEditor
        steps={scheme.steps}
        expandedStepId={expandedStepId}
        onExpandedStepIdChange={setExpandedStepId}
        isJapanese={isJapanese}
        theme={theme}
        borderColor={borderColor}
        inputBg={inputBg}
        textColor={textColor}
        labelColor={labelColor}
        accentColor={accentColor}
        agentDrafts={agentDrafts}
        coefficientDrafts={coefficientDrafts}
        componentIdDrafts={componentIdDrafts}
        setAgentDrafts={setAgentDrafts}
        setCoefficientDrafts={setCoefficientDrafts}
        setComponentIdDrafts={setComponentIdDrafts}
        onMoveStep={handleMoveStep}
        onArrowTypeChange={handleArrowTypeChange}
        onSuggestCoefficients={suggestCoefficients}
        onCommitCoefficients={commitCoefficients}
        onAddAgent={handleAddAgent}
        onCommitComponentIds={commitComponentIds}
        onUpdateConditions={handleUpdateConditions}
        onRemoveStep={handleRemoveStep}
      />
      <ReactionExecutor
        isJapanese={isJapanese}
        theme={theme}
        borderColor={borderColor}
        bgColor={bgColor}
        textColor={textColor}
        labelColor={labelColor}
        accentColor={accentColor}
        selectedTemplate={selectedTemplate}
        onTemplateChange={setSelectedTemplate}
        smirksInput={smirlksInput}
        onSmirksChange={setSmirlksInput}
        multiReactantSmiles={multiReactantSmiles}
        onMultiReactantChange={setMultiReactantSmiles}
        onRunReaction={handleRunReaction}
        onRunMultiReactantReaction={() => void handleRunMultiReactantReaction()}
        reactionError={reactionError}
      />

      {/* Add Step Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          data-testid="reaction-add-step"
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
          {isJapanese ? '+ 反応ステップを追加' : '+ Add Reaction Step'}
        </button>
        {status && (
          <div role="status" aria-label={isJapanese ? '反応出力ステータス' : 'Reaction export status'} style={{
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
