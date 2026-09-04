import { ReactionSchemeContext, MoleculeDto, AtomMapping, ReactionClassification, GreenChemistryMetrics } from '../store/types';
import { SchemeLayout } from './schemeLayout';
import { diagnoseReactionScheme, ReactionDiagnostics } from './reactionSchemeUtils';
import { validateMoleculeDocument } from './documentCommands';

export const REACTION_DOCUMENT_SCHEMA = 'chematic-draw/reaction-document';
export const REACTION_DOCUMENT_VERSION = 2;
export const LEGACY_REACTION_DOCUMENT_VERSION = 1;
export const MAX_REACTION_DOCUMENT_TEXT_LENGTH = 10_000_000;
export const MAX_REACTION_DOCUMENT_STEPS = 256;

interface ReactionDocumentExport {
  schema: typeof REACTION_DOCUMENT_SCHEMA;
  schema_version: typeof REACTION_DOCUMENT_VERSION;
  version: '1.0';
  exportDate: string;
  scheme: ReactionSchemeContext;
  analysis: {
    atomMappings: unknown;
    reactionClassification: ReactionClassification | null;
    greenMetrics: GreenChemistryMetrics | null;
    reactionDiagnostics: ReactionDiagnostics;
  };
  provenance: {
    source_format: 'reaction-document-json';
    operation: 'export-reaction-document';
    engine: 'chematic 1.0.4';
    result_hash: string;
  };
}

