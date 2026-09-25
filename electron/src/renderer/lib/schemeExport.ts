import { ReactionSchemeContext, MoleculeDto, AtomMapping, ReactionClassification, GreenChemistryMetrics } from '../store/types';
import { SchemeLayout } from './schemeLayout';
import { diagnoseReactionScheme, ReactionDiagnostics } from './reactionSchemeUtils';
import { validateMoleculeDocument } from './documentCommands';
import { ENGINE_ID, isCompatibleEngineId } from '../../engineMetadata';
import { assertPublicationLayout } from './layoutMetrics';

export const REACTION_DOCUMENT_SCHEMA = 'chematic-draw/reaction-document';
export const REACTION_DOCUMENT_VERSION = 2;
export const LEGACY_REACTION_DOCUMENT_VERSION = 1;
export const MAX_REACTION_DOCUMENT_TEXT_LENGTH = 10_000_000;
export const MAX_REACTION_DOCUMENT_STEPS = 256;
export const MAX_REACTION_DOCUMENT_STRING_LENGTH = 2_048;

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
    engine: 'chematic 1.0.26';
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
      engine: ENGINE_ID,
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
        !isCompatibleEngineId(data.provenance.engine) ||
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
    if (typeof scheme.id !== 'string' || scheme.id.length === 0 || scheme.id.length > MAX_REACTION_DOCUMENT_STRING_LENGTH) return null;
    for (const field of ['title', 'description'] as const) {
      if (scheme[field] !== undefined && (typeof scheme[field] !== 'string' || scheme[field].length > MAX_REACTION_DOCUMENT_STRING_LENGTH)) return null;
    }
    if (scheme.currentStepIndex !== undefined && (!Number.isInteger(scheme.currentStepIndex) || scheme.currentStepIndex < 0 || (scheme.steps.length > 0 && scheme.currentStepIndex >= scheme.steps.length))) return null;
    if (scheme.viewMode !== undefined && scheme.viewMode !== 'step' && scheme.viewMode !== 'scheme') return null;
    // Legacy envelopes may omit optional arrays, but an array they do provide
    // must still be a valid molecule collection. Otherwise malformed legacy
    // data would be normalized into the live store and fail later in rendering.
    if (scheme.steps.some((step) => {
      if (step.reactants !== undefined && !Array.isArray(step.reactants)) return true;
      if (step.products !== undefined && !Array.isArray(step.products)) return true;
      if (step.agents !== undefined && !Array.isArray(step.agents)) return true;
      const molecules = [...(Array.isArray(step.reactants) ? step.reactants : []), ...(Array.isArray(step.products) ? step.products : []), ...(Array.isArray(step.agents) ? step.agents : [])];
      return molecules.some((molecule) => validateMoleculeDocument(molecule).length > 0);
    })) return null;
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
      for (const [coefficients, expectedLength] of [[step.reactantCoefficients, step.reactants.length], [step.productCoefficients, step.products.length]] as const) {
        // Fractions are valid stoichiometric coefficients in the v2 document;
        // RXN V2000 remains loss-aware and will refuse to preserve them.
        if (coefficients !== undefined && (coefficients.length !== expectedLength || coefficients.some((coefficient) => !Number.isFinite(coefficient) || coefficient <= 0 || coefficient > 1_000_000))) return true;
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

/** SVG visual presets; screen is retained as the compatibility default. */
export type SchemeSvgPreset = 'screen' | 'journal';
export type SchemePageSize = 'auto' | 'a4' | 'letter';
export type SchemeFontScale = 'compact' | 'standard' | 'large';
export interface SchemeSvgOptions { preset?: SchemeSvgPreset; pageSize?: SchemePageSize; margin?: number; fontScale?: SchemeFontScale; }

const PUBLICATION_PAGE_SIZES: Record<Exclude<SchemePageSize, 'auto'>, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 },
  letter: { width: 816, height: 1056 },
};

function escapeXmlText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  }[character] ?? character));
}

function renderMoleculeSvg(molecule: MoleculeDto, x: number, y: number, width: number, height: number, ink: string): string {
  if (!molecule.atoms.length) return '';
  const xs = molecule.atoms.map((atom) => atom.x);
  const ys = molecule.atoms.map((atom) => atom.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1); const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min((width - 20) / spanX, (height - 20) / spanY, 22);
  const offsetX = x + (width - spanX * scale) / 2;
  const offsetY = y + (height - spanY * scale) / 2;
  const position = (atom: MoleculeDto['atoms'][number]) => ({
    x: offsetX + (atom.x - minX) * scale,
    y: offsetY + (maxY - atom.y) * scale,
  });
  const byId = new Map(molecule.atoms.map((atom) => [atom.id, atom]));
  let svg = '<g class="molecule" aria-label="Molecule">';
  for (const bond of molecule.bonds) {
    const from = byId.get(bond.from); const to = byId.get(bond.to);
    if (!from || !to) continue;
    const a = position(from); const b = position(to);
    const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * 2; const ny = dx / length * 2;
    if (bond.order === 1 && bond.stereo === 1) {
      const px = (dy / length) * 4; const py = -(dx / length) * 4;
      svg += `<polygon points="${a.x.toFixed(2)},${a.y.toFixed(2)} ${(b.x + px).toFixed(2)},${(b.y + py).toFixed(2)} ${(b.x - px).toFixed(2)},${(b.y - py).toFixed(2)}" fill="${ink}" class="stereo-wedge"/>`;
      continue;
    }
    const lines = Math.min(Math.max(Math.round(bond.order), 1), 3);
    for (let line = 0; line < lines; line++) {
      const offset = (line - (lines - 1) / 2) * 3;
      const dash = bond.order === 1 && bond.stereo === 2 ? ' stroke-dasharray="3,3"' : '';
      svg += `<line x1="${(a.x + nx * offset).toFixed(2)}" y1="${(a.y + ny * offset).toFixed(2)}" x2="${(b.x + nx * offset).toFixed(2)}" y2="${(b.y + ny * offset).toFixed(2)}" stroke="${ink}" stroke-width="1.2"${dash}/>`;
    }
  }
  for (const atom of molecule.atoms) {
    const point = position(atom);
    const label = escapeXmlText(atom.display_label ?? atom.element ?? '?');
    if (label) svg += `<text x="${point.x.toFixed(2)}" y="${point.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" class="atom-label" fill="${ink}">${label}</text>`;
    if (atom.isotope !== undefined) svg += `<text x="${(point.x - 7).toFixed(2)}" y="${(point.y - 7).toFixed(2)}" class="atom-annotation" fill="${ink}">${atom.isotope}</text>`;
    if (atom.charge !== 0) svg += `<text x="${(point.x + 7).toFixed(2)}" y="${(point.y - 7).toFixed(2)}" class="atom-annotation" fill="${ink}">${atom.charge > 0 ? '+' : ''}${atom.charge}</text>`;
  }
  return `${svg}</g>`;
}

function renderMoleculeRow(molecules: MoleculeDto[], x: number, y: number, width: number, height: number, ink: string): string {
  if (!molecules.length) return '';
  const itemWidth = Math.max(45, width / molecules.length);
  return molecules.map((molecule, index) => renderMoleculeSvg(molecule, x + index * itemWidth, y, itemWidth, height, ink)).join('');
}

function componentSummary(molecules: MoleculeDto[], coefficients: number[] | undefined): string {
  if (!molecules.length) return 'none';
  return molecules.map((_, index) => {
    const coefficient = coefficients?.[index];
    return coefficient === undefined || coefficient === 1 ? '1' : String(coefficient);
  }).join(', ');
}

function conditionSummary(step: ReactionSchemeContext['steps'][number]): string {
  return Object.entries(step.conditions ?? {})
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}