function documentHash(payload: unknown): string {
  let hash = 0x811c9dc5;
  for (const character of JSON.stringify(payload)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-32:${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Export complete scheme as JSON
 */
export function exportSchemeAsJSON(
  scheme: ReactionSchemeContext,
  atomMappings: AtomMapping | null,
  reactionClassification: ReactionClassification | null,
  greenMetrics: GreenChemistryMetrics | null
): string {
  const analysis = {
    atomMappings: atomMappings ? { ...atomMappings, entries: Array.from(atomMappings.entries) } : null,
    reactionClassification,
    greenMetrics,
    // Recalculate from the authored scheme at export time so stale UI state
    // cannot make the exported evidence disagree with the document.
    reactionDiagnostics: diagnoseReactionScheme(scheme),
  };
  const hashPayload = {
    schema: REACTION_DOCUMENT_SCHEMA,
    schema_version: REACTION_DOCUMENT_VERSION,
    version: '1.0' as const,
    scheme,
    analysis,
  };
  const exportData: ReactionDocumentExport = {
    schema: REACTION_DOCUMENT_SCHEMA,
    schema_version: REACTION_DOCUMENT_VERSION,
    version: '1.0',
    exportDate: new Date().toISOString(),
    scheme,
    analysis,
    provenance: {
      source_format: 'reaction-document-json',
      operation: 'export-reaction-document',
      engine: 'chematic 1.0.4',
      result_hash: documentHash(hashPayload),
    },
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import scheme from JSON string
 */
export function importSchemeFromJSON(jsonString: string): ReactionSchemeContext | null {
  try {
    if (jsonString.length > MAX_REACTION_DOCUMENT_TEXT_LENGTH) return null;
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object' || !data.scheme || !Array.isArray(data.scheme.steps)) {
      return null;
    }
    const isVersioned = data.schema === REACTION_DOCUMENT_SCHEMA;
    if (data.schema && (!isVersioned || ![LEGACY_REACTION_DOCUMENT_VERSION, REACTION_DOCUMENT_VERSION].includes(data.schema_version))) {
      return null;
    }
    if (isVersioned && !data.provenance) return null;
    if (data.provenance) {
      if (
        data.provenance.source_format !== 'reaction-document-json' ||
        data.provenance.operation !== 'export-reaction-document' ||
        data.provenance.engine !== 'chematic 1.0.4' ||
        typeof data.provenance.result_hash !== 'string'
      ) return null;
      const hashPayload = {
        schema: data.schema,
        schema_version: data.schema_version,
        version: data.version,
        scheme: data.scheme,
        analysis: data.analysis,
      };
      if (data.provenance.result_hash !== documentHash(hashPayload)) return null;
    }
    const scheme = data.scheme as Partial<ReactionSchemeContext>;
    if (scheme.steps.some((step) => !step || typeof step.id !== 'string')) return null;
    if (isVersioned && scheme.steps.length > MAX_REACTION_DOCUMENT_STEPS) return null;
    if (isVersioned && scheme.steps.some((step) => {
      if (!Array.isArray(step.reactants) || !Array.isArray(step.products) || !Array.isArray(step.arrows)) return true;
      if (!['sn2', 'sn1', 'e1', 'e2', 'electrophilic_addition'].includes(step.mechanismType ?? '')) return true;
      if (!['single', 'double', 'equilibrium', 'retro'].includes(step.arrowType ?? '')) return true;
      if (!step.conditions || typeof step.conditions !== 'object' || Array.isArray(step.conditions)) return true;
      if (Object.entries(step.conditions).some(([key, value]) => {
        if (!['temperature', 'catalyst', 'solvent', 'time', 'yield', 'notes'].includes(key)) return true;
        if (['temperature', 'catalyst', 'solvent', 'time', 'notes'].includes(key)) return typeof value !== 'string' || value.length > 1_024;
        return typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100;
      })) return true;
      if (step.agents !== undefined && !Array.isArray(step.agents)) return true;
      const molecules = [...step.reactants, ...step.products, ...(step.agents ?? [])];
      if (molecules.some((molecule) => validateMoleculeDocument(molecule).length > 0)) return true;
      for (const [coefficients, expectedLength] of [[step.reactantCoefficients, step.reactants.length], [step.productCoefficients, step.products.length]] as const) {
        if (coefficients !== undefined && (coefficients.length !== expectedLength || coefficients.some((coefficient) => !Number.isInteger(coefficient) || coefficient < 1 || coefficient > 1_000_000))) return true;
      }
      for (const [ids, expectedLength] of [[step.reactantComponentIds, step.reactants.length], [step.productComponentIds, step.products.length], [step.agentComponentIds, (step.agents ?? []).length]] as const) {
        if (ids !== undefined && (ids.length !== expectedLength || new Set(ids).size !== ids.length || ids.some((id) => typeof id !== 'string' || id.length === 0 || id.length > 256))) return true;
      }
      if (step.authored !== undefined && typeof step.authored !== 'boolean') return true;
      if (step.derivedFrom !== undefined && (typeof step.derivedFrom !== 'string' || step.derivedFrom.length === 0 || step.derivedFrom.length > 256)) return true;
      const atomIds = new Set(molecules.flatMap((molecule) => molecule.atoms.map((atom) => atom.id)));
      return step.arrows.some((arrow) => !arrow
        || typeof arrow.id !== 'string' || arrow.id.length === 0 || arrow.id.length > 256
        || !['forward', 'retro', 'resonance'].includes(arrow.type)
        || arrow.stepId !== step.id
        || !Number.isInteger(arrow.sourceAtomId) || !atomIds.has(arrow.sourceAtomId)
        || !Number.isInteger(arrow.sinkAtomId) || !atomIds.has(arrow.sinkAtomId)
        || (arrow.label !== undefined && (typeof arrow.label !== 'string' || arrow.label.length > 1_024)));
    })) return null;
    if (typeof scheme.id !== 'string') return null;
    return {
      id: scheme.id,
      title: typeof scheme.title === 'string' ? scheme.title : '',
      description: typeof scheme.description === 'string' ? scheme.description : '',
      steps: scheme.steps.map((step) => ({
        ...step,
        id: step.id,
        reactants: Array.isArray(step.reactants) ? step.reactants : [],
        products: Array.isArray(step.products) ? step.products : [],
        arrows: Array.isArray(step.arrows) ? step.arrows : [],
        mechanismType: step.mechanismType ?? 'sn2',
        conditions: step.conditions ?? {},
        arrowType: step.arrowType ?? 'single',
      })),
      currentStepIndex: typeof scheme.currentStepIndex === 'number' ? scheme.currentStepIndex : 0,
      viewMode: scheme.viewMode === 'scheme' ? 'scheme' : 'step',
    };
  } catch (error) {
    console.error('Failed to import scheme:', error);
    return null;
  }
}

/**
 * Export scheme as SVG image
 */
export function exportSchemeAsSVG(
  scheme: ReactionSchemeContext,
  schemeLayout: SchemeLayout,
  atomMappings: AtomMapping | null,
  greenMetrics: GreenChemistryMetrics | null
): string {
  const width = schemeLayout.canvasWidth + 40;
  const height = schemeLayout.canvasHeight + 200;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .step-box { fill: #f9f9f9; stroke: #333; stroke-width: 2; }
      .step-title { font-size: 14px; font-weight: bold; fill: #333; }
      .step-text { font-size: 10px; fill: #666; }
      .arrow-line { stroke: #666; stroke-width: 2; fill: none; }
      .arrow-head { fill: #666; }
      .atom-label { font-size: 10px; font-weight: bold; }
      .legend-label { font-size: 11px; fill: #333; }
      .metric-text { font-size: 11px; fill: #333; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>

  <!-- Title -->
  <text x="20" y="25" class="legend-label" style="font-size: 16px; font-weight: bold;">
    ${scheme.title || 'Reaction Scheme'}
  </text>

  <!-- Step Boxes -->
  <g transform="translate(20, 60)">
`;

  // Draw step boxes
  for (const box of schemeLayout.stepBoxes) {
    const step = scheme.steps[box.stepIndex];
    if (!step) continue;

    svg += `
    <!-- Step ${box.stepIndex + 1} -->
    <rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" class="step-box"/>
    <text x="${box.x + 10}" y="${box.y + 20}" class="step-title">Step ${box.stepIndex + 1}</text>

    <text x="${box.x + 10}" y="${box.y + 45}" class="step-text">Reactants: ${step.reactants.length}</text>
    <text x="${box.x + 10}" y="${box.y + 65}" class="step-text">Arrows: ${step.arrows.length}</text>
    <text x="${box.x + 10}" y="${box.y + 85}" class="step-text">Products: ${step.products.length}</text>
`;
  }

  // Draw arrows between steps
  for (const arrow of schemeLayout.stepArrows) {
    svg += `
    <!-- Arrow ${arrow.fromIndex} -> ${arrow.toIndex} -->
    <line x1="${arrow.x1}" y1="${arrow.y1}" x2="${arrow.x2}" y2="${arrow.y2}" class="arrow-line"/>
    <polygon points="${arrow.x2},${arrow.y2} ${arrow.x2 - 8},${arrow.y2 - 4} ${arrow.x2 - 8},${arrow.y2 + 4}" class="arrow-head"/>
`;
  }

  svg += `
  </g>

  <!-- Color Legend -->
  <g transform="translate(20, ${height - 140})">
    <text x="0" y="0" class="legend-label" style="font-weight: bold;">Atom Mapping Legend:</text>

    <rect x="0" y="10" width="12" height="12" fill="#51cf66"/>
    <text x="18" y="20" class="legend-label">Persistent (Green)</text>

    <rect x="0" y="30" width="12" height="12" fill="#4d8dff"/>
    <text x="18" y="40" class="legend-label">New (Blue)</text>

    <rect x="0" y="50" width="12" height="12" fill="#ff6b6b"/>
    <text x="18" y="60" class="legend-label">Leaving (Red)</text>

    <rect x="0" y="70" width="12" height="12" fill="#888888"/>
    <text x="18" y="80" class="legend-label">Spectator (Gray)</text>
  </g>

  <!-- Metrics Panel -->
  <g transform="translate(${width - 220}, ${height - 140})">
    <text x="0" y="0" class="legend-label" style="font-weight: bold;">Green Chemistry Metrics:</text>
`;

  if (greenMetrics) {
    svg += `
    <text x="0" y="20" class="metric-text">Atom Economy: ${greenMetrics.atomEconomy}%</text>
    <text x="0" y="40" class="metric-text">E-Factor: ${greenMetrics.eFactorApprox}</text>
`;
  }

  svg += `
  </g>

  <!-- Footer -->
  <text x="20" y="${height - 10}" class="legend-label" style="font-size: 9px;">
    Exported: ${new Date().toLocaleDateString()} | chematic-draw
  </text>
</svg>`;

  return svg;
}

/**
 * Export scheme metrics as CSV
 */
export function exportSchemeAsCSV(
  scheme: ReactionSchemeContext,
  reactionClassification: ReactionClassification | null,
  greenMetrics: GreenChemistryMetrics | null
): string {
  let csv = 'Reaction Summary\n';
  csv += `Title,"${scheme.title || 'Untitled'}"\n`;
  csv += `Description,"${scheme.description || ''}"\n`;
  csv += `Steps,${scheme.steps.length}\n\n`;

  if (reactionClassification) {
    csv += 'Reaction Structure\n';
    csv += `Type,"${reactionClassification.type}"\n`;
    csv += `Indicators,"${reactionClassification.indicators.join('; ')}"\n\n`;
  }

  if (greenMetrics) {
    csv += 'Green Chemistry Metrics\n';
    csv += `Atom Economy,"${greenMetrics.atomEconomy}%"\n`;
    csv += `E-Factor,"${greenMetrics.eFactorApprox}"\n\n`;

    csv += 'Step-by-Step Analysis\n';
    csv += 'Step,Waste Atoms,Waste %\n';
    for (const sw of greenMetrics.stepWaste) {
      csv += `${sw.stepIndex + 1},${sw.wasteAtoms},"${Math.round(sw.percentage)}%"\n`;
    }
    csv += '\n';
  }

  csv += 'Mechanism Steps\n';
  csv += 'Step,Reactants,Arrows,Products,Type\n';
  for (let i = 0; i < scheme.steps.length; i++) {
    const step = scheme.steps[i];
    csv += `${i + 1},${step.reactants.length},${step.arrows.length},${step.products.length},"${step.mechanismType}"\n`;
  }

  return csv;
}

/**
 * Get molecule formula (simplified)
 */
export function getMoleculeFormula(mol: MoleculeDto): string {
  if (mol.atoms.length === 0) return '(empty)';

  const counts: Record<string, number> = {};
  mol.atoms.forEach((a) => {
    counts[a.element] = (counts[a.element] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([el, count]) => (count > 1 ? `${el}${count}` : el))
    .join('');
}

/**
 * Get reaction summary text
 */
export function getReactionSummary(
  scheme: ReactionSchemeContext,
  reactionClassification: ReactionClassification | null
): string {
  let summary = `${scheme.title || 'Reaction Scheme'}\n\n`;

  if (reactionClassification) {
    summary += `Type: ${reactionClassification.type.toUpperCase()}\n`;
    summary += `Evidence: ${reactionClassification.indicators.join(', ')}\n\n`;
  }

  summary += `Total Steps: ${scheme.steps.length}\n`;
  summary += `Total Arrows: ${scheme.steps.reduce((sum, s) => sum + s.arrows.length, 0)}\n`;

  return summary;
}