type SchemeArrowType = NonNullable<ReactionSchemeContext['steps'][number]['arrowType']>;

function svgDirectedArrow(x1: number, y1: number, x2: number, y2: number, className: string): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = 8;
  const wing = Math.PI / 6;
  const points = [
    [x2, y2],
    [x2 - headLength * Math.cos(angle - wing), y2 - headLength * Math.sin(angle - wing)],
    [x2 - headLength * Math.cos(angle + wing), y2 - headLength * Math.sin(angle + wing)],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="${className}"/><polygon points="${points}" class="arrow-head"/>`;
}

function svgStepArrow(arrow: SchemeLayout['stepArrows'][number], arrowType: SchemeArrowType = 'single'): string {
  const dx = arrow.x2 - arrow.x1;
  const dy = arrow.y2 - arrow.y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length * 4;
  const ny = dx / length * 4;
  if (arrowType === 'equilibrium') {
    return `${svgDirectedArrow(arrow.x1 + nx, arrow.y1 + ny, arrow.x2 + nx, arrow.y2 + ny, 'arrow-line')}${svgDirectedArrow(arrow.x2 - nx, arrow.y2 - ny, arrow.x1 - nx, arrow.y1 - ny, 'arrow-line')}`;
  }
  if (arrowType === 'double') {
    return `${svgDirectedArrow(arrow.x1 + nx, arrow.y1 + ny, arrow.x2 + nx, arrow.y2 + ny, 'arrow-line')}<line x1="${(arrow.x1 - nx).toFixed(2)}" y1="${(arrow.y1 - ny).toFixed(2)}" x2="${(arrow.x2 - nx).toFixed(2)}" y2="${(arrow.y2 - ny).toFixed(2)}" class="arrow-line"/>`;
  }
  if (arrowType === 'retro') return svgDirectedArrow(arrow.x2, arrow.y2, arrow.x1, arrow.y1, 'arrow-line');
  return svgDirectedArrow(arrow.x1, arrow.y1, arrow.x2, arrow.y2, 'arrow-line');
}

/**
 * Export scheme as SVG image
 */
export function exportSchemeAsSVG(
  scheme: ReactionSchemeContext,
  schemeLayout: SchemeLayout,
  atomMappings: AtomMapping | null,
  greenMetrics: GreenChemistryMetrics | null,
  options: SchemeSvgOptions = {}
): string {
  assertPublicationLayout(schemeLayout);
  const fontScale = options.fontScale === 'compact' ? 0.85 : options.fontScale === 'large' ? 1.2 : 1;
  const font = (size: number): string => `${(size * fontScale).toFixed(2)}px`;
  const style = options.preset === 'journal'
    ? { fontFamily: 'Arial, Helvetica, sans-serif', boxFill: '#ffffff', ink: '#111111', muted: '#333333', accent: '#111111', strokeWidth: '1.4' }
    : { fontFamily: 'Arial, Helvetica, sans-serif', boxFill: '#f9f9f9', ink: '#333333', muted: '#666666', accent: '#666666', strokeWidth: '2' };
  const contentWidth = schemeLayout.canvasWidth + 40;
  const contentHeight = schemeLayout.canvasHeight + 200;
  const page = options.pageSize && options.pageSize !== 'auto' ? PUBLICATION_PAGE_SIZES[options.pageSize] : undefined;
  const width = page?.width ?? contentWidth;
  const height = page?.height ?? contentHeight;
  const margin = page ? Math.max(0, Math.min(options.margin ?? 48, Math.min(width, height) / 3)) : 0;
  const scale = page ? Math.min(1, (width - margin * 2) / contentWidth, (height - margin * 2) / contentHeight) : 1;
  const offsetX = page ? Math.max(margin, (width - contentWidth * scale) / 2) : 0;
  const offsetY = page ? Math.max(margin, (height - contentHeight * scale) / 2) : 0;
  const title = escapeXmlText(scheme.title || 'Reaction Scheme');

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .step-box { fill: ${style.boxFill}; stroke: ${style.ink}; stroke-width: ${style.strokeWidth}; }
      .step-title { font-size: ${font(14)}; font-weight: bold; fill: ${style.ink}; }
      .step-text { font-size: ${font(10)}; fill: ${style.muted}; }
      .arrow-line { stroke: ${style.accent}; stroke-width: ${style.strokeWidth}; fill: none; }
      .arrow-head { fill: ${style.accent}; }
      .atom-label { font-size: ${font(10)}; font-weight: bold; }
      .atom-annotation { font-size: ${font(8)}; }
      .legend-label { font-size: ${font(11)}; fill: ${style.ink}; }
      .metric-text { font-size: ${font(11)}; fill: ${style.ink}; }
      text { font-family: ${style.fontFamily}; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#ffffff"/>

  <g transform="translate(${offsetX.toFixed(2)} ${offsetY.toFixed(2)}) scale(${scale.toFixed(6)})">

  <!-- Title -->
  <text x="20" y="25" class="legend-label" style="font-size: ${font(16)}; font-weight: bold;">
    ${title}
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

    <text x="${box.x + 10}" y="${box.y + 45}" class="step-text">Reactants: ${step.reactants.length} [${componentSummary(step.reactants, step.reactantCoefficients)}]</text>
    <text x="${box.x + 10}" y="${box.y + 65}" class="step-text">Arrows: ${step.arrows.length}</text>
    <text x="${box.x + 10}" y="${box.y + 85}" class="step-text">Products: ${step.products.length} [${componentSummary(step.products, step.productCoefficients)}]</text>
    <text x="${box.x + 155}" y="${box.y + 45}" class="step-text">Agents: ${step.agents?.length ?? 0}</text>
    ${conditionSummary(step) ? `<text x="${box.x + 155}" y="${box.y + 65}" class="step-text">${escapeXmlText(conditionSummary(step))}</text>` : ''}
    ${renderMoleculeRow(step.reactants, box.x + 10, box.y + 92, box.width - 20, 48, style.ink)}
    ${renderMoleculeRow(step.products, box.x + 10, box.y + 148, box.width - 20, 48, style.ink)}
`;
  }

  // Draw arrows between steps
  for (const arrow of schemeLayout.stepArrows) {
    const arrowType = scheme.steps[arrow.fromIndex]?.arrowType ?? 'single';
    svg += `
    <!-- Arrow ${arrow.fromIndex} -> ${arrow.toIndex} -->
    ${svgStepArrow(arrow, arrowType)}
`;
  }

  svg += `
  </g>

  <!-- Color Legend -->
  <g transform="translate(20, ${contentHeight - 140})">
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
  <g transform="translate(${contentWidth - 220}, ${contentHeight - 140})">
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
  <text x="20" y="${contentHeight - 10}" class="legend-label" style="font-size: ${font(9)};">
    chematic-draw | deterministic SVG export
  </text>
  </g>
</svg>`;

  return svg;
}

/**
 * Export scheme metrics as CSV
 */
function csvCell(value: string): string {
  // Quote according to RFC 4180 and neutralize spreadsheet formula prefixes
  // so a user-authored title or note cannot become an executable cell.
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}

export function exportSchemeAsCSV(
  scheme: ReactionSchemeContext,
  reactionClassification: ReactionClassification | null,
  greenMetrics: GreenChemistryMetrics | null
): string {
  let csv = 'Reaction Summary\n';
  csv += `Title,${csvCell(scheme.title || 'Untitled')}\n`;
  csv += `Description,${csvCell(scheme.description || '')}\n`;
  csv += `Steps,${scheme.steps.length}\n\n`;

  if (reactionClassification) {
    csv += 'Reaction Structure\n';
    csv += `Type,${csvCell(reactionClassification.type)}\n`;
    csv += `Indicators,${csvCell(reactionClassification.indicators.join('; '))}\n\n`;
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
